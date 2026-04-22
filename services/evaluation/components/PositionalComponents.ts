import { BaseEvaluationComponent } from '../EvaluationComponent';
import type { IChessJs } from '../../../types';

/**
 * CenterControlComponent - Rewards controlling central squares
 */
export class CenterControlComponent extends BaseEvaluationComponent {
  private static readonly CENTER_SQUARES = ['d4', 'd5', 'e4', 'e5'];
  private static readonly EXTENDED_CENTER = ['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6'];

  constructor() {
    super(
      'center-control',
      'Center Control',
      'positional',
      'Rewards controlling the central squares (d4, d5, e4, e5) and extended center, which provides more piece mobility and flexibility.',
      'Like controlling key strategic locations in business - downtown real estate or major transportation hubs give you more influence.',
      'medium'
    );
  }

  evaluate(game: IChessJs): number {
    let score = 0;
    const currentTurn = game.turn();
    
    // Check which side controls each central square
    for (const square of CenterControlComponent.CENTER_SQUARES) {
      const piece = game.get(square);
      if (piece) {
        const value = piece.color === 'w' ? 10 : -10;
        score += value;
      }
    }
    
    // Extended center worth less
    for (const square of CenterControlComponent.EXTENDED_CENTER) {
      const piece = game.get(square);
      if (piece && piece.type !== 'k') { // Don't count king in center
        const value = piece.color === 'w' ? 3 : -3;
        score += value;
      }
    }
    
    return this.toPerspective(score, game);
  }
}

/**
 * PieceMobilityComponent - Rewards pieces having many legal moves
 * Optimized version that estimates mobility without extra move generation
 */
export class PieceMobilityComponent extends BaseEvaluationComponent {
  constructor() {
    super(
      'piece-mobility',
      'Piece Mobility',
      'positional',
      'Counts the number of legal moves available for all pieces. More mobility = more flexibility and options.',
      'Like having multiple strategic options in business - the ability to pivot or adapt to changing circumstances.',
      'medium' // Reduced from 'high' after optimization
    );
  }

  evaluate(game: IChessJs): number {
    // Simply count legal moves for current position
    // This is much faster than also counting opponent moves
    const currentMoves = game.moves().length;
    
    // Bonus for having many moves (3 centipawns per move)
    // Typical opening positions have 20-30 moves, middlegame 30-40
    return currentMoves * 3;
  }
}

/**
 * BishopPairComponent - Rewards having both bishops
 */
export class BishopPairComponent extends BaseEvaluationComponent {
  constructor() {
    super(
      'bishop-pair',
      'Bishop Pair',
      'piece-specific',
      'Bonus for having both bishops, which complement each other by controlling all square colors.',
      'Like having both offensive and defensive capabilities - covering all your bases.',
      'negligible'
    );
  }

  evaluate(game: IChessJs): number {
    let whiteBishops = 0;
    let blackBishops = 0;
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const piece = game.get(square);
        if (piece?.type === 'b') {
          if (piece.color === 'w') whiteBishops++;
          else blackBishops++;
        }
      }
    }
    
    let score = 0;
    if (whiteBishops >= 2) score += 30;
    if (blackBishops >= 2) score -= 30;
    
    return this.toPerspective(score, game);
  }
}

/**
 * KnightOutpostsComponent - Rewards knights on strong central squares
 */
export class KnightOutpostsComponent extends BaseEvaluationComponent {
  private static readonly OUTPOST_SQUARES_WHITE = ['c5', 'd5', 'e5', 'f5', 'c6', 'd6', 'e6', 'f6'];
  private static readonly OUTPOST_SQUARES_BLACK = ['c4', 'd4', 'e4', 'f4', 'c3', 'd3', 'e3', 'f3'];

  constructor() {
    super(
      'knight-outposts',
      'Knight Outposts',
      'piece-specific',
      'Bonus for knights placed on strong squares deep in enemy territory where they cannot be easily attacked by pawns.',
      'Like establishing a forward operating base in enemy territory - a strong position that\'s hard to dislodge.',
      'low'
    );
  }

  evaluate(game: IChessJs): number {
    let score = 0;
    
    for (const square of KnightOutpostsComponent.OUTPOST_SQUARES_WHITE) {
      const piece = game.get(square);
      if (piece?.type === 'n' && piece.color === 'w') {
        score += 25;
      }
    }
    
    for (const square of KnightOutpostsComponent.OUTPOST_SQUARES_BLACK) {
      const piece = game.get(square);
      if (piece?.type === 'n' && piece.color === 'b') {
        score -= 25;
      }
    }
    
    return this.toPerspective(score, game);
  }
}

/**
 * RookOpenFileComponent - Rewards rooks on open or semi-open files
 */
export class RookOpenFileComponent extends BaseEvaluationComponent {
  constructor() {
    super(
      'rook-open-file',
      'Rook on Open File',
      'piece-specific',
      'Bonus for rooks on files with no pawns (open) or only enemy pawns (semi-open), increasing their activity.',
      'Like having unobstructed access to your target market - no barriers to reach your objectives.',
      'medium'
    );
  }

  evaluate(game: IChessJs): number {
    let score = 0;
    
    // Analyze each file
    for (let file = 0; file < 8; file++) {
      const fileChar = String.fromCharCode(97 + file);
      let whitePawns = 0;
      let blackPawns = 0;
      let whiteRooks = 0;
      let blackRooks = 0;
      
      for (let rank = 0; rank < 8; rank++) {
        const square = fileChar + (8 - rank);
        const piece = game.get(square);
        if (piece?.type === 'p') {
          if (piece.color === 'w') whitePawns++;
          else blackPawns++;
        } else if (piece?.type === 'r') {
          if (piece.color === 'w') whiteRooks++;
          else blackRooks++;
        }
      }
      
      // Open file (no pawns)
      if (whitePawns === 0 && blackPawns === 0) {
        score += whiteRooks * 20;
        score -= blackRooks * 20;
      }
      // Semi-open file (only enemy pawns)
      else if (whitePawns === 0 && whiteRooks > 0) {
        score += whiteRooks * 10;
      } else if (blackPawns === 0 && blackRooks > 0) {
        score -= blackRooks * 10;
      }
    }
    
    return this.toPerspective(score, game);
  }
}
