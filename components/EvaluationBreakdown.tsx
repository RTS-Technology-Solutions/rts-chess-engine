import React from 'react';
import type { EvaluationBreakdown, ComponentCategory, EvaluationComponent } from '../types';

interface EvaluationBreakdownProps {
  breakdown: EvaluationBreakdown | null;
  allComponents: EvaluationComponent[];
}

const CATEGORY_COLORS: Record<ComponentCategory, string> = {
  'material': 'bg-yellow-500',
  'pawn-structure': 'bg-blue-500',
  'piece-specific': 'bg-purple-500',
  'positional': 'bg-green-500',
  'king-safety': 'bg-red-500',
  'tactical': 'bg-orange-500',
};

const EvaluationBreakdownViz: React.FC<EvaluationBreakdownProps> = ({ breakdown, allComponents }) => {
  if (!breakdown || Object.keys(breakdown.components).length === 0) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-3 text-emerald-400">Evaluation Breakdown</h2>
        <div className="text-gray-500 text-center py-8">
          No evaluation data yet. Start the engine to see the breakdown.
        </div>
      </div>
    );
  }

  // Create a map of component IDs to metadata
  const componentMap = new Map(allComponents.map(c => [c.metadata.id, c.metadata]));

  // Get all component scores sorted by absolute value
  const componentScores = Object.entries(breakdown.components)
    .filter(([id]) => id !== 'checkmate' && id !== 'draw')
    .map(([id, score]) => ({
      id,
      score,
      metadata: componentMap.get(id),
    }))
    .filter(item => item.metadata)
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

  const maxAbsScore = Math.max(...componentScores.map(item => Math.abs(item.score)), 1);

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-3 text-emerald-400">Evaluation Breakdown</h2>
      
      <div className="mb-4 p-3 bg-gray-900 rounded">
        <div className="text-center">
          <div className="text-sm text-gray-400">Total Evaluation</div>
          <div className="text-3xl font-bold text-emerald-300">
            {breakdown.total > 0 ? '+' : ''}{(breakdown.total / 100).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">
            ({breakdown.total > 0 ? '+' : ''}{breakdown.total} centipawns)
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {componentScores.map(({ id, score, metadata }) => {
          if (!metadata) return null;
          
          const absScore = Math.abs(score);
          const percentage = (absScore / maxAbsScore) * 100;
          const isPositive = score > 0;
          const color = CATEGORY_COLORS[metadata.category];
          
          return (
            <div key={id} className="group">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-300 font-medium">{metadata.name}</span>
                <span className={`font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{score.toFixed(0)}
                </span>
              </div>
              <div className="h-6 bg-gray-900 rounded overflow-hidden relative">
                <div
                  className={`h-full ${color} opacity-70 transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
                <div className="absolute inset-0 flex items-center px-2 text-xs text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {metadata.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EvaluationBreakdownViz;
