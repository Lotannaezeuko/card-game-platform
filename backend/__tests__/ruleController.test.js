const db = require('../db');
const {
  getComponents,
  getRulesByDeck,
  createRule,
  updateRule,
  deleteRule,
} = require('../controllers/ruleController');

jest.mock('../db');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('getComponents', () => {
  it('should return all components when no category filter', () => {
    const req = { query: {} };
    const res = mockRes();

    getComponents(req, res);

    const result = res.json.mock.calls[0][0];
    expect(result.components).toHaveLength(10);
    expect(result.category).toBeUndefined();
  });

  it('should filter components by category', () => {
    const req = { query: { category: 'deck_setup' } };
    const res = mockRes();

    getComponents(req, res);

    const result = res.json.mock.calls[0][0];
    expect(result.components).toHaveLength(2);
    expect(result.category).toBe('deck_setup');
    expect(result.components.every((c) => c.category === 'deck_setup')).toBe(true);
  });

  it('should return empty array for unknown category', () => {
    const req = { query: { category: 'nonexistent' } };
    const res = mockRes();

    getComponents(req, res);

    const result = res.json.mock.calls[0][0];
    expect(result.components).toHaveLength(0);
    expect(result.category).toBe('nonexistent');
  });

  it('should return timing category components', () => {
    const req = { query: { category: 'timing' } };
    const res = mockRes();

    getComponents(req, res);

    const result = res.json.mock.calls[0][0];
    expect(result.components).toHaveLength(2);
    const ids = result.components.map((c) => c.id);
    expect(ids).toContain('turn_timer');
    expect(ids).toContain('round_limit');
  });

  it('should include the custom_rule component with players enforcement', () => {
    const req = { query: { category: 'custom' } };
    const res = mockRes();

    getComponents(req, res);

    const result = res.json.mock.calls[0][0];
    expect(result.components).toHaveLength(1);
    expect(result.components[0].id).toBe('custom_rule');
    expect(result.components[0].enforcement).toBe('players');
  });
});

