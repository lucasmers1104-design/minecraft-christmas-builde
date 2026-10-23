import { describe, expect, it } from 'vitest';
import { AIR, blockState, checkBlockState, propsOf } from '@/core/blocks/registry';
import { PaletteGrid, resolveStates } from '@/core/blocks/stateResolver';
import { validateAndRepair } from '@/core/blocks/validator';

/** Ground blocks added for the landscape (research 15, "Registry-Lücken"): gravel and podzol. */

describe('Landschaft: neue Bodenblöcke (Kies, Podsol)', () => {
  it('Kies und Podsol gibt es in beiden Profilen; Podsol trägt snowy wie Gras', () => {
    for (const version of ['1.21.11', '1.21.1']) {
      expect(checkBlockState('minecraft:gravel', version).ok).toBe(true);
      expect(checkBlockState('minecraft:podzol[snowy=false]', version).ok).toBe(true);
    }
    const g = new PaletteGrid({ width: 1, height: 2, length: 1 }, [AIR], new Uint16Array(2));
    g.set(0, 0, 0, blockState('podzol'));
    g.set(0, 1, 0, blockState('snow', { layers: '1' }));
    resolveStates(g);
    expect(propsOf(g.get(0, 0, 0)).snowy).toBe('true');
  });

  it('Kies ohne festen Block darunter würde fallen und wird repariert, auf dem Boden und auf Stein nicht', () => {
    const g = new PaletteGrid({ width: 3, height: 3, length: 1 }, [AIR], new Uint16Array(9));
    g.set(0, 0, 0, blockState('gravel'));
    g.set(1, 0, 0, blockState('stone'));
    g.set(1, 1, 0, blockState('gravel'));
    g.set(2, 2, 0, blockState('gravel'));
    const repairs = validateAndRepair(g, '1.21.11');
    expect(repairs.map((r) => [r.x, r.y])).toEqual([[2, 2]]);
    expect(g.get(0, 0, 0)).toBe('minecraft:gravel');
  });
});
