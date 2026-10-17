import { describe, expect, it } from 'vitest';
import { exportToGedcom, importFromGedcom } from '../gedcom';
import { CLINICAL_DEMO_PROJECT } from '../samples';

describe('GEDCOM 5.5.1 Module', () => {
  it('exporta projeto para formato GEDCOM 5.5.1 válido', () => {
    const gedcom = exportToGedcom(CLINICAL_DEMO_PROJECT);

    expect(gedcom).toContain('0 HEAD');
    expect(gedcom).toContain('1 GEDC');
    expect(gedcom).toContain('2 VERS 5.5.1');
    expect(gedcom).toContain('0 TRLR');

    // Verifica presença de indivíduos e famílias no formato GEDCOM com barras de sobrenome
    expect(gedcom).toContain('INDI');
    expect(gedcom).toContain('FAM');
    expect(gedcom).toContain('Alberto /Santos/');
    expect(gedcom).toContain('Sofia Santos');
  });

  it('importa arquivo GEDCOM e preserva indivíduos e uniões', () => {
    const originalGedcom = exportToGedcom(CLINICAL_DEMO_PROJECT);
    const importedProject = importFromGedcom(originalGedcom);

    expect(importedProject.persons.length).toBe(CLINICAL_DEMO_PROJECT.persons.length);
    expect(importedProject.unions.length).toBe(CLINICAL_DEMO_PROJECT.unions.length);

    const sofia = importedProject.persons.find((p) => p.name.includes('Sofia'));
    expect(sofia).toBeDefined();
    expect(sofia?.sex).toBe('F');
    expect(sofia?.clinicalStatus).toBe('AFFECTED');
    expect(sofia?.isProband).toBe(true);
  });
});
