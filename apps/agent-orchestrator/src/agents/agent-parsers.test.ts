import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCadenceResponse, parseQualificationResponse } from './agent-parsers.js';

test('parseQualificationResponse normaliza score e tier', () => {
  const parsed = parseQualificationResponse('{"icpScore": 150, "icpTier":"X", "reasoning":"ok"}');
  assert.equal(parsed.icpScore, 100);
  assert.equal(parsed.icpTier, 'T1');
});

test('parseQualificationResponse suporta markdown fenced json', () => {
  const parsed = parseQualificationResponse('```json\n{"icpScore": 20, "icpTier":"T3", "reasoning":"baixo fit"}\n```');
  assert.equal(parsed.icpScore, 20);
  assert.equal(parsed.icpTier, 'T3');
});

test('parseCadenceResponse retorna fallback para payload inválido', () => {
  const parsed = parseCadenceResponse('conteudo sem json');
  assert.equal(parsed.length, 4);
  assert.equal(parsed[0]?.day, 0);
  assert.equal(parsed[3]?.channel, 'call');
});

test('parseCadenceResponse normaliza lista incompleta', () => {
  const parsed = parseCadenceResponse('[{"day":1,"channel":"email","subject":"s","body":"b"}]');
  assert.equal(parsed.length, 4);
  assert.equal(parsed[0]?.day, 1);
  assert.equal(parsed[1]?.day, 2);
});
