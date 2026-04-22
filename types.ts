export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';

export interface Piece {
  type: PieceSymbol;
  color: Color;
}

// Component categories for organization
export type ComponentCategory = 
  | 'material' 
  | 'pawn-structure' 
  | 'piece-specific' 
  | 'positional' 
  | 'king-safety'
  | 'tactical';

// Metadata for each evaluation component
export interface ComponentMetadata {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  realWorldAnalogy: string; // For tooltips - how this relates to real-world decision making
  performanceCost: 'negligible' | 'low' | 'medium' | 'high';
}

// Interface for evaluation components
export interface EvaluationComponent {
  readonly metadata: ComponentMetadata;
  evaluate(game: IChessJs): number; // Returns centipawns from current player's perspective
}

// Detailed evaluation breakdown showing each component's contribution
export interface EvaluationBreakdown {
  total: number;
  components: Record<string, number>; // component id -> score
  perspective: Color; // Which side's perspective (always current player)
}

// Legacy simple evaluation (for compatibility during transition)
export interface Evaluation {
  material: number;
  kingSafety: number;
  checkmate: number;
  draw: number;
  total: number;
}

// Engine configuration - which components are enabled
export interface EngineConfig {
  name: string;
  depth: number; // 2 (off) or 5 (on)
  enabledComponents: Set<string>; // Set of component IDs
}

// Move candidate with evaluation
export interface MoveCandidate {
  move: string;
  score: number;
  depth: number;
  breakdown?: EvaluationBreakdown;
}

export interface EngineUpdate {
  depth: number;
  bestMove: string | null;
  evaluation: Evaluation;
  breakdown?: EvaluationBreakdown; // Detailed component breakdown
  candidates?: MoveCandidate[]; // All root moves considered
  nodes: number;
  nps: number;
}

export enum EngineState {
  Idle = 'IDLE',
  Thinking = 'THINKING',
  Simulating = 'SIMULATING',
}

// Basic type definitions for chess.js loaded from CDN
export interface ChessJsMove {
  color: Color;
  from: string;
  to: string;
  piece: PieceSymbol;
  san: string;
  flags: string;
}

export interface IChessJs {
  new (fen?: string): IChessJs;
  fen(): string;
  load(fen: string): boolean;
  move(move: string | { from: string; to: string; promotion?: string }): ChessJsMove | null;
  // FIX: Add optional `square` property to `moves` method options to allow getting moves for a specific piece.
  moves(options: { verbose: true; square?: string; }): ChessJsMove[];
  moves(options?: { verbose?: false; square?: string; }): string[];
  turn(): Color;
  get(square: string): Piece | null;
  in_check(): boolean;
  in_checkmate(): boolean;
  in_stalemate(): boolean;
  in_draw(): boolean;
  game_over(): boolean;
  history(): string[];
  undo(): ChessJsMove | null;
}

declare global {
  var Chess: IChessJs;
}
