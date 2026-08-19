import {
  parseAgriAdvice,
  normalizeRecommendation,
  normalizePriority,
  formatAgriReply,
  askAgriExpert,
} from '../lib/agri-ai';

describe('normalizePriority', () => {
  it('passes through valid priorities', () => {
    expect(normalizePriority('high')).toBe('high');
    expect(normalizePriority('medium')).toBe('medium');
    expect(normalizePriority('low')).toBe('low');
  });

  it('defaults unknown/missing priorities to medium', () => {
    expect(normalizePriority('urgent')).toBe('medium');
    expect(normalizePriority(undefined)).toBe('medium');
    expect(normalizePriority(null)).toBe('medium');
    expect(normalizePriority(3)).toBe('medium');
  });
});

describe('normalizeRecommendation', () => {
  it('normalizes a well-formed recommendation', () => {
    expect(
      normalizeRecommendation({ action: 'Weed the field', reason: 'Critical window', priority: 'high', confidence: 0.9 })
    ).toEqual({ action: 'Weed the field', reason: 'Critical window', priority: 'high', confidence: 0.9 });
  });

  it('fills in safe defaults for missing/malformed fields', () => {
    expect(normalizeRecommendation({})).toEqual({ action: '', reason: '', priority: 'medium', confidence: 0.5 });
    expect(normalizeRecommendation(null)).toEqual({ action: '', reason: '', priority: 'medium', confidence: 0.5 });
  });

  it('clamps out-of-range confidence into [0, 1]', () => {
    expect(normalizeRecommendation({ confidence: 5 }).confidence).toBe(1);
    expect(normalizeRecommendation({ confidence: -2 }).confidence).toBe(0);
  });
});

describe('parseAgriAdvice', () => {
  it('parses a well-formed rag-chat response', () => {
    const advice = parseAgriAdvice({
      answer: 'Scout weekly for fall armyworm.',
      recommendations: [{ action: 'Scout', reason: 'Early detection', priority: 'high', confidence: 0.8 }],
      risks: ['Delayed action can allow infestation to spread'],
      missing_information: [],
      sources: [{ title: 'Maize — fall armyworm', category: 'crop_disease' }],
      disclaimer: 'General guidance only.',
      requiresProfessionalConfirmation: false,
      hasKnowledge: true,
    });
    expect(advice.answer).toBe('Scout weekly for fall armyworm.');
    expect(advice.recommendations).toHaveLength(1);
    expect(advice.sources).toEqual([{ title: 'Maize — fall armyworm', category: 'crop_disease' }]);
    expect(advice.hasKnowledge).toBe(true);
  });

  it('never throws on malformed/missing fields — degrades to safe empty values', () => {
    expect(() => parseAgriAdvice({})).not.toThrow();
    expect(() => parseAgriAdvice(null)).not.toThrow();
    expect(() => parseAgriAdvice(undefined)).not.toThrow();

    const advice = parseAgriAdvice({ answer: 42, recommendations: 'not an array', sources: null });
    expect(advice.answer).toBe('');
    expect(advice.recommendations).toEqual([]);
    expect(advice.sources).toEqual([]);
    expect(advice.requiresProfessionalConfirmation).toBe(false);
  });

  it('filters out malformed entries in risks/missing_information/sources rather than crashing', () => {
    const advice = parseAgriAdvice({
      risks: ['real risk', 42, null],
      missing_information: [123, 'real gap'],
      sources: [{ title: 'Real source', category: 'x' }, { title: 5 }, null],
    });
    expect(advice.risks).toEqual(['real risk']);
    expect(advice.missingInformation).toEqual(['real gap']);
    expect(advice.sources).toEqual([{ title: 'Real source', category: 'x' }]);
  });
});

describe('formatAgriReply', () => {
  const base = {
    answer: 'Apply mulch to conserve moisture.',
    recommendations: [],
    risks: [],
    missingInformation: [],
    sources: [],
    disclaimer: 'General guidance; confirm with your local extension officer.',
    requiresProfessionalConfirmation: false,
    hasKnowledge: true,
  };

  it('includes the answer and disclaimer', () => {
    const reply = formatAgriReply(base, 'en');
    expect(reply).toContain('Apply mulch to conserve moisture.');
    expect(reply).toContain('confirm with your local extension officer');
  });

  it('surfaces a professional-confirmation warning for chemical topics', () => {
    const reply = formatAgriReply({ ...base, requiresProfessionalConfirmation: true }, 'en');
    expect(reply).toMatch(/agronomist|extension officer/i);
  });

  it('does not fabricate a warning when confirmation is not required', () => {
    const reply = formatAgriReply(base, 'en');
    expect(reply).not.toContain('⚠️');
  });

  it('lists real source titles when present', () => {
    const reply = formatAgriReply(
      { ...base, sources: [{ title: 'Maize — common rust', category: 'crop_disease' }] },
      'en'
    );
    expect(reply).toContain('Maize — common rust');
  });

  it('renders Swahili copy for the professional-confirmation warning', () => {
    const reply = formatAgriReply({ ...base, requiresProfessionalConfirmation: true }, 'sw');
    expect(reply).toMatch(/afisa ugani|mtaalamu/i);
  });
});

describe('askAgriExpert', () => {
  it('throws a not_configured AIError when the backend is unavailable (no network call)', async () => {
    // In this test environment there's no real Supabase config, so
    // aiConfigured() is false — askAgriExpert must fail fast and honestly
    // rather than attempt a call or fabricate a response.
    await expect(askAgriExpert('Mahindi yana ugonjwa gani?')).rejects.toMatchObject({
      kind: 'not_configured',
    });
  });
});
