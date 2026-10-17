/**
 * Módulo de Validação e Integridade de Domínio
 * Garante ausência de ciclos de ancestralidade, coerência cronológica de datas
 * e impede relações biologicamente ou logicamente impossíveis.
 */

import { FamilyProject, ParentChildRelation, Person, UnionRelation, ValidationError, ValidationReport } from './types';

/**
 * Converte string de data para objeto Date seguro (suporta formatos YYYY, YYYY-MM, YYYY-MM-DD)
 */
export function parseDateSafe(dateStr?: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const parts = dateStr.trim().split('-');
  const year = parseInt(parts[0], 10);
  if (isNaN(year) || year < 0 || year > 3000) return null;
  const month = parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0;
  const day = parts.length > 2 ? parseInt(parts[2], 10) : 1;
  return new Date(year, month, day);
}

/**
 * Obtém os IDs dos progenitores de uma pessoa com base nas relações
 */
export function getParentsOfPerson(personId: string, project: FamilyProject): string[] {
  const parentIds = new Set<string>();
  const filiations = project.parentChildRelations.filter((r) => r.childId === personId);

  for (const rel of filiations) {
    if (rel.parentId) {
      parentIds.add(rel.parentId);
    }
    if (rel.unionId) {
      const union = project.unions.find((u) => u.id === rel.unionId);
      if (union) {
        parentIds.add(union.partner1Id);
        parentIds.add(union.partner2Id);
      }
    }
  }

  return Array.from(parentIds);
}

/**
 * Obtém todos os ancestrais de uma pessoa (pais, avós, bisavós...)
 */
export function getAllAncestors(personId: string, project: FamilyProject): Set<string> {
  const ancestors = new Set<string>();
  const queue: string[] = [personId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const parents = getParentsOfPerson(current, project);
    for (const p of parents) {
      if (!ancestors.has(p)) {
        ancestors.add(p);
        queue.push(p);
      }
    }
  }

  return ancestors;
}

/**
 * Obtém todos os filhos diretos de uma pessoa
 */
export function getDirectChildren(personId: string, project: FamilyProject): string[] {
  const children = new Set<string>();

  // Filiações diretas
  for (const rel of project.parentChildRelations) {
    if (rel.parentId === personId) {
      children.add(rel.childId);
    } else if (rel.unionId) {
      const union = project.unions.find((u) => u.id === rel.unionId);
      if (union && (union.partner1Id === personId || union.partner2Id === personId)) {
        children.add(rel.childId);
      }
    }
  }

  return Array.from(children);
}

/**
 * Obtém todos os descendentes de uma pessoa (filhos, netos, bisnetos...)
 */
export function getAllDescendants(personId: string, project: FamilyProject): Set<string> {
  const descendants = new Set<string>();
  const queue: string[] = [personId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const children = getDirectChildren(current, project);
    for (const c of children) {
      if (!descendants.has(c)) {
        descendants.add(c);
        queue.push(c);
      }
    }
  }

  return descendants;
}

/**
 * Detecta se a adição de um vínculo geraria ciclo de ancestralidade
 */
export function wouldCreateCycle(
  childId: string,
  proposedParentId: string,
  project: FamilyProject
): boolean {
  if (childId === proposedParentId) return true;
  // Se o filho proposto já for ancestral do pai proposto, temos um ciclo
  const ancestorsOfParent = getAllAncestors(proposedParentId, project);
  return ancestorsOfParent.has(childId);
}

/**
 * Validação abrangente de um projeto de heredograma
 */
