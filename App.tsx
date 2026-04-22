import React, { useState, useEffect, useRef, useCallback } from 'react';
import Chessboard from './components/Chessboard';
import EngineControls from './components/EngineControls';
import EngineInfo from './components/EngineInfo';
import GeminiAnalysis from './components/GeminiAnalysis';
import ComponentConfig from './components/ComponentConfig';
import EvaluationBreakdown from './components/EvaluationBreakdown';
import ChessEngine from './services/chessEngine';
import { getTalStyleAnalysis } from './services/geminiService';
import { STARTING_FEN } from './constants';
import { PRESET_BASIC } from './services/evaluation/presets';
import { EngineState, type EngineUpdate, type IChessJs, Color, type EngineConfig } from './types';

// Add game_over to IChessJs in types.ts if it's missing
declare global {
  interface Window {
    Chess: IChessJs;
  }
}

function App() {
  const [fen, setFen] = useState<string>(STARTING_FEN);
  const [engineState, setEngineState] = useState<EngineState>(EngineState.Idle);
  const [engineUpdate, setEngineUpdate] = useState<EngineUpdate | null>(null);
  const [geminiAnalysis, setGeminiAnalysis] = useState<string | null>(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState<boolean>(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [orientation, setOrientation] = useState<Color>('w');
  const [engineConfig, setEngineConfig] = useState<EngineConfig>(PRESET_BASIC);
  
  const engineRef = useRef<ChessEngine | null>(null);
  const gameRef = useRef<IChessJs>(new Chess());
  const isSimulatingRef = useRef(false);

  // Assuming player is always White for this implementation
  const playerColor = 'w';

  const handleEngineUpdate = useCallback((update: EngineUpdate) => {
    setEngineUpdate(update);
  }, []);

  useEffect(() => {
    engineRef.current = new ChessEngine(handleEngineUpdate, engineConfig);
    return () => {
      isSimulatingRef.current = false;
      engineRef.current?.stop();
    };
  }, [handleEngineUpdate]);

  // Update engine config when it changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setConfig(engineConfig);
    }
  }, [engineConfig]);

  const handleConfigChange = useCallback((newConfig: EngineConfig) => {
    setEngineConfig(newConfig);
    setEngineUpdate(null); // Clear previous evaluation
  }, []);
  
  const triggerEngineResponse = useCallback(async () => {
    if (gameRef.current.game_over()) return;

    setEngineState(EngineState.Thinking);
    const bestMove = await engineRef.current?.findBestMove(gameRef.current.fen());
    
    if (bestMove) {
      const moveResult = gameRef.current.move(bestMove);
      if (moveResult) {
        setLastMove({ from: moveResult.from, to: moveResult.to });
        setFen(gameRef.current.fen());
      }
    }
    setEngineState(EngineState.Idle);

    if (gameRef.current.game_over()) {
      alert("Game Over!");
    }
  }, []);

  const handleSquareClick = useCallback((square: string) => {
    if (engineState !== EngineState.Idle || gameRef.current.game_over()) return;

    // Prevent moving if it's not the player's turn
    if (gameRef.current.turn() !== playerColor) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    if (selectedSquare) {
      const move = gameRef.current.moves({ square: selectedSquare, verbose: true }).find(m => m.to === square);
      if (move) {
        const moveResult = gameRef.current.move({ from: selectedSquare, to: square, promotion: 'q' }); // Default promotion
        if (moveResult) {
          setFen(gameRef.current.fen());
          setLastMove({ from: moveResult.from, to: moveResult.to });
          setSelectedSquare(null);
          setLegalMoves([]);
          setTimeout(triggerEngineResponse, 250); // Give UI time to update
        }
        return;
      }
    }

    const piece = gameRef.current.get(square);
    if (piece && piece.color === playerColor) {
      setSelectedSquare(square);
      const moves = gameRef.current.moves({ square, verbose: true });
      setLegalMoves(moves.map(m => m.to));
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [engineState, playerColor, selectedSquare, triggerEngineResponse]);
  
  const handleMakeEngineMove = useCallback(() => {
    if (engineState !== EngineState.Idle) return;
    triggerEngineResponse();
  }, [engineState, triggerEngineResponse]);

  const handleSimulate = useCallback(async () => {
    if (!gameRef.current.load(fen)) {
      alert("Invalid FEN string.");
      return;
    }
    
    setEngineState(EngineState.Simulating);
    setGeminiAnalysis(null);
    isSimulatingRef.current = true;

    while (isSimulatingRef.current && !gameRef.current.game_over()) {
      const bestMove = await engineRef.current?.findBestMove(gameRef.current.fen());
      
      if (bestMove && isSimulatingRef.current) {
        gameRef.current.move(bestMove);
        setFen(gameRef.current.fen());
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay for visibility
      } else {
        break; // Engine was stopped or no move found
      }
    }

    isSimulatingRef.current = false;
    setEngineState(EngineState.Idle);
  }, [fen]);
  
  const handleStop = useCallback(() => {
    isSimulatingRef.current = false;
    engineRef.current?.stop();
    setEngineState(EngineState.Idle);

    if (engineUpdate && engineUpdate.bestMove && engineUpdate.evaluation) {
        setIsGeminiLoading(true);
        getTalStyleAnalysis(gameRef.current.fen(), engineUpdate.evaluation, engineUpdate.bestMove)
            .then(setGeminiAnalysis)
            .catch(err => {
                console.error(err);
                setGeminiAnalysis("Failed to load analysis.");
            })
            .finally(() => setIsGeminiLoading(false));
    }
  }, [engineUpdate]);

  const handleSetFen = (newFen: string) => {
    if (gameRef.current.load(newFen)) {
        setFen(newFen);
        setSelectedSquare(null);
        setLegalMoves([]);
        setLastMove(null);
        setEngineUpdate(null);
    }
  }

  const handleFlipBoard = useCallback(() => {
    setOrientation(prev => prev === 'w' ? 'b' : 'w');
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-4xl font-bold text-center text-emerald-400 tracking-wider">
            Ultralight Chess Engine
          </h1>
          <p className="text-center text-gray-400 mt-1">"Take your opponent into a dark forest where 2+2=5..." - Mikhail Tal</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <Chessboard
              fen={fen}
              onSquareClick={handleSquareClick}
              selectedSquare={selectedSquare}
              legalMoves={legalMoves}
              lastMove={lastMove}
              orientation={orientation}
              moveCandidates={engineUpdate?.candidates}
            />
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <EngineControls
              engineState={engineState}
              fen={fen}
              setFen={handleSetFen}
              onAnalyze={handleMakeEngineMove}
              onSimulate={handleSimulate}
              onStop={handleStop}
              onFlipBoard={handleFlipBoard}
            />
            <EngineInfo engineUpdate={engineUpdate} turn={gameRef.current.turn()} />
            <EvaluationBreakdown 
              breakdown={engineUpdate?.breakdown || null}
              allComponents={engineRef.current?.getEvaluator().getAllComponents() || []}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ComponentConfig
            config={engineConfig}
            allComponents={engineRef.current?.getEvaluator().getAllComponents() || []}
            onConfigChange={handleConfigChange}
          />
          <GeminiAnalysis analysis={geminiAnalysis} isLoading={isGeminiLoading} />
        </div>
      </div>
    </div>
  );
}

export default App;