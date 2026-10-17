import { describe, expect, it } from 'vitest';
import { FamilyProject } from '../types';
import { validateFamilyProject, wouldCreateCycle } from '../validation';

describe('Domain Validation Rules', () => {
  it('detecta tentativa de união consigo mesmo', () => {
    const project: FamilyProject = {
      id: 'test-self-union',
      name: 'Teste Auto-União',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      viewMode: 'GENETIC',
      persons: [
        { id: 'p1', name: 'Pessoa 1', sex: 'M', clinicalStatus: 'UNAFFECTED' },
      ],
      unions: [
        { id: 'u1', partner1Id: 'p1', partner2Id: 'p1', type: 'MARRIAGE' },
      ],
      parentChildRelations: [],
    };

    const report = validateFamilyProject(project);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.id.includes('self-union'))).toBe(true);
  });

  it('detecta ciclo de ancestralidade (avô não pode ser filho do neto)', () => {
    const project: FamilyProject = {
      id: 'test-cycle',
      name: 'Teste Ciclo',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      viewMode: 'GENETIC',
      persons: [
        { id: 'p1', name: 'Pai', sex: 'M', clinicalStatus: 'UNAFFECTED' },
        { id: 'p2', name: 'Filho', sex: 'M', clinicalStatus: 'UNAFFECTED' },
      ],
      unions: [],
      parentChildRelations: [
        // p1 é pai de p2
        { id: 'rel-1', childId: 'p2', parentId: 'p1', filiationType: 'BIOLOGICAL' },
      ],
    };

    // Tentar fazer p1 ser filho de p2 geraria ciclo
    const createsCycle = wouldCreateCycle('p1', 'p2', project);
    expect(createsCycle).toBe(true);

    // Adiciona o ciclo e valida relatório
    project.parentChildRelations.push({
      id: 'rel-2',
      childId: 'p1',
      parentId: 'p2',
      filiationType: 'BIOLOGICAL',
    });

    const report = validateFamilyProject(project);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.id.includes('cycle'))).toBe(true);
  });

  it('detecta incoerência cronológica quando filho nasce antes do pai', () => {
    const project: FamilyProject = {
      id: 'test-dates',
      name: 'Teste Datas',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      viewMode: 'GENETIC',
      persons: [
        { id: 'p1', name: 'Pai', sex: 'M', birthDate: '1980-05-10', clinicalStatus: 'UNAFFECTED' },
        { id: 'p2', name: 'Filho', sex: 'M', birthDate: '1975-02-14', clinicalStatus: 'UNAFFECTED' },
      ],
      unions: [],
      parentChildRelations: [
        { id: 'rel-1', childId: 'p2', parentId: 'p1', filiationType: 'BIOLOGICAL' },
      ],
    };

    const report = validateFamilyProject(project);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.id.includes('child-before-parent'))).toBe(true);
  });
});
