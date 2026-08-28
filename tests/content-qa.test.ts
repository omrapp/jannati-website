import { describe, expect, it } from 'vitest';

import { parseQaPairs } from '@/lib/content/qa';

describe('parseQaPairs', () => {
  it('pairs alternating heading/answer blocks', () => {
    const body = 'Question one?\nAnswer one.\n\nQuestion two?\nAnswer two.';
    expect(parseQaPairs(body)).toEqual([
      { question: 'Question one?\nAnswer one.', answer: 'Question two?\nAnswer two.' },
    ]);
  });

  it('treats a single blank line as the block separator', () => {
    const body = 'Coverage\n\nWe ship everywhere.\n\nShipping costs\n\nCosts vary.';
    expect(parseQaPairs(body)).toEqual([
      { question: 'Coverage', answer: 'We ship everywhere.' },
      { question: 'Shipping costs', answer: 'Costs vary.' },
    ]);
  });

  it('collapses multiple consecutive blank lines into one separator', () => {
    const body = 'Q1\n\n\n\nA1';
    expect(parseQaPairs(body)).toEqual([{ question: 'Q1', answer: 'A1' }]);
  });

  it('keeps single newlines inside an answer block intact', () => {
    const body = 'Shipping costs\n\nOman — fast.\nUAE — slower.\nDelivery estimates apply.';
    expect(parseQaPairs(body)).toEqual([
      { question: 'Shipping costs', answer: 'Oman — fast.\nUAE — slower.\nDelivery estimates apply.' },
    ]);
  });

  it('drops a trailing unpaired block', () => {
    const body = 'Q1\n\nA1\n\nDangling heading with no answer yet';
    expect(parseQaPairs(body)).toEqual([{ question: 'Q1', answer: 'A1' }]);
  });

  it('returns an empty array for an empty body', () => {
    expect(parseQaPairs('')).toEqual([]);
  });

  it('ignores leading/trailing whitespace on the whole body and on each block', () => {
    const body = '\n\n  Q1  \n\n  A1  \n\n';
    expect(parseQaPairs(body)).toEqual([{ question: 'Q1', answer: 'A1' }]);
  });
});
