import React, { useState } from 'react';
import type { EngineConfig, EvaluationComponent, ComponentCategory } from '../types';
import { ALL_PRESETS, cloneConfig } from '../services/evaluation/presets';

interface ComponentConfigProps {
  config: EngineConfig;
  allComponents: EvaluationComponent[];
  onConfigChange: (config: EngineConfig) => void;
}

const CATEGORY_NAMES: Record<ComponentCategory, string> = {
  'material': '💰 Material',
  'pawn-structure': '♟️ Pawn Structure',
  'piece-specific': '♞ Piece-Specific',
  'positional': '📍 Positional',
  'king-safety': '👑 King Safety',
  'tactical': '⚡ Tactical',
};

const CATEGORY_ORDER: ComponentCategory[] = [
  'material',
  'positional',
  'pawn-structure',
  'piece-specific',
  'king-safety',
  'tactical',
];

const ComponentConfig: React.FC<ComponentConfigProps> = ({ config, allComponents, onConfigChange }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<ComponentCategory>>(
    new Set(['material', 'positional'])
  );

  const toggleCategory = (category: ComponentCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleComponent = (componentId: string) => {
    const newConfig = { ...config };
    newConfig.enabledComponents = new Set(config.enabledComponents);
    
    if (newConfig.enabledComponents.has(componentId)) {
      newConfig.enabledComponents.delete(componentId);
    } else {
      newConfig.enabledComponents.add(componentId);
    }
    
    newConfig.name = config.name.includes('Custom') ? config.name : config.name + ' (Custom)';
    onConfigChange(newConfig);
  };

  const toggleDepth = () => {
    const newConfig = { ...config };
    newConfig.depth = config.depth === 2 ? 5 : 2;
    newConfig.name = config.name.includes('Custom') ? config.name : config.name + ' (Custom)';
    onConfigChange(newConfig);
  };

  const loadPreset = (preset: EngineConfig) => {
    onConfigChange({ ...preset, enabledComponents: new Set(preset.enabledComponents) });
  };

  // Group components by category
  const componentsByCategory = CATEGORY_ORDER.reduce((acc, category) => {
    acc[category] = allComponents.filter(c => c.metadata.category === category);
    return acc;
  }, {} as Record<ComponentCategory, EvaluationComponent[]>);

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-3 text-emerald-400">Engine Configuration</h2>
      
      {/* Preset Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">Preset</label>
        <div className="grid grid-cols-2 gap-2">
          {ALL_PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset)}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                config.name === preset.name
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Depth Toggle */}
      <div className="mb-4 p-3 bg-gray-900 rounded">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-300">Search Depth</div>
            <div className="text-xs text-gray-500">
              {config.depth === 2 ? 'Shallow (2 ply) - Fast' : 'Deep (5 ply) - Slower'}
            </div>
          </div>
          <button
            onClick={toggleDepth}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.depth === 5 ? 'bg-emerald-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.depth === 5 ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Component Categories */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {CATEGORY_ORDER.map(category => {
          const components = componentsByCategory[category];
          if (!components || components.length === 0) return null;
          
          const isExpanded = expandedCategories.has(category);
          const enabledCount = components.filter(c => config.enabledComponents.has(c.metadata.id)).length;
          
          return (
            <div key={category} className="bg-gray-900 rounded">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-800 rounded transition-colors"
              >
                <span className="font-medium text-gray-300">
                  {CATEGORY_NAMES[category]}
                  <span className="ml-2 text-xs text-gray-500">
                    ({enabledCount}/{components.length})
                  </span>
                </span>
                <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
              </button>
              
              {isExpanded && (
                <div className="px-3 pb-2 space-y-1">
                  {components.map(component => {
                    const isEnabled = config.enabledComponents.has(component.metadata.id);
                    return (
                      <div
                        key={component.metadata.id}
                        className="flex items-start gap-2 p-2 rounded hover:bg-gray-800 transition-colors group"
                      >
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => toggleComponent(component.metadata.id)}
                          className="mt-1 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-300">
                            {component.metadata.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {component.metadata.description}
                          </div>
                          <div className="text-xs text-blue-400 mt-1 italic opacity-0 group-hover:opacity-100 transition-opacity">
                            💡 {component.metadata.realWorldAnalogy}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ComponentConfig;
