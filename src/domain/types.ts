/**
 * Tipos e interfaces de domínio para o HeredoStudio
 * Padrões de heredogramas clínicos e árvores genealógicas
 */

export type Sex = 'M' | 'F' | 'OTHER' | 'UNKNOWN';

export type ClinicalStatus = 'UNAFFECTED' | 'AFFECTED' | 'CARRIER' | 'UNKNOWN';

export type UnionType = 'MARRIAGE' | 'CIVIL_UNION' | 'NON_FORMAL' | 'DIVORCED';

export type FiliationType = 'BIOLOGICAL' | 'ADOPTED' | 'FOSTER' | 'STEP';

export type TwinType = 'MONOZYGOTIC' | 'DIZYGOTIC' | 'UNKNOWN';

export type ViewMode = 'GENETIC' | 'GENEALOGICAL';

export interface Person {
  id: string;
  name: string;
  sex: Sex;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  isDeceased?: boolean;
  notes?: string;
  photoUrl?: string;
  
  // Atributos clínicos
  clinicalStatus: ClinicalStatus;
  conditionName?: string;
  isProband?: boolean;      // Indivíduo afetado que levou a família ao aconselhamento (seta 'P')
  isConsultand?: boolean;   // Indivíduo que buscou a consulta clínica
  
  // Posicionamento e identificação geracional
  generation?: number;       // Nível de geração (1 = I, 2 = II, etc.)
  generationIndex?: number;  // Índice ordinal dentro da geração (1, 2, 3...)
  customX?: number;          // Posição manual X caso o usuário arraste o nó
  customY?: number;          // Posição manual Y
}

export interface UnionRelation {
  id: string;
  partner1Id: string;
  partner2Id: string;
  type: UnionType;
  isConsanguineous?: boolean; // Linha dupla entre parceiros com parentesco biológico
  startDate?: string;
  endDate?: string;
}

export interface ParentChildRelation {
  id: string;
  childId: string;
  unionId?: string;           // Id da união entre os pais biológicos ou legais
  parentId?: string;          // Id do progenitor solo (caso não haja união cadastrada)
  filiationType: FiliationType;
  twinGroupId?: string;       // Identificador comum para irmãos gêmeos
  twinType?: TwinType;        // Monozigótico ou Dizigótico
}

export interface FamilyProject {
  id: string;
  name: string;
  description?: string;
  diseaseName?: string;
  inheritancePattern?: string; // Ex: Autossômico Dominante, Recessivo, Ligado ao X, Mitocondrial
  createdAt: string;
  updatedAt: string;
  viewMode: ViewMode;
  persons: Person[];
  unions: UnionRelation[];
  parentChildRelations: ParentChildRelation[];
}

export interface LayoutNode {
  person: Person;
  x: number;
  y: number;
  width: number;
  height: number;
  generation: number;
  generationIndex: number;
}

export interface LayoutUnion {
  union: UnionRelation;
  partner1Node: LayoutNode;
  partner2Node: LayoutNode;
  midpointX: number;
  y: number;
  children: {
    childNode: LayoutNode;
    filiation: ParentChildRelation;
  }[];
}

export interface LayoutResult {
  nodes: LayoutNode[];
  unions: LayoutUnion[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
  generationLevels: {
    level: number;
    roman: string;
    y: number;
  }[];
}

export interface ValidationError {
  id: string;
  type: 'ERROR' | 'WARNING';
  message: string;
  involvedPersonIds: string[];
}

export interface ValidationReport {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
