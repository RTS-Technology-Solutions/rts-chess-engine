import React from 'react';
import type { Piece, Color, MoveCandidate } from '../types';

interface ChessboardProps {
  fen: string;
  onSquareClick: (square: string) => void;
  selectedSquare: string | null;
  legalMoves: string[];
  lastMove: { from: string; to: string } | null;
  orientation: Color;
  moveCandidates?: MoveCandidate[];
}

const pieceEmoji: { [color: string]: { [piece: string]: string } } = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟︎', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};

const PieceIcon: React.FC<{ piece: Piece }> = ({ piece }) => {
  const emoji = pieceEmoji[piece.color][piece.type];
  const pieceName = {
      p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King'
  }[piece.type];
  
  return (
    <span
      className="text-4xl md:text-5xl select-none"
      role="img"
      aria-label={`${piece.color === 'w' ? 'White' : 'Black'} ${pieceName}`}
    >
      {emoji}
    </span>
  );
};


const Chessboard: React.FC<ChessboardProps> = ({ fen, onSquareClick, selectedSquare, legalMoves, lastMove, orientation, moveCandidates = [] }) => {
  const board = React.useMemo(() => {
    const boardState = fen.split(' ')[0];
    const rows = boardState.split('/');
    const boardRep: (Piece | null)[][] = [];
    
    for (const row of rows) {
      const newRow: (Piece | null)[] = [];
      for (const char of row) {
        if (isNaN(parseInt(char))) {
          const color = char === char.toUpperCase() ? 'w' : 'b';
          const type = char.toLowerCase() as Piece['type'];
          newRow.push({ type, color });
        } else {
          for (let i = 0; i < parseInt(char); i++) {
            newRow.push(null);
          }
        }
      }
      boardRep.push(newRow);
    }
    return boardRep;
  }, [fen]);

  // Parse move candidates and extract from/to squares
  const moveArrows = React.useMemo(() => {
    if (!moveCandidates || moveCandidates.length === 0) return [];

    // Create a temporary chess instance to parse moves
    const tempGame = new Chess(fen);
    const arrows: Array<{ from: string; to: string; score: number; opacity: number }> = [];
    
    // Find best score for normalization
    const scores = moveCandidates.map(c => c.score);
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);
    const scoreRange = Math.max(bestScore - worstScore, 100); // Minimum range of 100 centipawns
    
    for (const candidate of moveCandidates) {
      try {
        const moves = tempGame.moves({ verbose: true });
        const move = moves.find(m => m.san === candidate.move);
        
        if (move) {
          // Normalize score to opacity (0.2 - 0.9)
          // Best move = 0.9, worst move = 0.2
          const normalizedScore = (candidate.score - worstScore) / scoreRange;
          const opacity = 0.2 + (normalizedScore * 0.7);
          
          // Only show arrows with opacity > 0.25 (filter out very weak moves)
          if (opacity > 0.25) {
            arrows.push({
              from: move.from,
              to: move.to,
              score: candidate.score,
              opacity,
            });
          }
        }
      } catch (e) {
        // Skip invalid moves
      }
    }
    
    return arrows;
  }, [moveCandidates, fen]);

  // Convert square name to board coordinates (0-7)
  const squareToCoords = (square: string): { file: number; rank: number } => {
    const file = square.charCodeAt(0) - 97; // 'a' = 0, 'h' = 7
    const rank = parseInt(square[1]) - 1; // '1' = 0, '8' = 7
    return { file, rank };
  };

  // Convert board coordinates to pixel position (center of square)
  const coordsToPixels = (file: number, rank: number): { x: number; y: number } => {
    const adjustedFile = orientation === 'w' ? file : 7 - file;
    const adjustedRank = orientation === 'w' ? 7 - rank : rank;
    
    const x = (adjustedFile + 0.5) * 12.5; // 12.5% per square
    const y = (adjustedRank + 0.5) * 12.5;
    
    return { x, y };
  };

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const finalBoard = orientation === 'w' ? board : [...board].reverse().map(row => [...row].reverse());

  return (
    <div className="aspect-square w-full max-w-[70vh] shadow-2xl rounded-lg overflow-hidden border-4 border-gray-700 relative">
      {finalBoard.map((row, rowIndex) => (
        <div key={rowIndex} className="flex">
          {row.map((piece, colIndex) => {
            const rank = orientation === 'w' ? 8 - rowIndex : rowIndex + 1;
            const file = orientation === 'w' ? files[colIndex] : files[7 - colIndex];
            const squareName = `${file}${rank}`;

            const isLight = (rowIndex + colIndex) % 2 !== 0;

            const isSelected = squareName === selectedSquare;
            const isLastMove = lastMove && (squareName === lastMove.from || squareName === lastMove.to);
            const isLegalMove = legalMoves.includes(squareName);

            let bgClass = isLight ? 'bg-gray-400' : 'bg-emerald-800';
            if (isSelected) {
              bgClass = 'bg-yellow-600/80';
            } else if (isLastMove) {
              bgClass = isLight ? 'bg-yellow-300/80' : 'bg-yellow-500/80';
            }

            return (
              <div
                key={squareName}
                className={`w-[12.5%] aspect-square flex items-center justify-center relative cursor-pointer ${bgClass} transition-colors duration-150`}
                onClick={() => onSquareClick(squareName)}
                role="button"
                aria-label={`Square ${squareName}`}
              >
                {isLegalMove && (
                  <div className="absolute w-1/3 h-1/3 rounded-full bg-black/20" aria-hidden="true"></div>
                )}
                {piece && <PieceIcon piece={piece} />}
              </div>
            );
          })}
        </div>
      ))}
      
      {/* SVG overlay for move arrows */}
      {moveArrows.length > 0 && (
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          style={{ zIndex: 10 }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="4"
              markerHeight="4"
              refX="2"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 4 2, 0 4" fill="rgb(59, 130, 246)" />
            </marker>
          </defs>
          {moveArrows.map((arrow, idx) => {
            const fromCoords = squareToCoords(arrow.from);
            const toCoords = squareToCoords(arrow.to);
            const fromPixels = coordsToPixels(fromCoords.file, fromCoords.rank);
            const toPixels = coordsToPixels(toCoords.file, toCoords.rank);
            
            // Shorten arrow slightly so it doesn't overlap pieces
            const dx = toPixels.x - fromPixels.x;
            const dy = toPixels.y - fromPixels.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const shortenBy = 3; // percentage units
            const ratio = (length - shortenBy) / length;
            
            const endX = fromPixels.x + dx * ratio;
            const endY = fromPixels.y + dy * ratio;
            
            return (
              <g key={idx} opacity={arrow.opacity}>
                <line
                  x1={fromPixels.x}
                  y1={fromPixels.y}
                  x2={endX}
                  y2={endY}
                  stroke="rgb(59, 130, 246)"
                  strokeWidth="1.5"
                  markerEnd="url(#arrowhead)"
                  className="transition-opacity duration-300"
                />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};

export default Chessboard;