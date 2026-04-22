import type { IChessJs, EvaluationComponent, ComponentMetadata, ComponentCategory } from '../../types';

/**
 * Abstract base class for evaluation components.
 * Each component evaluates one aspect of the position and returns a score in centipawns.
 * Score is always from the current player's perspective (positive = good for current player).
 */
export abstract class BaseEvaluationComponent implements EvaluationComponent {
  readonly metadata: ComponentMetadata;

  constructor(
    id: string,
    name: string,
    category: ComponentCategory,
    description: string,
    realWorldAnalogy: string,
    performanceCost: 'negligible' | 'low' | 'medium' | 'high' = 'low'
  ) {
    this.metadata = {
      id,
      name,
      category,
      description,
      realWorldAnalogy,
      performanceCost,
    };
  }

  abstract evaluate(game: IChessJs): number;

  /**
   * Helper to convert evaluation to current player's perspective
   */
  protected toPerspective(score: number, game: IChessJs): number {
    return game.turn() === 'w' ? score : -score;
  }
}
