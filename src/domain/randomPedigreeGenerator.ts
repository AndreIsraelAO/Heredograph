/**
 * Gerador de Heredogramas Aleatórios com Critérios Clínicos e Genealógicos
 * Produz famílias conectadas, com validação de linhagem, regras mendelianas reais e limites delimitados.
 */

import {
  ClinicalStatus,
  FamilyProject,
  FiliationType,
  ParentChildRelation,
  Person,
  Sex,
  UnionRelation,
} from './types';

export type GenerationCount = 2 | 3 | 4;
export type FamilySize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type InheritanceType =
  | 'NONE'
  | 'AUTOSOMAL_DOMINANT'
  | 'AUTOSOMAL_RECESSIVE'
  | 'X_LINKED_RECESSIVE'
  | 'RANDOM';
export type AffectedRate = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RandomPedigreeOptions {
  projectName?: string;
  generations: GenerationCount;
  familySize: FamilySize;
  inheritance: InheritanceType;
  affectedRate: AffectedRate;
  includeConsanguinity: boolean;
  setProband: boolean;
}

const MALE_NAMES = [
  'Lucas', 'Gabriel', 'Roberto', 'Alberto', 'Carlos', 'Joaquim', 'Felipe',
  'Thiago', 'Matheus', 'Leonardo', 'André', 'Bruno', 'Rafael', 'Henrique',
  'Rodrigo', 'Gustavo', 'Daniel', 'Eduardo', 'Marcelo', 'Caio', 'Pedro',
  'Bernardo', 'Vinícius', 'Murilo', 'Samuel', 'Diego', 'Vitor', 'Fernando'
];

const FEMALE_NAMES = [
  'Sofia', 'Maria', 'Helena', 'Beatriz', 'Camila', 'Juliana', 'Mariana',
  'Larissa', 'Gabriela', 'Letícia', 'Fernanda', 'Alice', 'Clara', 'Laura',
  'Luísa', 'Carolina', 'Isabela', 'Bianca', 'Vanessa', 'Manuela', 'Ana',
  'Júlia', 'Cecília', 'Valentina', 'Rafaela', 'Lívia', 'Amanda', 'Renata'
];

const SURNAMES = [
  'Silva', 'Santos', 'Oliveira', 'Pereira', 'Souza', 'Rodrigues', 'Ferreira',
  'Alves', 'Lima', 'Carvalho', 'Ribeiro', 'Rocha', 'Mendes', 'Barbosa',
  'Castro', 'Cardoso', 'Correia', 'Dias', 'Monteiro', 'Moreira', 'Nunes'
];

const CITIES = [
  'São Paulo, SP', 'Belo Horizonte, MG', 'Rio de Janeiro, RJ', 'Curitiba, PR',
  'Porto Alegre, RS', 'Campinas, SP', 'Salvador, BA', 'Recife, PE', 'Brasília, DF'
];

interface DiseasePreset {
  name: string;
  pattern: string;
  notesAffected: string;
  notesCarrier?: string;
}

