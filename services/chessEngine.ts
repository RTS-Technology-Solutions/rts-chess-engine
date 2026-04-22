import type { Evaluation, EvaluationBreakdown, IChessJs, ChessJsMove, Piece, EngineConfig, MoveCandidate } from '../types';
import { PIECE_VALUES, PST, CASTLING_BONUS, CHECK_PENALTY } from '../constants';
import { ModularEvaluator } from './evaluation/ModularEvaluator';
import { MaterialComponent, PieceSquareTablesComponent, CastlingRightsComponent, CheckPenaltyComponent } from './evaluation/components/BasicComponents';
import { PassedPawnsComponent, DoubledPawnsComponent, IsolatedPawnsComponent } from './evaluation/components/PawnStructure';
import { CenterControlComponent, PieceMobilityComponent, BishopPairComponent, KnightOutpostsComponent, RookOpenFileComponent } from './evaluation/components/PositionalComponents';
import { PRESET_BASIC } from './evaluation/presets';

const MAX_SEARCH_DEPTH = 10; // Per-move search depth for simulation
const EVAL_CONVERGENCE_THRESHOLD = 10; // Centipawns - early exit if eval stable

class ChessEngine {
  private game: IChessJs;
  private nodes = 0;
  private onUpdate: (update: any) => void;
  private startTime = 0;
  private isThinking = false;
  private currentBestMove: string | null = null;
  private evaluator: ModularEvaluator;
  private config: EngineConfig;
  private moveCandidates: MoveCandidate[] = [];
  private previousEval: number | null = null;
  private stableDepthCount: number = 0;

  constructor(onUpdate: (update: any) => void, config: EngineConfig = PRESET_BASIC) {
    this.game = new Chess();
    this.onUpdate = onUpdate;
    this.config = config;
    
    // Initialize evaluator with all available components
    this.evaluator = new ModularEvaluator([
      new MaterialComponent(),
      new PieceSquareTablesComponent(),
      new CastlingRightsComponent(),
      new CheckPenaltyComponent(),
      new PassedPawnsComponent(),
      new DoubledPawnsComponent(),
      new IsolatedPawnsComponent(),
      new CenterControlComponent(),
      new PieceMobilityComponent(),
      new BishopPairComponent(),
      new KnightOutpostsComponent(),
      new RookOpenFileComponent(),
    ]);
  }

  public setConfig(config: EngineConfig) {
    this.config = config;
  }

  public getConfig(): EngineConfig {
    return this.config;
  }

  public getEvaluator(): ModularEvaluator {
    return this.evaluator;
  }

  public stop() {
    this.isThinking = false;
  }

  public async findBestMove(fen: string, searchDepth?: number): Promise<string | null> {
    this.isThinking = true;
    this.game.load(fen);
    this.nodes = 0;
    this.startTime = performance.now();
    this.currentBestMove = null;
    this.moveCandidates = [];
    this.previousEval = null;
    this.stableDepthCount = 0;

    // Use config depth if not specified
    const maxDepth = searchDepth ?? this.config.depth;

    for (let depth = 1; depth <= maxDepth; depth++) {
        if (!this.isThinking) break;

        const result = this.negamax(depth, -Infinity, Infinity, true); // true = isRoot
        this.currentBestMove = result.move;
        const breakdown = this.evaluateWithBreakdown();
        
        const nps = this.nodes / ((performance.now() - this.startTime) / 1000);
        
        // Check for eval convergence (early exit optimization)
        if (this.previousEval !== null && 
            Math.abs(breakdown.total - this.previousEval) < EVAL_CONVERGENCE_THRESHOLD) {
          this.stableDepthCount++;
          if (this.stableDepthCount >= 2 && depth >= 3) {
            // Eval hasn't changed significantly for 2 depths, we can exit early
            this.onUpdate({
                depth,
                bestMove: this.currentBestMove,
                evaluation: this.breakdownToLegacyEval(breakdown),
                breakdown,
                candidates: this.moveCandidates,
                nodes: this.nodes,
                nps: Math.round(nps),
            });
            break;
          }
        } else {
          this.stableDepthCount = 0;
        }
        this.previousEval = breakdown.total;

        this.onUpdate({
            depth,
            bestMove: this.currentBestMove,
            evaluation: this.breakdownToLegacyEval(breakdown),
            breakdown,
            candidates: this.moveCandidates,
            nodes: this.nodes,
            nps: Math.round(nps),
        });

        // Yield to the event loop to keep UI responsive
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    this.isThinking = false;
    return this.currentBestMove;
  }
  
  /**
   * Evaluate using the modular evaluation system with detailed breakdown
   */
  private evaluateWithBreakdown(): EvaluationBreakdown {
    return this.evaluator.evaluate(this.game, this.config);
  }

  /**
   * Legacy evaluation for backward compatibility
   */
  private evaluate(): Evaluation {
    const breakdown = this.evaluateWithBreakdown();
    return this.breakdownToLegacyEval(breakdown);
  }

  /**
   * Convert breakdown to legacy evaluation format
   */
  private breakdownToLegacyEval(breakdown: EvaluationBreakdown): Evaluation {
    if (breakdown.total === -Infinity) {
      return { material: 0, kingSafety: 0, checkmate: breakdown.total, draw: 0, total: breakdown.total };
    }
    if (breakdown.components['draw'] !== undefined) {
      return { material: 0, kingSafety: 0, checkmate: 0, draw: 1, total: 0 };
    }

    return {
      material: breakdown.components['material'] || 0,
      kingSafety: (breakdown.components['castling-rights'] || 0) + (breakdown.components['check-penalty'] || 0),
      checkmate: 0,
      draw: 0,
      total: breakdown.total,
    };
  }
  
  private orderMoves(moves: ChessJsMove[]): ChessJsMove[] {
      // Basic move ordering: captures, checks, then quiet moves.
      return moves.sort((a, b) => {
          const aIsCapture = a.flags.includes('c');
          const bIsCapture = b.flags.includes('c');
          if (aIsCapture !== bIsCapture) return aIsCapture ? -1 : 1;

          const aIsCheck = a.san.includes('+');
          const bIsCheck = b.san.includes('+');
          if (aIsCheck !== bIsCheck) return aIsCheck ? -1 : 1;
          
          return 0; // No further sorting for simplicity
      });
  }

  private negamax(depth: number, alpha: number, beta: number, isRoot: boolean = false): { value: number, move: string | null } {
    if (depth === 0 || !this.isThinking) {
      this.nodes++;
      return { value: this.evaluateWithBreakdown().total, move: null };
    }

    let max = -Infinity;
    let bestMove = null;
    
    const moves = this.game.moves({ verbose: true });
    if (moves.length === 0) { // Handle stalemate/checkmate at leaf
        return { value: this.evaluateWithBreakdown().total, move: null };
    }

    const orderedMoves = this.orderMoves(moves);

    // Track candidates at root for visualization
    if (isRoot && depth === this.config.depth) {
      this.moveCandidates = [];
    }

    for (const move of orderedMoves) {
      this.game.move(move.san);
      const { value } = this.negamax(depth - 1, -beta, -alpha, false);
      const score = -value;
      this.game.undo();
      
      if (!this.isThinking) break;

      // Track move candidates at root
      if (isRoot && depth === this.config.depth) {
        this.moveCandidates.push({
          move: move.san,
          score,
          depth,
        });
      }

      if (score > max) {
        max = score;
        bestMove = move.san;
      }
      alpha = Math.max(alpha, score);

      if (alpha >= beta) {
        break; // Alpha-beta pruning
      }
    }
    
    return { value: max, move: bestMove };
  }
}

export default ChessEngine;