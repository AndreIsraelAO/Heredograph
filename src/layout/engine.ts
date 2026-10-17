/**
 * Motor de Layout Automático para Heredogramas e Genealogia
 * Organiza indivíduos por gerações topológicas (I, II, III),
 * agrupa casais lado a lado e posiciona a prole de forma centralizada.
 */

import {
  FamilyProject,
  LayoutNode,
  LayoutResult,
  LayoutUnion,
  ParentChildRelation,
  Person,
  UnionRelation,
  ViewMode,
} from '../domain/types';
import { getParentsOfPerson } from '../domain/validation';

/**
 * Converte número arábico para numeração romana (I, II, III, IV...)
 */
export function toRomanNumeral(num: number): string {
  if (num <= 0) return 'I';
  const lookup: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let roman = '';
  let n = num;
  for (const [val, sym] of lookup) {
    while (n >= val) {
      roman += sym;
      n -= val;
    }
  }
  return roman || 'I';
}

/**
 * Dimensões dos nós de acordo com o modo de visualização
 */
export function getNodeDimensions(mode: ViewMode) {
  if (mode === 'GENETIC') {
    return {
      width: 48,
      height: 48,
      horizontalSpacing: 125,
      generationHeight: 230,
      unionGap: 110,
    };
  }
  // GENEALOGICAL MODE
  return {
    width: 140,
    height: 80,
    horizontalSpacing: 180,
    generationHeight: 230,
    unionGap: 160,
  };
}

/**
 * Calcula a geração topológica de cada indivíduo no heredograma
 */
export function calculateGenerations(project: FamilyProject): Map<string, number> {
  const genMap = new Map<string, number>();
  const persons = project.persons;
  if (persons.length === 0) return genMap;

  // 1. Inicializa todos com geração 1
  persons.forEach((p) => genMap.set(p.id, 1));

  // 2. Propagação topológica baseada em filiações
  let changed = true;
  let iterations = 0;
  const maxIterations = persons.length * 2 + 5;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    // Ajuste pais -> filhos
    for (const person of persons) {
      const parentIds = getParentsOfPerson(person.id, project);
      if (parentIds.length > 0) {
        let maxParentGen = 0;
        for (const pid of parentIds) {
          const pGen = genMap.get(pid) || 1;
          if (pGen > maxParentGen) maxParentGen = pGen;
        }

        const currentGen = genMap.get(person.id) || 1;
        const targetGen = maxParentGen + 1;
        if (currentGen < targetGen) {
          genMap.set(person.id, targetGen);
          changed = true;
        }
      }
    }

    // Alinhamento de cônjuges (na mesma geração, se viável)
    for (const union of project.unions) {
      const g1 = genMap.get(union.partner1Id) || 1;
      const g2 = genMap.get(union.partner2Id) || 1;

      // Se um dos cônjuges tem pais e o outro não, o sem pais assume a mesma geração
      const p1Parents = getParentsOfPerson(union.partner1Id, project);
      const p2Parents = getParentsOfPerson(union.partner2Id, project);

      if (p1Parents.length > 0 && p2Parents.length === 0 && g2 !== g1) {
        genMap.set(union.partner2Id, g1);
        changed = true;
      } else if (p2Parents.length > 0 && p1Parents.length === 0 && g1 !== g2) {
        genMap.set(union.partner1Id, g2);
        changed = true;
      } else if (g1 !== g2 && p1Parents.length === 0 && p2Parents.length === 0) {
        const maxG = Math.max(g1, g2);
        genMap.set(union.partner1Id, maxG);
        genMap.set(union.partner2Id, maxG);
        changed = true;
      }
    }
  }

  return genMap;
}

/**
 * Executa o cálculo completo do layout do heredograma
 */