export function validateFamilyProject(project: FamilyProject): ValidationReport {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const personMap = new Map<string, Person>();
  project.persons.forEach((p) => personMap.set(p.id, p));

  // 1. Validação de uniões
  for (const union of project.unions) {
    if (union.partner1Id === union.partner2Id) {
      errors.push({
        id: `self-union-${union.id}`,
        type: 'ERROR',
        message: `Uma pessoa não pode estabelecer união consigo mesma (${personMap.get(union.partner1Id)?.name || union.partner1Id}).`,
        involvedPersonIds: [union.partner1Id],
      });
    }

    const p1 = personMap.get(union.partner1Id);
    const p2 = personMap.get(union.partner2Id);

    if (union.startDate && (p1 || p2)) {
      const uDate = parseDateSafe(union.startDate);
      if (uDate) {
        if (p1?.birthDate) {
          const p1Birth = parseDateSafe(p1.birthDate);
          if (p1Birth && uDate < p1Birth) {
            warnings.push({
              id: `union-before-birth-${union.id}-p1`,
              type: 'WARNING',
              message: `Data da união (${union.startDate}) é anterior ao nascimento de ${p1.name} (${p1.birthDate}).`,
              involvedPersonIds: [p1.id],
            });
          }
        }
        if (p2?.birthDate) {
          const p2Birth = parseDateSafe(p2.birthDate);
          if (p2Birth && uDate < p2Birth) {
            warnings.push({
              id: `union-before-birth-${union.id}-p2`,
              type: 'WARNING',
              message: `Data da união (${union.startDate}) é anterior ao nascimento de ${p2.name} (${p2.birthDate}).`,
              involvedPersonIds: [p2.id],
            });
          }
        }
      }
    }
  }

  // 2. Validação de ciclos no grafo de filiações
  const adj = new Map<string, string[]>();
  for (const person of project.persons) {
    adj.set(person.id, []);
  }

  for (const rel of project.parentChildRelations) {
    if (rel.parentId) {
      adj.get(rel.parentId)?.push(rel.childId);
    }
    if (rel.unionId) {
      const union = project.unions.find((u) => u.id === rel.unionId);
      if (union) {
        adj.get(union.partner1Id)?.push(rel.childId);
        adj.get(union.partner2Id)?.push(rel.childId);
      }
    }
  }

  // Detecção de ciclos via DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  let hasCycle = false;

  function dfsCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfsCycle(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        hasCycle = true;
        const p1 = personMap.get(nodeId)?.name || nodeId;
        const p2 = personMap.get(neighbor)?.name || neighbor;
        errors.push({
          id: `cycle-${nodeId}-${neighbor}`,
          type: 'ERROR',
          message: `Ciclo de ancestralidade detectado entre ${p1} e ${p2}. Um indivíduo não pode ser ancestral de si mesmo.`,
          involvedPersonIds: [nodeId, neighbor],
        });
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const person of project.persons) {
    if (!visited.has(person.id)) {
      dfsCycle(person.id);
    }
  }

  // 3. Validação de datas individuais e filiação
  for (const person of project.persons) {
    const bDate = parseDateSafe(person.birthDate);
    const dDate = parseDateSafe(person.deathDate);

    // Nascimento após falecimento
    if (bDate && dDate && bDate > dDate) {
      errors.push({
        id: `birth-after-death-${person.id}`,
        type: 'ERROR',
        message: `${person.name} possui data de nascimento (${person.birthDate}) posterior ao falecimento (${person.deathDate}).`,
        involvedPersonIds: [person.id],
      });
    }

    // Coerência com pais
    const parents = getParentsOfPerson(person.id, project);
    for (const parentId of parents) {
      const parent = personMap.get(parentId);
      if (!parent) continue;

      const parentBirth = parseDateSafe(parent.birthDate);
      const parentDeath = parseDateSafe(parent.deathDate);

      if (bDate && parentBirth) {
        // Filho nascido antes dos pais
        if (bDate <= parentBirth) {
          errors.push({
            id: `child-before-parent-${person.id}-${parent.id}`,
            type: 'ERROR',
            message: `${person.name} (${person.birthDate || 's/d'}) nasceu antes ou no mesmo dia que o progenitor ${parent.name} (${parent.birthDate}).`,
            involvedPersonIds: [person.id, parent.id],
          });
        } else {
          // Idade biológica improvável (menos de 12 anos)
          const diffYears = (bDate.getTime() - parentBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
          if (diffYears < 12) {
            warnings.push({
              id: `young-parent-${person.id}-${parent.id}`,
              type: 'WARNING',
              message: `${parent.name} teria apenas ${Math.floor(diffYears)} anos ao nascimento do filho ${person.name}.`,
              involvedPersonIds: [person.id, parent.id],
            });
          }
        }
      }

      // Filho nascido muito após o óbito do progenitor
      if (bDate && parentDeath) {
        const msDiff = bDate.getTime() - parentDeath.getTime();
        const daysDiff = msDiff / (1000 * 60 * 60 * 24);

        if (parent.sex === 'F' && daysDiff > 1) {
          errors.push({
            id: `born-after-mother-death-${person.id}-${parent.id}`,
            type: 'ERROR',
            message: `${person.name} nasceu após a data de falecimento da mãe ${parent.name}.`,
            involvedPersonIds: [person.id, parent.id],
          });
        } else if (parent.sex === 'M' && daysDiff > 305) {
          warnings.push({
            id: `born-after-father-death-${person.id}-${parent.id}`,
            type: 'WARNING',
            message: `${person.name} nasceu mais de 10 meses após o falecimento do pai ${parent.name}.`,
            involvedPersonIds: [person.id, parent.id],
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
