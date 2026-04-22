import type { EngineConfig } from '../../types';

/**
 * Predefined engine configurations for different playing styles
 */

export const PRESET_SIMPLE: EngineConfig = {
  name: 'Simple',
  depth: 2,
  enabledComponents: new Set([
    'material',
  ]),
};

export const PRESET_BASIC: EngineConfig = {
  name: 'Basic',
  depth: 2,
  enabledComponents: new Set([
    'material',
    'pst',
  ]),
};

export const PRESET_POSITIONAL: EngineConfig = {
  name: 'Positional',
  depth: 5,
  enabledComponents: new Set([
    'material',
    'pst',
    'castling-rights',
    'center-control',
    'passed-pawns',
    'doubled-pawns',
    'isolated-pawns',
    'bishop-pair',
    'knight-outposts',
    'rook-open-file',
  ]),
};

export const PRESET_TACTICAL: EngineConfig = {
  name: 'Tactical',
  depth: 5,
  enabledComponents: new Set([
    'material',
    'pst',
    'check-penalty',
    'castling-rights',
    'piece-mobility',
    // Tactical components to be added
  ]),
};

export const PRESET_EXPERT: EngineConfig = {
  name: 'Expert',
  depth: 5,
  enabledComponents: new Set([
    'material',
    'pst',
    'castling-rights',
    'check-penalty',
    'center-control',
    'piece-mobility',
    'passed-pawns',
    'doubled-pawns',
    'isolated-pawns',
    'bishop-pair',
    'knight-outposts',
    'rook-open-file',
  ]),
};

export const ALL_PRESETS = [
  PRESET_SIMPLE,
  PRESET_BASIC,
  PRESET_POSITIONAL,
  PRESET_TACTICAL,
  PRESET_EXPERT,
];

/**
 * Clone a configuration for customization
 */
export function cloneConfig(config: EngineConfig): EngineConfig {
  return {
    name: config.name + ' (Custom)',
    depth: config.depth,
    enabledComponents: new Set(config.enabledComponents),
  };
}

/**
 * Create a custom configuration
 */
export function createCustomConfig(
  name: string,
  depth: number,
  enabledComponents: string[]
): EngineConfig {
  return {
    name,
    depth,
    enabledComponents: new Set(enabledComponents),
  };
}