export function computePedigreeLayout(project: FamilyProject): LayoutResult {
  const mode = project.viewMode || 'GENETIC';
  const dims = getNodeDimensions(mode);
  const genMap = calculateGenerations(project);

  // Agrupa pessoas por nível de geração
  const generationGroups = new Map<number, Person[]>();
  for (const person of project.persons) {
    const gen = genMap.get(person.id) || 1;
    if (!generationGroups.has(gen)) {
      generationGroups.set(gen, []);
    }
    generationGroups.get(gen)!.push(person);
  }

  // Ordena gerações
  const sortedGenerations = Array.from(generationGroups.keys()).sort((a, b) => a - b);
  const minGen = sortedGenerations.length > 0 ? sortedGenerations[0] : 1;
  const maxGen = sortedGenerations.length > 0 ? sortedGenerations[sortedGenerations.length - 1] : 1;

  // Mapa de uniões para consulta rápida
  const unionMap = new Map<string, UnionRelation>();
  project.unions.forEach((u) => unionMap.set(u.id, u));

  // Estrutura para nós e posições
  const nodeMap = new Map<string, LayoutNode>();
  const nodes: LayoutNode[] = [];
  const startY = 120;
  const startX = 160;

  // Posiciona cada geração
  for (const gen of sortedGenerations) {
    const personsInGen = generationGroups.get(gen) || [];
    const y = startY + (gen - 1) * dims.generationHeight;

    // Identifica casais na mesma geração
    const handledPersons = new Set<string>();
    const orderedUnits: {
      type: 'COUPLE' | 'SINGLE';
      members: Person[];
      union?: UnionRelation;
    }[] = [];

    // Primeiro, agrupa casais
    for (const person of personsInGen) {
      if (handledPersons.has(person.id)) continue;

      const userUnion = project.unions.find(
        (u) =>
          (u.partner1Id === person.id && personsInGen.some((p) => p.id === u.partner2Id)) ||
          (u.partner2Id === person.id && personsInGen.some((p) => p.id === u.partner1Id))
      );

      if (userUnion) {
        const partnerId =
          userUnion.partner1Id === person.id ? userUnion.partner2Id : userUnion.partner1Id;
        const partner = personsInGen.find((p) => p.id === partnerId);

        if (partner && !handledPersons.has(partner.id)) {
          // Mantém preferencialmente M na esquerda e F na direita para convenção médica padrão
          let left = person;
          let right = partner;
          if (person.sex === 'F' && partner.sex === 'M') {
            left = partner;
            right = person;
          }

          orderedUnits.push({
            type: 'COUPLE',
            members: [left, right],
            union: userUnion,
          });
          handledPersons.add(left.id);
          handledPersons.add(right.id);
          continue;
        }
      }

      // Indivíduo solo
      orderedUnits.push({
        type: 'SINGLE',
        members: [person],
      });
      handledPersons.add(person.id);
    }

    // Função auxiliar para calcular a posição média dos pais da unidade
    const getUnitParentMidpoint = (unit: (typeof orderedUnits)[0]): number | null => {
      for (const p of unit.members) {
        const parentIds = getParentsOfPerson(p.id, project);
        const parentNodes = parentIds
          .map((pid) => nodeMap.get(pid))
          .filter((pn): pn is LayoutNode => pn !== undefined);
        if (parentNodes.length > 0) {
          const sumX = parentNodes.reduce((acc, pn) => acc + (pn.x + pn.width / 2), 0);
          return sumX / parentNodes.length;
        }
      }
      return null;
    };

    // Ordena as unidades da geração para que filhos fiquem alinhados da esquerda para a direita de acordo com os pais
    orderedUnits.sort((a, b) => {
      const pA = getUnitParentMidpoint(a);
      const pB = getUnitParentMidpoint(b);
      if (pA !== null && pB !== null) return pA - pB;
      if (pA !== null) return -1;
      if (pB !== null) return 1;
      return 0;
    });

    // Função para identificar a chave de filiação/família de uma unidade
    const getUnitFamilyKey = (unit: (typeof orderedUnits)[0]): string => {
      for (const p of unit.members) {
        const filiations = project.parentChildRelations.filter((r) => r.childId === p.id);
        if (filiations.length > 0 && filiations[0].unionId) {
          return filiations[0].unionId;
        }
      }
      return 'solo-' + unit.members[0].id;
    };

    // Agrupa unidades contíguas por família para centralizar a prole sob os pais
    const familyClusters: (typeof orderedUnits)[] = [];
    let currentCluster: (typeof orderedUnits) = [];
    let currentClusterKey = '';

    for (const unit of orderedUnits) {
      const key = getUnitFamilyKey(unit);
      if (currentCluster.length === 0 || key === currentClusterKey) {
        currentCluster.push(unit);
        currentClusterKey = key;
      } else {
        familyClusters.push(currentCluster);
        currentCluster = [unit];
        currentClusterKey = key;
      }
    }
    if (currentCluster.length > 0) {
      familyClusters.push(currentCluster);
    }

    // Calcula coordenadas X para as unidades da geração
    let currentX = startX;

    for (const cluster of familyClusters) {
      const clusterParentMid = getUnitParentMidpoint(cluster[0]);

      // Calcula a largura total ideal do grupo de irmãos
      let clusterWidth = 0;
      cluster.forEach((u, i) => {
        const uWidth = u.type === 'COUPLE' ? dims.unionGap + dims.width : dims.width;
        clusterWidth += uWidth;
        if (i < cluster.length - 1) {
          clusterWidth += dims.horizontalSpacing - dims.width;
        }
      });

      // Se o grupo tem pais conhecidos, centraliza simetricamente sob o ponto médio dos pais
      let clusterStartX = currentX;
      if (clusterParentMid !== null) {
        const idealStartX = Math.round(clusterParentMid - clusterWidth / 2);
        clusterStartX = Math.max(currentX, idealStartX);
      }

      let unitCursorX = clusterStartX;

      for (const unit of cluster) {
        if (unit.type === 'COUPLE') {
          const [p1, p2] = unit.members;
          const hasCustom = p1.customX !== undefined || p2.customX !== undefined;

          let x1: number;
          let x2: number;

          if (hasCustom) {
            x1 = p1.customX ?? unitCursorX;
            x2 = p2.customX ?? x1 + dims.unionGap;
          } else {
            x1 = unitCursorX;
            x2 = x1 + dims.unionGap;
          }

          const y1 = p1.customY ?? y;
          const y2 = p2.customY ?? y;

          const node1: LayoutNode = {
            person: p1,
            x: x1,
            y: y1,
            width: dims.width,
            height: dims.height,
            generation: gen,
            generationIndex: 0,
          };
          const node2: LayoutNode = {
            person: p2,
            x: x2,
            y: y2,
            width: dims.width,
            height: dims.height,
            generation: gen,
            generationIndex: 0,
          };

          nodeMap.set(p1.id, node1);
          nodeMap.set(p2.id, node2);
          nodes.push(node1, node2);

          unitCursorX = Math.max(x1, x2) + dims.horizontalSpacing;
        } else {
          const p = unit.members[0];
          let nx: number;

          if (p.customX !== undefined) {
            nx = p.customX;
          } else {
            nx = unitCursorX;
          }

          const ny = p.customY ?? y;

          const node: LayoutNode = {
            person: p,
            x: nx,
            y: ny,
            width: dims.width,
            height: dims.height,
            generation: gen,
            generationIndex: 0,
          };

          nodeMap.set(p.id, node);
          nodes.push(node);

          unitCursorX = nx + dims.horizontalSpacing;
        }
      }

      currentX = unitCursorX;
    }
  }

  // Atribui numeração ordinal aos nós por geração (1, 2, 3...) da esquerda para a direita
  for (const gen of sortedGenerations) {
    const nodesInGen = nodes.filter((n) => n.generation === gen);
    nodesInGen.sort((a, b) => a.x - b.x);
    nodesInGen.forEach((n, idx) => {
      n.generationIndex = idx + 1;
      n.person.generation = gen;
      n.person.generationIndex = idx + 1;
    });
  }

  // Monta as estruturas de união com coordenadas e filhos
  const layoutUnions: LayoutUnion[] = [];

  for (const union of project.unions) {
    const p1Node = nodeMap.get(union.partner1Id);
    const p2Node = nodeMap.get(union.partner2Id);

    if (p1Node && p2Node) {
      const midpointX = (p1Node.x + p1Node.width / 2 + p2Node.x + p2Node.width / 2) / 2;
      const unionY = (p1Node.y + p1Node.height / 2 + p2Node.y + p2Node.height / 2) / 2;

      // Identifica os filhos dessa união
      const filiations = project.parentChildRelations.filter((r) => r.unionId === union.id);
      const childrenWithFiliation = filiations
        .map((f) => {
          const childNode = nodeMap.get(f.childId);
          return childNode ? { childNode, filiation: f } : null;
        })
        .filter((c): c is { childNode: LayoutNode; filiation: ParentChildRelation } => c !== null);

      // Ordena filhos por coordenada X para traçar barramento limpo
      childrenWithFiliation.sort((a, b) => a.childNode.x - b.childNode.x);

      layoutUnions.push({
        union,
        partner1Node: p1Node,
        partner2Node: p2Node,
        midpointX,
        y: unionY,
        children: childrenWithFiliation,
      });
    }
  }

  // Calcula limites do canvas
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  if (nodes.length === 0) {
    minX = 0;
    maxX = 800;
    minY = 0;
    maxY = 600;
  } else {
    for (const node of nodes) {
      if (node.x < minX) minX = node.x;
      if (node.x + node.width > maxX) maxX = node.x + node.width;
      if (node.y < minY) minY = node.y;
      if (node.y + node.height + 55 > maxY) maxY = node.y + node.height + 55;
    }
  }

  // Níveis de geração para numeração na lateral esquerda (I, II, III...)
  const generationLevels = [];
  for (let g = minGen; g <= maxGen; g++) {
    const yPos = startY + (g - 1) * dims.generationHeight + dims.height / 2;
    generationLevels.push({
      level: g,
      roman: toRomanNumeral(g),
      y: yPos,
    });
  }

  return {
    nodes,
    unions: layoutUnions,
    bounds: {
      minX: Math.max(0, minX - 80),
      maxX: maxX + 100,
      minY: Math.max(0, minY - 60),
      maxY: maxY + 140,
      width: Math.max(900, maxX - minX + 260),
      height: Math.max(600, maxY - minY + 260),
    },
    generationLevels,
  };
}
