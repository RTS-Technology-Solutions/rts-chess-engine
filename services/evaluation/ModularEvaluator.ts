import type { IChessJs, EvaluationComponent, EvaluationBreakdown, EngineConfig } from '../../types';

/**
 * ModularEvaluator orchestrates evaluation components.
 * It executes only enabled components and returns a detailed breakdown.
 */
export class ModularEvaluator {
  private components: Map<string, EvaluationComponent>;
  
  constructor(components: EvaluationComponent[]) {
    this.components = new Map();
    for (const component of components) {
      this.components.set(component.metadata.id, component);
    }
  }

  /**
   * Evaluate position using only enabled components
   */
  evaluate(game: IChessJs, config: EngineConfig): EvaluationBreakdown {
    const breakdown: EvaluationBreakdown = {
      total: 0,
      components: {},
      perspective: game.turn(),
    };

    // Handle terminal positions
    if (game.in_checkmate()) {
      breakdown.total = -Infinity;
      breakdown.components['checkmate'] = -Infinity;
      return breakdown;
    }

    if (game.in_draw() || game.in_stalemate()) {
      breakdown.total = 0;
      breakdown.components['draw'] = 0;
      return breakdown;
    }

    // Execute enabled components in order (cheap to expensive)
    for (const componentId of config.enabledComponents) {
      const component = this.components.get(componentId);
      if (component) {
        const score = component.evaluate(game);
        breakdown.components[componentId] = score;
        breakdown.total += score;
      }
    }

    return breakdown;
  }

  /**
   * Get all available components
   */
  getAllComponents(): EvaluationComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Get component by ID
   */
  getComponent(id: string): EvaluationComponent | undefined {
    return this.components.get(id);
  }
}
