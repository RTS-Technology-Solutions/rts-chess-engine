import { BaseEvaluationComponent } from '../EvaluationComponent';
import { PIECE_VALUES, PST, CASTLING_BONUS, CHECK_PENALTY } from '../../../constants';
import type { IChessJs } from '../../../types';

/**
 * MaterialComponent - Basic material counting
 */
export class MaterialComponent extends BaseEvaluationComponent {
  constructor() {
    super(
      'material',
      'Material Balance',
      'material',
      'Counts the total value of pieces on the board. Pawn=100, Knight=320, Bishop=330, Rook=500, Queen=900.',
      'Like counting cash in hand - the most fundamental measure of advantage. A business with more resources has more options.',
      'negligible'
    );
  }

  evaluate(game: IChessJs): number {
    let material = 0;
    
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const square = String.fromCharCode(97 + j) + (8 - i);
        const piece = game.get(square);
        if (piece && piece.type !== 'k') { // Don't count kings
          const value = PIECE_VALUES[piece.type];
          material += piece.color === 'w' ? value : -value;
        }
      }
    }
    
    return this.toPerspective(material, game);
  }
}

/**
 * PieceSquareTablesComponent - Positional bonuses based on piece placement
 */
export class PieceSquareTablesComponent extends BaseEvaluationComponent {
  constructor() {
    super(
      'pst',
      'Piece Placement',
      'positional',
      'Rewards pieces for being on strong squares. Knights prefer the center, pawns advance, kings stay safe in opening.',
      'Like real estate - location matters. A store in a high-traffic area is more valuable than one in a remote location.',
      'low'
    );
  }

  evaluate(game: IChessJs): number {
    let pstValue = 0;
    
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const square = String.fromCharCode(97 + j) + (8 - i);
        const piece = game.get(square);
        if (piece) {
          const pstIndex = i * 8 + j;
          const value = piece.color === 'w' 
            ? PST[piece.type][pstIndex] 
            : PST[piece.type][63 - pstIndex];
          pstValue += piece.color === 'w' ? value : -value;
        }
      }
    }
    
    return this.toPerspective(pstValue, game);
  }
}

/**
 * CastlingRightsComponent - Values having castling available
 */
export class CastlingRightsComponent extends BaseEvaluationComponent {
  constructor() {
    super(
      'castling-rights',
      'Castling Rights',
      'king-safety',
      'Bonus for maintaining the ability to castle. Castling keeps the king safe and activates the rook.',
      'Like keeping your options open in business. Having the ability to pivot is valuable, even if you haven\'t done it yet.',
      'negligible'
    );
  }

  evaluate(game: IChessJs): number {
    const fen = game.fen();
    const castling = fen.split(' ')[2];
    let bonus = 0;
    
    if (castling.includes('K') || castling.includes('Q')) bonus += CASTLING_BONUS;
    if (castling.includes('k') || castling.includes('q')) bonus -= CASTLING_BONUS;
    
    return this.toPerspective(bonus, game);
  }
}

/**
 * CheckPenaltyComponent - Penalty for being in check
 */
export class CheckPenaltyComponent extends BaseEvaluationComponent {
  constructor() {
    super(
      'check-penalty',
      'Check Danger',
      'king-safety',
      'Penalizes being in check since it limits options and indicates king danger.',
      'Like being under immediate pressure or threat - it forces you into reactive mode and limits strategic options.',
      'negligible'
    );
  }

  evaluate(game: IChessJs): number {
    if (!game.in_check()) return 0;
    
    // Current player is in check, so return negative value
    return CHECK_PENALTY;
  }
}
