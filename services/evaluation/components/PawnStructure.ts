import { BaseEvaluationComponent } from '../EvaluationComponent';
import type { IChessJs, Piece } from '../../../types';

/**
 * Helper to get pawn structure information
 */
class PawnAnalyzer {
  /**
   * Get all pawns of a specific color as square indices (0-63)
   */
  static getPawns(game: IChessJs, color: 'w' | 'b'): number[] {
    const pawns: number[] = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const piece = game.get(square);
        if (piece?.type === 'p' && piece.color === color) {
          pawns.push(rank * 8 + file);
        }
      }
    }
    return pawns;
  }

  /**
   * Check if pawn is passed (no enemy pawns ahead in same or adjacent files)
   */
  static isPassedPawn(pawnIndex: number, color: 'w' | 'b', enemyPawns: number[]): boolean {
    const file = pawnIndex % 8;
    const rank = Math.floor(pawnIndex / 8);
    
    for (const enemyIndex of enemyPawns) {
      const enemyFile = enemyIndex % 8;
      const enemyRank = Math.floor(enemyIndex / 8);
      
      // Check if enemy is in same or adjacent file
      if (Math.abs(file - enemyFile) <= 1) {
        // Check if enemy is ahead
        if (color === 'w' && enemyRank < rank) return false;
        if (color === 'b' && enemyRank > rank) return false;
      }
    }
    return true;
  }

  /**
   * Check if pawn is doubled (another pawn in same file)
   */
  static isDoubledPawn(pawnIndex: number, alliedPawns: number[]): boolean {
    const file = pawnIndex % 8;
    return alliedPawns.some(idx => idx !== pawnIndex && idx % 8 === file);
  }

  /**
   * Check if pawn is isolated (no allied pawns in adjacent files)
   */
  static isIsolatedPawn(pawnIndex: number, alliedPawns: number[]): boolean {
    const file = pawnIndex % 8;
    return !alliedPawns.some(idx => Math.abs((idx % 8) - file) === 1);
  }
}

/**
 * PassedPawnsComponent - Rewards passed pawns
 */
export class PassedPawnsComponent extends BaseEvaluationComponent {
  constructor() {
    super(
      'passed-pawns',
      'Passed Pawns',
      'pawn-structure',
      'Rewards pawns that have no enemy pawns blocking their path to promotion. More valuable the closer to promotion.',
      'Like having a clear path to your goal with no obstacles. In business, this is like having exclusive market access.',
      'medium'
    );
  }

  evaluate(game: IChessJs): number {
    const whitePawns = PawnAnalyzer.getPawns(game, 'w');
    const blackPawns = PawnAnalyzer.getPawns(game, 'b');
    let score = 0;
    
    // Evaluate white passed pawns
    for (const pawnIdx of whitePawns) {
      if (PawnAnalyzer.isPassedPawn(pawnIdx, 'w', blackPawns)) {
        const rank = Math.floor(pawnIdx / 8);
        const rankFromPromotion = rank; // rank 0 is 8th rank (near promotion)
        score += 20 + (7 - rankFromPromotion) * 10; // 20-90 points
      }
    }
    
    // Evaluate black passed pawns
    for (const pawnIdx of blackPawns) {
      if (PawnAnalyzer.isPassedPawn(pawnIdx, 'b', whitePawns)) {
        const rank = Math.floor(pawnIdx / 8);
        const rankFromPromotion = 7 - rank; // rank 7 is 1st rank (near promotion)
        score -= 20 + (7 - rankFromPromotion) * 10;
      }
    }
    
    return this.toPerspective(score, game);
  }
}

/**
 * DoubledPawnsComponent - Penalizes doubled pawns
 */
export class DoubledPawnsComponent extends BaseEvaluationComponent {
  constructor() {
    super(
      'doubled-pawns',
      'Doubled Pawns',
      'pawn-structure',
      'Penalizes having multiple pawns on the same file, as they block each other and are harder to defend.',
      'Like redundancy without benefit - having two people doing the exact same job without collaboration value.',
      'low'
    );
  }

  evaluate(game: IChessJs): number {
    const whitePawns = PawnAnalyzer.getPawns(game, 'w');
    const blackPawns = PawnAnalyzer.getPawns(game, 'b');
    let penalty = 0;
    
    const counted = new Set<number>();
    
    // Count white doubled pawns
    for (const pawnIdx of whitePawns) {
      if (!counted.has(pawnIdx) && PawnAnalyzer.isDoubledPawn(pawnIdx, whitePawns)) {
        penalty -= 15;
        counted.add(pawnIdx);
      }
    }
    
    counted.clear();
    
    // Count black doubled pawns
    for (const pawnIdx of blackPawns) {
      if (!counted.has(pawnIdx) && PawnAnalyzer.isDoubledPawn(pawnIdx, blackPawns)) {
        penalty += 15;
        counted.add(pawnIdx);
      }
    }
    
    return this.toPerspective(penalty, game);
  }
}

/**
 * IsolatedPawnsComponent - Penalizes isolated pawns
 */
export class IsolatedPawnsComponent extends BaseEvaluationComponent {
  constructor() {
    super(
      'isolated-pawns',
      'Isolated Pawns',
      'pawn-structure',
      'Penalizes pawns with no friendly pawns on adjacent files, making them hard to defend and advance.',
      'Like being isolated from your support network - no backup nearby when you need help.',
      'low'
    );
  }

  evaluate(game: IChessJs): number {
    const whitePawns = PawnAnalyzer.getPawns(game, 'w');
    const blackPawns = PawnAnalyzer.getPawns(game, 'b');
    let penalty = 0;
    
    // Count white isolated pawns
    for (const pawnIdx of whitePawns) {
      if (PawnAnalyzer.isIsolatedPawn(pawnIdx, whitePawns)) {
        penalty -= 12;
      }
    }
    
    // Count black isolated pawns
    for (const pawnIdx of blackPawns) {
      if (PawnAnalyzer.isIsolatedPawn(pawnIdx, blackPawns)) {
        penalty += 12;
      }
    }
    
    return this.toPerspective(penalty, game);
  }
}
