const ruleComponents = [
  {
    id: 'shuffle',
    category: 'deck_setup',
    name: 'Shuffle Deck',
    description: 'Randomize card order',
    enforcement: 'system',
    icon: '🔀',
    config_schema: {
      when: {
        type: 'select',
        label: 'When to Shuffle',
        options: [
          { value: 'game_start', label: 'Game Start' },
          { value: 'deck_empty', label: 'Deck Empty' },
        ],
        default: 'game_start',
      },
    },
  },
  {
    id: 'deal_cards',
    category: 'deck_setup',
    name: 'Deal Starting Cards',
    description: 'Give cards to players at start',
    enforcement: 'system',
    icon: '🎴',
    config_schema: {
      cards_per_player: {
        type: 'number',
        label: 'Cards Per Player',
        min: 0,
        max: 20,
        default: 5,
      },
    },
  },
  {
    id: 'draw_on_turn',
    category: 'draw',
    name: 'Draw Cards Each Turn',
    description: 'Players draw cards during their turn',
    enforcement: 'system',
    icon: '🎯',
    config_schema: {
      cards_to_draw: {
        type: 'number',
        label: 'Cards to Draw',
        min: 0,
        max: 10,
        default: 1,
      },
      when: {
        type: 'select',
        label: 'When to Draw',
        options: [
          { value: 'turn_start', label: 'Turn Start' },
          { value: 'turn_end', label: 'Turn End' },
        ],
        default: 'turn_start',
      },
    },
  },
  {
    id: 'hand_limit',
    category: 'hand',
    name: 'Hand Size Limit',
    description: 'Maximum cards in hand',
    enforcement: 'system',
    icon: '✋',
    config_schema: {
      max_cards: {
        type: 'number',
        label: 'Max Cards',
        min: 1,
        max: 20,
        default: 7,
      },
      on_exceed: {
        type: 'select',
        label: 'On Exceed',
        options: [
          { value: 'block_draw', label: 'Block Draw' },
          { value: 'discard_random', label: 'Discard Random' },
          { value: 'discard_choice', label: 'Discard Choice' },
        ],
        default: 'discard_choice',
      },
    },
  },
  {
    id: 'play_limit',
    category: 'play',
    name: 'Card Play Limit',
    description: 'Max cards playable per turn',
    enforcement: 'system',
    icon: '🚫',
    config_schema: {
      max_per_turn: {
        type: 'number',
        label: 'Max Per Turn',
        min: 0,
        max: 20,
        default: 1,
      },
    },
  },
  {
    id: 'turn_order',
    category: 'play',
    name: 'Turn Order',
    description: 'Who goes next',
    enforcement: 'system',
    icon: '🔄',
    config_schema: {
      order_type: {
        type: 'select',
        label: 'Order Type',
        options: [
          { value: 'clockwise', label: 'Clockwise' },
          { value: 'counterclockwise', label: 'Counterclockwise' },
          { value: 'random', label: 'Random' },
        ],
        default: 'clockwise',
      },
    },
  },
  {
    id: 'turn_timer',
    category: 'timing',
    name: 'Turn Timer',
    description: 'Time limit per turn',
    enforcement: 'system',
    icon: '⏱️',
    config_schema: {
      seconds: {
        type: 'number',
        label: 'Seconds',
        min: 10,
        max: 300,
        default: 60,
      },
      on_timeout: {
        type: 'select',
        label: 'On Timeout',
        options: [
          { value: 'end_turn', label: 'End Turn' },
          { value: 'skip_turn', label: 'Skip Turn' },
        ],
        default: 'end_turn',
      },
    },
  },
  {
    id: 'round_limit',
    category: 'timing',
    name: 'Round Limit',
    description: 'Game ends after X rounds',
    enforcement: 'system',
    icon: '🔢',
    config_schema: {
      max_rounds: {
        type: 'number',
        label: 'Max Rounds',
        min: 1,
        max: 100,
        default: 10,
      },
    },
  },
  {
    id: 'win_by_points',
    category: 'win_condition',
    name: 'Win by Points',
    description: 'First to reach target wins',
    enforcement: 'system',
    icon: '🏆',
    config_schema: {
      target_points: {
        type: 'number',
        label: 'Target Points',
        min: 1,
        max: 1000,
        default: 20,
      },
    },
  },
  {
    id: 'custom_rule',
    category: 'custom',
    name: 'Custom Rule',
    description: 'Write your own rule (players enforce)',
    enforcement: 'players',
    icon: '✏️',
    config_schema: {
      rule_text: {
        type: 'textarea',
        label: 'Rule Text',
        placeholder: 'Describe your rule in detail...',
        rows: 4,
      },
    },
  },
];

module.exports = { ruleComponents };
