import { describe, it, expect } from 'vitest';
import { generateSchema } from '../../../lib/sales-os/schemas';

describe('Sales OS API Validation', () => {
  it('should accept valid requests', () => {
    const result = generateSchema.safeParse({
        prompt: 'Test prompt',
        systemInstruction: 'Act as a tester'
    });
    expect(result.success).toBe(true);
  });

  it('should reject requests missing prompt', () => {
    const result = generateSchema.safeParse({
        systemInstruction: 'Act as a tester'
    });
    expect(result.success).toBe(false);
  });

  it('should allow optional systemInstruction', () => {
    const result = generateSchema.safeParse({
        prompt: 'Test prompt'
    });
    expect(result.success).toBe(true);
  });
});
