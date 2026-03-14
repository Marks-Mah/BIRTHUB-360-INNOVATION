import { describe, it, expect } from 'vitest';
import { TOOLS } from '../constants';

describe('Sales OS Constants', () => {
  it('should have unique IDs for all tools', () => {
    const ids = TOOLS.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should have required fields for List Builder tool', () => {
    const tool = TOOLS.find(t => t.id === 'ldr_list');
    expect(tool).toBeDefined();
    const fieldIds = tool?.fields?.map(f => f.id);
    expect(fieldIds).toContain('employees');
    expect(fieldIds).toContain('funding');
  });

  it('should have required fields for Cold Call Sim tool', () => {
    const tool = TOOLS.find(t => t.id === 'sdr_coldcall');
    expect(tool).toBeDefined();
    const fieldIds = tool?.fields?.map(f => f.id);
    expect(fieldIds).toContain('rebuttal');
  });
});