describe('getRulesByDeck', () => {
  it('should return rules for a public deck', async () => {
    const rules = [{ rule_id: 1, rule_name: 'Shuffle', rule_type: 'shuffle' }];
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 2, is_public: true }] })
      .mockResolvedValueOnce({ rows: rules });

    const req = { params: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await getRulesByDeck(req, res);

    expect(res.json).toHaveBeenCalledWith({ rules });
  });

  it('should return rules for own private deck', async () => {
    const rules = [{ rule_id: 1 }];
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1, is_public: false }] })
      .mockResolvedValueOnce({ rows: rules });

    const req = { params: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await getRulesByDeck(req, res);

    expect(res.json).toHaveBeenCalledWith({ rules });
  });

  it('should return 404 if deck not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { deck_id: 999 }, user: { userId: 1 } };
    const res = mockRes();

    await getRulesByDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Deck not found' });
  });

  it('should return 403 for private deck of another user', async () => {
    db.query.mockResolvedValue({ rows: [{ user_id: 2, is_public: false }] });

    const req = { params: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await getRulesByDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. This deck is private.' });
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await getRulesByDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('createRule', () => {
  it('should return 400 if component_id is missing', async () => {
    const req = { params: { deck_id: 1 }, body: { rule_config: {} }, user: { userId: 1 } };
    const res = mockRes();

    await createRule(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Component ID is required' });
  });

  it('should return 400 if rule_config is missing', async () => {
    const req = { params: { deck_id: 1 }, body: { component_id: 'shuffle' }, user: { userId: 1 } };
    const res = mockRes();

    await createRule(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Rule config is required and must be an object' });
  });

  it('should return 400 for unknown component', async () => {
    const req = {
      params: { deck_id: 1 },
      body: { component_id: 'unknown', rule_config: {} },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createRule(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unknown component: unknown' });
  });

  it('should return 400 for invalid number config (below min)', async () => {
    const req = {
      params: { deck_id: 1 },
      body: {
        component_id: 'deal_cards',
        rule_config: { cards_per_player: -1 },
      },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createRule(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toContain('at least 0');
  });

  it('should return 400 for invalid number config (above max)', async () => {
    const req = {
      params: { deck_id: 1 },
      body: {
        component_id: 'deal_cards',
        rule_config: { cards_per_player: 99 },
      },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createRule(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toContain('at most 20');
  });

  it('should return 400 for invalid select config', async () => {
    const req = {
      params: { deck_id: 1 },
      body: {
        component_id: 'shuffle',
        rule_config: { when: 'invalid_option' },
      },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createRule(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toContain('must be one of');
  });

  it('should return 400 for missing required number field', async () => {
    const req = {
      params: { deck_id: 1 },
      body: {
        component_id: 'deal_cards',
        rule_config: {},
      },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createRule(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toContain('is required');
  });

  it('should return 404 if deck not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = {
      params: { deck_id: 999 },
      body: {
        component_id: 'shuffle',
        rule_config: { when: 'game_start' },
      },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createRule(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Deck not found' });
  });

  it('should return 403 if user does not own the deck', async () => {
    db.query.mockResolvedValue({ rows: [{ user_id: 2 }] });

    const req = {
      params: { deck_id: 1 },
      body: {
        component_id: 'shuffle',
        rule_config: { when: 'game_start' },
      },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createRule(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should create rule successfully with default name', async () => {
    const createdRule = { rule_id: 1, rule_name: 'Shuffle Deck', rule_type: 'shuffle' };
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [createdRule] });

    const req = {
      params: { deck_id: 1 },
      body: {
        component_id: 'shuffle',
        rule_config: { when: 'game_start' },
      },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createRule(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ rule: createdRule });
    // Verify the default name was used
    const insertParams = db.query.mock.calls[1][1];
    expect(insertParams[1]).toBe('Shuffle Deck');
  });

  it('should create rule with custom name', async () => {
    const createdRule = { rule_id: 1, rule_name: 'My Shuffle', rule_type: 'shuffle' };
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [createdRule] });

    const req = {
      params: { deck_id: 1 },
      body: {
        component_id: 'shuffle',
        rule_config: { when: 'game_start' },
        rule_name: 'My Shuffle',
      },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createRule(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const insertParams = db.query.mock.calls[1][1];
    expect(insertParams[1]).toBe('My Shuffle');
  });

  it('should create rule with multiple config fields', async () => {
    const createdRule = { rule_id: 1, rule_type: 'hand_limit' };
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [createdRule] });

    const req = {
      params: { deck_id: 1 },
      body: {
        component_id: 'hand_limit',
        rule_config: { max_cards: 10, on_exceed: 'block_draw' },
      },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createRule(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = {
      params: { deck_id: 1 },
      body: {
        component_id: 'shuffle',
        rule_config: { when: 'game_start' },
      },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createRule(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('updateRule', () => {
  it('should return 404 if rule not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { rule_id: 999 }, body: { rule_config: { when: 'game_start' } }, user: { userId: 1 } };
    const res = mockRes();

    await updateRule(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Rule not found' });
  });

  it('should return 403 if user does not own the deck', async () => {
    db.query.mockResolvedValue({
      rows: [{ rule_id: 1, rule_type: 'shuffle', rule_config: {}, rule_name: 'Shuffle', user_id: 2 }],
    });

    const req = { params: { rule_id: 1 }, body: { rule_config: { when: 'game_start' } }, user: { userId: 1 } };
    const res = mockRes();

    await updateRule(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 400 for invalid config', async () => {
    db.query.mockResolvedValue({
      rows: [{ rule_id: 1, rule_type: 'shuffle', rule_config: {}, rule_name: 'Shuffle', user_id: 1 }],
    });

    const req = {
      params: { rule_id: 1 },
      body: { rule_config: { when: 'bad_value' } },
      user: { userId: 1 },
    };
    const res = mockRes();

    await updateRule(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toContain('must be one of');
  });

  it('should update rule successfully', async () => {
    const updatedRule = { rule_id: 1, rule_type: 'shuffle', rule_config: { when: 'deck_empty' } };
    db.query
      .mockResolvedValueOnce({
        rows: [{ rule_id: 1, rule_type: 'shuffle', rule_config: { when: 'game_start' }, rule_name: 'Shuffle', user_id: 1 }],
      })
      .mockResolvedValueOnce({ rows: [updatedRule] });

    const req = {
      params: { rule_id: 1 },
      body: { rule_config: { when: 'deck_empty' } },
      user: { userId: 1 },
    };
    const res = mockRes();

    await updateRule(req, res);

    expect(res.json).toHaveBeenCalledWith({ rule: updatedRule });
  });

  it('should update rule name only', async () => {
    const updatedRule = { rule_id: 1, rule_name: 'New Name' };
    db.query
      .mockResolvedValueOnce({
        rows: [{ rule_id: 1, rule_type: 'shuffle', rule_config: { when: 'game_start' }, rule_name: 'Old Name', user_id: 1 }],
      })
      .mockResolvedValueOnce({ rows: [updatedRule] });

    const req = {
      params: { rule_id: 1 },
      body: { rule_name: 'New Name' },
      user: { userId: 1 },
    };
    const res = mockRes();

    await updateRule(req, res);

    expect(res.json).toHaveBeenCalledWith({ rule: updatedRule });
    const updateParams = db.query.mock.calls[1][1];
    expect(updateParams[1]).toBe('New Name');
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { rule_id: 1 }, body: { rule_config: { when: 'game_start' } }, user: { userId: 1 } };
    const res = mockRes();

    await updateRule(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('deleteRule', () => {
  it('should return 404 if rule not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { rule_id: 999 }, user: { userId: 1 } };
    const res = mockRes();

    await deleteRule(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Rule not found' });
  });

  it('should return 403 if user does not own the deck', async () => {
    db.query.mockResolvedValue({
      rows: [{ rule_id: 1, user_id: 2 }],
    });

    const req = { params: { rule_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await deleteRule(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should delete rule successfully', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ rule_id: 1, user_id: 1 }] })
      .mockResolvedValueOnce({});

    const req = { params: { rule_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await deleteRule(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Rule deleted successfully' });
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { rule_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await deleteRule(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
