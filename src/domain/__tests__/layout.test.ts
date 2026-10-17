import { describe, expect, it } from 'vitest';
import { calculateGenerations, computePedigreeLayout, toRomanNumeral } from '../../layout/engine';
import { CLINICAL_DEMO_PROJECT } from '../samples';
import { FamilyProject } from '../types';

describe('Layout Engine', () => {
  it('converte corretamente números arábicos para romanos', () => {
    expect(toRomanNumeral(1)).toBe('I');
    expect(toRomanNumeral(2)).toBe('II');
    expect(toRomanNumeral(3)).toBe('III');
    expect(toRomanNumeral(4)).toBe('IV');
    expect(toRomanNumeral(5)).toBe('V');
  });

  it('calcula níveis de geração topológicos com precisão', () => {
    const genMap = calculateGenerations(CLINICAL_DEMO_PROJECT);

    // Avós na Geração 1
    expect(genMap.get('p-i1')).toBe(1);
    expect(genMap.get('p-i2')).toBe(1);
    expect(genMap.get('p-i3')).toBe(1);
    expect(genMap.get('p-i4')).toBe(1);

    // Pais e Tios na Geração 2
    expect(genMap.get('p-ii1')).toBe(2);
    expect(genMap.get('p-ii2')).toBe(2);
    expect(genMap.get('p-ii3')).toBe(2);
    expect(genMap.get('p-ii4')).toBe(2);

    // Filhos e Probando na Geração 3
    expect(genMap.get('p-iii1')).toBe(3);
    expect(genMap.get('p-iii2')).toBe(3);
    expect(genMap.get('p-iii3')).toBe(3);
    expect(genMap.get('p-iii4')).toBe(3);
  });

  it('computa o layout com nós ordenados e uniões conectadas', () => {
    const layout = computePedigreeLayout(CLINICAL_DEMO_PROJECT);

    expect(layout.nodes.length).toBe(CLINICAL_DEMO_PROJECT.persons.length);
    expect(layout.unions.length).toBe(CLINICAL_DEMO_PROJECT.unions.length);
    expect(layout.generationLevels.length).toBeGreaterThanOrEqual(3);
    expect(layout.bounds.width).toBeGreaterThan(0);
    expect(layout.bounds.height).toBeGreaterThan(0);
  });

  it('centraliza filho único exatamente sob o ponto médio dos pais', () => {
    const testProject: FamilyProject = {
      id: 'test-single-child',
      name: 'Teste Filho Único',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      viewMode: 'GENETIC',
      persons: [
        { id: 'f1', name: 'Pai', sex: 'M', clinicalStatus: 'UNAFFECTED' },
        { id: 'm1', name: 'Mãe', sex: 'F', clinicalStatus: 'UNAFFECTED' },
        { id: 'c1', name: 'Filho', sex: 'M', clinicalStatus: 'UNAFFECTED' },
      ],
      unions: [
        { id: 'u1', partner1Id: 'f1', partner2Id: 'm1', type: 'MARRIAGE' },
      ],
      parentChildRelations: [
        { id: 'r1', childId: 'c1', unionId: 'u1', filiationType: 'BIOLOGICAL' },
      ],
    };

    const layout = computePedigreeLayout(testProject);
    const u1 = layout.unions.find((u) => u.union.id === 'u1')!;
    const c1Node = layout.nodes.find((n) => n.person.id === 'c1')!;

    // O centro do filho deve coincidir exatamente com o midpoint da união dos pais
    const childCenterX = c1Node.x + c1Node.width / 2;
    expect(childCenterX).toBe(u1.midpointX);
  });

  it('processa casamento intergeracional (ex: filho com um dos pais) sem corromper layout', () => {
    const projectWithParentChildUnion: FamilyProject = {
      ...CLINICAL_DEMO_PROJECT,
      unions: [
        ...CLINICAL_DEMO_PROJECT.unions,
        {
          id: 'u-parent-child',
          partner1Id: 'p-ii2', // Roberto (Geração 2)
          partner2Id: 'p-iii1', // Guilherme (Geração 3, filho de Roberto)
          type: 'MARRIAGE',
          isConsanguineous: true,
        },
      ],
    };

    const layout = computePedigreeLayout(projectWithParentChildUnion);
    expect(layout.nodes.length).toBe(CLINICAL_DEMO_PROJECT.persons.length);
    const uIncest = layout.unions.find((u) => u.union.id === 'u-parent-child');
    expect(uIncest).toBeDefined();
    expect(uIncest?.partner1Node).toBeDefined();
    expect(uIncest?.partner2Node).toBeDefined();
  });
});