const DISEASE_PRESETS: Record<Exclude<InheritanceType, 'NONE' | 'RANDOM'>, DiseasePreset[]> = {
  AUTOSOMAL_DOMINANT: [
    {
      name: 'Doença de Huntington',
      pattern: 'Autossômica Dominante',
      notesAffected: 'Coreia progressiva e alterações cognitivas manifestadas na idade adulta.',
    },
    {
      name: 'Síndrome de Marfan',
      pattern: 'Autossômica Dominante',
      notesAffected: 'Estatura elevada, aracnodactilia e ectopia lentis confirmadas.',
    },
    {
      name: 'Neurofibromatose Tipo 1 (NF1)',
      pattern: 'Autossômica Dominante',
      notesAffected: 'Múltiplas manchas café-com-leite e neurofibromas cutâneos.',
    },
    {
      name: 'Hipercolesterolemia Familiar',
      pattern: 'Autossômica Dominante',
      notesAffected: 'LDL elevado grave e histórico de xantomas tendinosos.',
    },
  ],
  AUTOSOMAL_RECESSIVE: [
    {
      name: 'Fibrose Cística',
      pattern: 'Autossômica Recessiva',
      notesAffected: 'Insuficiência pancreática exócrina e bronquiectasias crônicas.',
      notesCarrier: 'Portador heterozigoto assintomático confirmado por triagem molecular.',
    },
    {
      name: 'Anemia Falciforme',
      pattern: 'Autossômica Recessiva',
      notesAffected: 'Hemoglobinopatia SS com crises vaso-oclusivas recorrentes.',
      notesCarrier: 'Traço falciforme (Hb AS) assintomático.',
    },
    {
      name: 'Atrofia Muscular Espinhal (AME)',
      pattern: 'Autossômica Recessiva',
      notesAffected: 'Hipotonia e fraqueza muscular proximal secundária a deleção no SMN1.',
      notesCarrier: 'Carreador de deleção em heterozigose sem sintomas motores.',
    },
  ],
  X_LINKED_RECESSIVE: [
    {
      name: 'Hemofilia A (Deficiência de Fator VIII)',
      pattern: 'Ligada ao X Recessiva',
      notesAffected: 'Coagulopatia com episódios de hemartrose pós-trauma.',
      notesCarrier: 'Mulher carreadora heterozigota com níveis normais de Fator VIII.',
    },
    {
      name: 'Distrofia Muscular de Duchenne',
      pattern: 'Ligada ao X Recessiva',
      notesAffected: 'Fraqueza progressiva de cinturas e sinal de Gowers positivo.',
      notesCarrier: 'Mulher portadora assintomática da mutação no gene da distrofina.',
    },
    {
      name: 'Daltonismo (Dicromatopsia)',
      pattern: 'Ligada ao X Recessiva',
      notesAffected: 'Déficit na discriminação visual das cores vermelho e verde.',
      notesCarrier: 'Carreadora assintomática de alelo variante.',
    },
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Gera um heredograma clinicamente coerente com base nos critérios definidos pelo usuário.
 */
export function generateRandomPedigree(options: RandomPedigreeOptions): FamilyProject {
  // Resolução do padrão de herança
  let inheritance = options.inheritance;
  if (inheritance === 'RANDOM') {
    inheritance = pickRandom([
      'AUTOSOMAL_DOMINANT',
      'AUTOSOMAL_RECESSIVE',
      'X_LINKED_RECESSIVE',
    ]);
  }

  const preset =
    inheritance !== 'NONE'
      ? pickRandom(DISEASE_PRESETS[inheritance as keyof typeof DISEASE_PRESETS])
      : null;

  const diseaseName = preset ? preset.name : 'Nenhuma (Genealógico)';
  const inheritancePattern = preset ? preset.pattern : 'Não aplicável';

  const familySurname1 = pickRandom(SURNAMES);
  let familySurname2 = pickRandom(SURNAMES);
  while (familySurname2 === familySurname1) {
    familySurname2 = pickRandom(SURNAMES);
  }

  const projectName =
    options.projectName?.trim() ||
    (preset
      ? `Heredograma: ${preset.name}`
      : `Árvore Familiar: Família ${familySurname1}`);

  const persons: Person[] = [];
  const unions: UnionRelation[] = [];
  const parentChildRelations: ParentChildRelation[] = [];

  let personCounter = 1;
  let unionCounter = 1;
  let relCounter = 1;

  const usedMaleNames = new Set<string>();
  const usedFemaleNames = new Set<string>();

  function createPerson(
    sex: Sex,
    generationLevel: number,
    surname: string,
    deceasedChance = 0
  ): Person {
    const isMale = sex === 'M';
    let firstName = isMale ? pickRandom(MALE_NAMES) : pickRandom(FEMALE_NAMES);
    const pool = isMale ? MALE_NAMES : FEMALE_NAMES;
    const used = isMale ? usedMaleNames : usedFemaleNames;

    let attempts = 0;
    while (used.has(firstName) && attempts < 15) {
      firstName = pickRandom(pool);
      attempts++;
    }
    used.add(firstName);

    // Calcular ano de nascimento aproximado por geração
    const baseYears = {
      2: [1975, 2005],
      3: [1948, 1976, 2004],
      4: [1932, 1958, 1984, 2012],
    };

    const genArr = baseYears[options.generations] || [1950, 1975, 2000];
    const genIndex = Math.min(generationLevel - 1, genArr.length - 1);
    const approxYear = genArr[genIndex] + randomInt(-3, 4);
    const month = String(randomInt(1, 12)).padStart(2, '0');
    const day = String(randomInt(1, 28)).padStart(2, '0');
    const birthDate = `${approxYear}-${month}-${day}`;

    const isDeceased = Math.random() < deceasedChance;
    let deathDate: string | undefined;
    if (isDeceased) {
      const deathYear = approxYear + randomInt(60, 85);
      const cappedDeathYear = Math.min(deathYear, 2025);
      deathDate = `${cappedDeathYear}-06-15`;
    }

    const id = `p-gen${generationLevel}-${personCounter++}`;

    const person: Person = {
      id,
      name: `${firstName} ${surname}`,
      sex,
      birthDate,
      birthPlace: pickRandom(CITIES),
      isDeceased,
      deathDate,
      clinicalStatus: 'UNAFFECTED',
      generation: generationLevel,
    };

    persons.push(person);
    return person;
  }

  function createUnion(
    p1: Person,
    p2: Person,
    isConsanguineous = false
  ): UnionRelation {
    const union: UnionRelation = {
      id: `u-${unionCounter++}`,
      partner1Id: p1.id,
      partner2Id: p2.id,
      type: 'MARRIAGE',
      isConsanguineous,
    };
    unions.push(union);
    return union;
  }

  function addChildren(
    union: UnionRelation,
    generationLevel: number,
    count: number,
    primarySurname: string
  ): Person[] {
    const children: Person[] = [];
    for (let i = 0; i < count; i++) {
      const sex: Sex = Math.random() < 0.5 ? 'M' : 'F';
      const child = createPerson(sex, generationLevel, primarySurname, 0);
      children.push(child);

      parentChildRelations.push({
        id: `rel-${relCounter++}`,
        childId: child.id,
        unionId: union.id,
        filiationType: 'BIOLOGICAL' as FiliationType,
      });
    }
    return children;
  }

  // Quantidade de filhos de acordo com o tamanho selecionado
  const getChildCount = (): number => {
    switch (options.familySize) {
      case 'SMALL':
        return randomInt(1, 2);
      case 'LARGE':
        return randomInt(3, 4);
      case 'MEDIUM':
      default:
        return randomInt(2, 3);
    }
  };

  // Construção estrutural da genealogia
  if (options.generations === 2) {
    // 2 Gerações: Casal I -> Filhos II
    const p1 = createPerson('M', 1, familySurname1, 0.2);
    const p2 = createPerson('F', 1, familySurname2, 0.1);
    const u1 = createUnion(p1, p2, options.includeConsanguinity);
    addChildren(u1, 2, Math.max(2, getChildCount() + 1), familySurname1);
  } else if (options.generations === 3) {
    // 3 Gerações:
    // Avós Paternos (I-1, I-2) -> Pais e Tios (II)
    // Avós Maternos (I-3, I-4) -> Mãe e Tios (II)
    // Pai + Mãe formam o casal central de II -> Filhos (III)
    const gf1 = createPerson('M', 1, familySurname1, 0.7);
    const gm1 = createPerson('F', 1, pickRandom(SURNAMES), 0.5);
    const uPaternal = createUnion(gf1, gm1);

    const gf2 = createPerson('M', 1, familySurname2, 0.6);
    const gm2 = createPerson('F', 1, pickRandom(SURNAMES), 0.4);
    const uMaternal = createUnion(gf2, gm2);

    // Filhos da linhagem paterna
    const paternalKids = addChildren(uPaternal, 2, Math.max(2, getChildCount()), familySurname1);
    // Garantir pelo menos um homem na linhagem paterna para ser o pai
    let father = paternalKids.find((k) => k.sex === 'M');
    if (!father) {
      father = paternalKids[0];
      father.sex = 'M';
    }

    // Filhos da linhagem materna
    const maternalKids = addChildren(uMaternal, 2, Math.max(2, getChildCount()), familySurname2);
    // Garantir pelo menos uma mulher na linhagem materna para ser a mãe
    let mother = maternalKids.find((k) => k.sex === 'F');
    if (!mother) {
      mother = maternalKids[0];
      mother.sex = 'F';
    }

    // Casamento central de II
    const centralUnion = createUnion(father, mother, options.includeConsanguinity);

    // Filhos de Geração III
    addChildren(centralUnion, 3, Math.max(2, getChildCount() + 1), `${familySurname1} ${familySurname2}`);
  } else {
    // 4 Gerações: Bisavós (I) -> Avós (II) -> Pais (III) -> Filhos (IV)
    const b1 = createPerson('M', 1, familySurname1, 0.95);
    const b2 = createPerson('F', 1, familySurname2, 0.9);
    const uBis = createUnion(b1, b2);

    const avos = addChildren(uBis, 2, Math.max(2, getChildCount()), familySurname1);
    const avoCentral = avos[0];
    const conjugueAvo = createPerson(
      avoCentral.sex === 'M' ? 'F' : 'M',
      2,
      pickRandom(SURNAMES),
      0.6
    );
    const uAvo = createUnion(
      avoCentral.sex === 'M' ? avoCentral : conjugueAvo,
      avoCentral.sex === 'M' ? conjugueAvo : avoCentral
    );

    const pais = addChildren(uAvo, 3, Math.max(2, getChildCount()), familySurname1);
    const paiCentral = pais[0];
    const conjuguePai = createPerson(
      paiCentral.sex === 'M' ? 'F' : 'M',
      3,
      pickRandom(SURNAMES),
      0.1
    );
    const uPai = createUnion(
      paiCentral.sex === 'M' ? paiCentral : conjuguePai,
      paiCentral.sex === 'M' ? conjuguePai : paiCentral,
      options.includeConsanguinity
    );

    // Geração IV (Filhos/Bisnetos)
    addChildren(uPai, 4, Math.max(2, getChildCount()), `${familySurname1}`);
  }

  // Atribuição de Genética e Fenótipo segundo o Padrão de Herança
  const affectedProb =
    options.affectedRate === 'LOW'
      ? 0.25
      : options.affectedRate === 'HIGH'
      ? 0.55
      : 0.38;

  if (inheritance === 'AUTOSOMAL_DOMINANT' && preset) {
    // Autossômica dominante:
    // Indivíduo afetado passa a condição para ~50% dos descendentes.
    // Começamos escolhendo um fundador em Geração I ou II como afetado.
    const founder = persons[0];
    founder.clinicalStatus = 'AFFECTED';
    founder.conditionName = preset.name;
    founder.notes = preset.notesAffected;

    // Propagar verticalmente pelos filhos
    for (const rel of parentChildRelations) {
      const union = unions.find((u) => u.id === rel.unionId);
      if (!union) continue;
      const p1 = persons.find((p) => p.id === union.partner1Id);
      const p2 = persons.find((p) => p.id === union.partner2Id);
      const child = persons.find((p) => p.id === rel.childId);
      if (!child) continue;

      const parentAffected = p1?.clinicalStatus === 'AFFECTED' || p2?.clinicalStatus === 'AFFECTED';
      if (parentAffected) {
        if (Math.random() < affectedProb) {
          child.clinicalStatus = 'AFFECTED';
          child.conditionName = preset.name;
          child.notes = preset.notesAffected;
        }
      }
    }
  } else if (inheritance === 'AUTOSOMAL_RECESSIVE' && preset) {
    // Autossômica recessiva:
    // Pais portadores (CARRIER) -> Filhos podem ser afetados (25%), portadores (50%) ou não afetados (25%).
    // Selecionamos ancestrais como portadores
    const carriers = new Set<string>();

    // No casal central da geração anterior aos filhos, ambos devem ser portadores para gerar afetados
    if (unions.length > 0) {
      const centralUnion = unions[unions.length - 1];
      carriers.add(centralUnion.partner1Id);
      carriers.add(centralUnion.partner2Id);

      // Também em algum avô para rastreabilidade
      if (unions.length >= 2) {
        carriers.add(unions[0].partner2Id);
      }
    }

    for (const pid of carriers) {
      const p = persons.find((x) => x.id === pid);
      if (p) {
        p.clinicalStatus = 'CARRIER';
        p.conditionName = preset.name;
        p.notes = preset.notesCarrier || 'Portador heterozigoto assintomático.';
      }
    }

    // Avaliar filhos de cada união
    for (const union of unions) {
      const p1 = persons.find((p) => p.id === union.partner1Id);
      const p2 = persons.find((p) => p.id === union.partner2Id);
      const childRels = parentChildRelations.filter((r) => r.unionId === union.id);

      const bothCarriers =
        (p1?.clinicalStatus === 'CARRIER' || p1?.clinicalStatus === 'AFFECTED') &&
        (p2?.clinicalStatus === 'CARRIER' || p2?.clinicalStatus === 'AFFECTED');

      let hasAffectedChild = false;
      childRels.forEach((rel, idx) => {
        const child = persons.find((c) => c.id === rel.childId);
        if (!child) return;

        if (bothCarriers) {
          // Pelo menos 1 afetado se houver múltiplos filhos no casal central
          const roll = Math.random();
          if ((!hasAffectedChild && idx === childRels.length - 1) || roll < affectedProb) {
            child.clinicalStatus = 'AFFECTED';
            child.conditionName = preset.name;
            child.notes = preset.notesAffected;
            hasAffectedChild = true;
          } else if (roll < 0.75) {
            child.clinicalStatus = 'CARRIER';
            child.conditionName = preset.name;
            child.notes = preset.notesCarrier || 'Portador heterozigoto assintomático.';
          }
        } else if (p1?.clinicalStatus === 'CARRIER' || p2?.clinicalStatus === 'CARRIER') {
          if (Math.random() < 0.5) {
            child.clinicalStatus = 'CARRIER';
            child.conditionName = preset.name;
            child.notes = preset.notesCarrier || 'Portador heterozigoto assintomático.';
          }
        }
      });
    }
  } else if (inheritance === 'X_LINKED_RECESSIVE' && preset) {
    // Ligada ao X recessiva:
    // Homens afetados (AFFECTED) transmitem para filhas mulheres (CARRIER).
    // Mulheres carreadoras transmitem para 50% dos filhos homens (AFFECTED).
    const femaleCarriers = persons.filter((p) => p.sex === 'F');
    if (femaleCarriers.length > 0) {
      // Definir uma mãe de geração 1 ou 2 como portadora
      const primeCarrier = femaleCarriers[Math.min(1, femaleCarriers.length - 1)];
      primeCarrier.clinicalStatus = 'CARRIER';
      primeCarrier.conditionName = preset.name;
      primeCarrier.notes = preset.notesCarrier || 'Mulher portadora assintomática (heterozigota no cromossomo X).';
    }

    for (const rel of parentChildRelations) {
      const union = unions.find((u) => u.id === rel.unionId);
      if (!union) continue;
      const mother = persons.find((p) => p.id === (union.partner1Id === primeMotherId(union, persons) ? union.partner1Id : union.partner2Id));
      const child = persons.find((p) => p.id === rel.childId);
      if (!child || !mother) continue;

      if (mother.clinicalStatus === 'CARRIER') {
        if (child.sex === 'M') {
          if (Math.random() < 0.6) {
            child.clinicalStatus = 'AFFECTED';
            child.conditionName = preset.name;
            child.notes = preset.notesAffected;
          }
        } else if (child.sex === 'F') {
          if (Math.random() < 0.5) {
            child.clinicalStatus = 'CARRIER';
            child.conditionName = preset.name;
            child.notes = preset.notesCarrier || 'Filha carreadora assintomática.';
          }
        }
      }
    }
  }

  // Garantir probando clínico se solicitado
  if (options.setProband) {
    // Procura prioritariamente um indivíduo afetado nas últimas gerações
    const affectedList = persons.filter((p) => p.clinicalStatus === 'AFFECTED');
    let proband: Person | undefined;

    if (affectedList.length > 0) {
      // Priorizar indivíduo da geração mais recente
      affectedList.sort((a, b) => (b.generation || 1) - (a.generation || 1));
      proband = affectedList[0];
    } else {
      // Caso não haja afetados (ex: genealógico), escolhe o primeiro filho da última geração
      const maxGen = Math.max(...persons.map((p) => p.generation || 1));
      proband = persons.find((p) => p.generation === maxGen) || persons[persons.length - 1];
    }

    if (proband) {
      proband.isProband = true;
      if (!proband.notes) {
        proband.notes = 'Probando / Caso índice que motivou o aconselhamento genético.';
      } else {
        proband.notes = `Probando (Caso índice). ${proband.notes}`;
      }
    }
  }

  const now = new Date().toISOString();
  return {
    id: `random-pedigree-${Date.now()}`,
    name: projectName,
    description: `Heredograma gerado aleatoriamente com ${options.generations} gerações e padrão ${inheritancePattern}. Doença simulada: ${diseaseName}.`,
    diseaseName,
    inheritancePattern,
    createdAt: now,
    updatedAt: now,
    viewMode: 'GENETIC',
    persons,
    unions,
    parentChildRelations,
  };
}

function primeMotherId(union: UnionRelation, persons: Person[]): string {
  const p1 = persons.find((p) => p.id === union.partner1Id);
  return p1?.sex === 'F' ? union.partner1Id : union.partner2Id;
}
