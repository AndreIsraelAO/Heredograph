/**
 * Módulo de Importação e Exportação no formato GEDCOM 5.5.1
 * Padrão internacional para intercâmbio de dados genealógicos e familiares.
 */

import { FamilyProject, ParentChildRelation, Person, Sex, UnionRelation } from './types';

/**
 * Converte data ISO (YYYY-MM-DD) para formato legível GEDCOM (DD MMM YYYY)
 */
function toGedcomDate(isoDate?: string): string {
  if (!isoDate || !isoDate.trim()) return '';
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const parts = isoDate.split('-');
  const year = parts[0];
  if (parts.length === 1) return year;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const month = months[monthIdx] || 'JAN';
  if (parts.length === 2) return `${month} ${year}`;
  const day = parseInt(parts[2], 10);
  return `${day} ${month} ${year}`;
}

/**
 * Tenta converter data GEDCOM (ex: "15 OCT 2009" ou "2009") para formato YYYY-MM-DD
 */
function fromGedcomDate(gedDate?: string): string {
  if (!gedDate) return '';
  const clean = gedDate.trim().toUpperCase();
  const months: Record<string, string> = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
  };

  // Testa DD MMM YYYY
  const dmyMatch = clean.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const mStr = months[dmyMatch[2]] || '01';
    const year = dmyMatch[3];
    return `${year}-${mStr}-${day}`;
  }

  // Testa MMM YYYY
  const myMatch = clean.match(/^([A-Z]{3})\s+(\d{4})$/);
  if (myMatch) {
    const mStr = months[myMatch[1]] || '01';
    const year = myMatch[2];
    return `${year}-${mStr}-01`;
  }

  // Testa YYYY
  const yMatch = clean.match(/^(\d{4})$/);
  if (yMatch) {
    return `${yMatch[1]}-01-01`;
  }

  return clean;
}

/**
 * Exporta um FamilyProject para uma string no formato padrão GEDCOM 5.5.1
 */
export function exportToGedcom(project: FamilyProject): string {
  const lines: string[] = [];

  // Cabeçalho GEDCOM 5.5.1
  lines.push('0 HEAD');
  lines.push('1 SOUR HeredoStudio');
  lines.push('2 VERS 1.0.0');
  lines.push('2 NAME HeredoStudio Pedigree & Genealogy');
  lines.push('1 DEST ANY');
  lines.push(`1 DATE ${toGedcomDate(new Date().toISOString().split('T')[0])}`);
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');

  // Mapeamentos de ID limpos
  const personGedId = (id: string) => `@I${id.replace(/[^a-zA-Z0-9]/g, '')}@`;
  const unionGedId = (id: string) => `@F${id.replace(/[^a-zA-Z0-9]/g, '')}@`;

  // Mapeia quais uniões a pessoa é cônjuge (FAMS) ou filha (FAMC)
  const famsMap = new Map<string, string[]>();
  const famcMap = new Map<string, string>();

  for (const u of project.unions) {
    if (!famsMap.has(u.partner1Id)) famsMap.set(u.partner1Id, []);
    famsMap.get(u.partner1Id)!.push(u.id);

    if (!famsMap.has(u.partner2Id)) famsMap.set(u.partner2Id, []);
    famsMap.get(u.partner2Id)!.push(u.id);
  }

  for (const rel of project.parentChildRelations) {
    if (rel.unionId) {
      famcMap.set(rel.childId, rel.unionId);
    }
  }

  // Registros de Indivíduos (INDI)
  for (const p of project.persons) {
    lines.push(`0 ${personGedId(p.id)} INDI`);

    // Formatação de nome: Nome /Sobrenome/
    const nameParts = p.name.trim().split(' ');
    let gedName = p.name;
    if (nameParts.length > 1) {
      const surname = nameParts.pop();
      gedName = `${nameParts.join(' ')} /${surname}/`;
    }
    lines.push(`1 NAME ${gedName}`);

    // Sexo
    const gedSex = p.sex === 'M' ? 'M' : p.sex === 'F' ? 'F' : 'U';
    lines.push(`1 SEX ${gedSex}`);

    // Nascimento
    if (p.birthDate || p.birthPlace) {
      lines.push('1 BIRT');
      if (p.birthDate) lines.push(`2 DATE ${toGedcomDate(p.birthDate)}`);
      if (p.birthPlace) lines.push(`2 PLAC ${p.birthPlace}`);
    }

    // Óbito
    if (p.isDeceased || p.deathDate || p.deathPlace) {
      lines.push('1 DEAT');
      if (p.deathDate) lines.push(`2 DATE ${toGedcomDate(p.deathDate)}`);
      if (p.deathPlace) lines.push(`2 PLAC ${p.deathPlace}`);
    }

    // Informações clínicas e notas
    const notes: string[] = [];
    if (p.notes) notes.push(p.notes);
    if (p.clinicalStatus && p.clinicalStatus !== 'UNKNOWN') {
      notes.push(`[Status Clínico: ${p.clinicalStatus}]`);
    }
    if (p.isProband) notes.push('[Probando: Sim]');

    if (notes.length > 0) {
      lines.push(`1 NOTE ${notes.join(' | ')}`);
    }

    // Vínculos com famílias
    const spouseIn = famsMap.get(p.id) || [];
    for (const uId of spouseIn) {
      lines.push(`1 FAMS ${unionGedId(uId)}`);
    }

    const childIn = famcMap.get(p.id);
    if (childIn) {
      lines.push(`1 FAMC ${unionGedId(childIn)}`);
    }
  }

  // Registros de Famílias (FAM)
  for (const u of project.unions) {
    lines.push(`0 ${unionGedId(u.id)} FAM`);

    const p1 = project.persons.find((p) => p.id === u.partner1Id);
    const p2 = project.persons.find((p) => p.id === u.partner2Id);

    if (p1?.sex === 'M') {
      lines.push(`1 HUSB ${personGedId(p1.id)}`);
      if (p2) lines.push(`1 WIFE ${personGedId(p2.id)}`);
    } else if (p2?.sex === 'M') {
      lines.push(`1 HUSB ${personGedId(p2.id)}`);
      if (p1) lines.push(`1 WIFE ${personGedId(p1.id)}`);
    } else {
      lines.push(`1 HUSB ${personGedId(u.partner1Id)}`);
      lines.push(`1 WIFE ${personGedId(u.partner2Id)}`);
    }

    if (u.startDate) {
      lines.push('1 MARR');
      lines.push(`2 DATE ${toGedcomDate(u.startDate)}`);
    }

    // Filhos da união
    const childrenRels = project.parentChildRelations.filter((r) => r.unionId === u.id);
    for (const rel of childrenRels) {
      lines.push(`1 CHIL ${personGedId(rel.childId)}`);
    }
  }

  // Fim do arquivo
  lines.push('0 TRLR');

  return lines.join('\n');
}

/**
 * Importa dados de uma string GEDCOM 5.5.1 para uma estrutura FamilyProject
 */
export function importFromGedcom(gedcomContent: string): FamilyProject {
  const lines = gedcomContent.split(/\r?\n/);
  const persons: Person[] = [];
  const unions: UnionRelation[] = [];
  const parentChildRelations: ParentChildRelation[] = [];

  interface RawIndi {
    id: string;
    name: string;
    sex: Sex;
    birthDate?: string;
    birthPlace?: string;
    deathDate?: string;
    deathPlace?: string;
    isDeceased?: boolean;
    notes?: string;
    famc?: string;
    fams: string[];
  }

  interface RawFam {
    id: string;
    husb?: string;
    wife?: string;
    marrDate?: string;
    children: string[];
  }

  const rawIndis = new Map<string, RawIndi>();
  const rawFams = new Map<string, RawFam>();

  let currentIndi: RawIndi | null = null;
  let currentFam: RawFam | null = null;
  let currentContext: 'INDI' | 'FAM' | null = null;
  let lastEvent: 'BIRT' | 'DEAT' | 'MARR' | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Regex para: LEVEL [TAG/XREF] [VALUE/TAG]
    const match = line.match(/^(\d+)\s+(@[^@]+@|[A-Za-z0-9_]+)(?:\s+(.*))?$/);
    if (!match) continue;

    const level = parseInt(match[1], 10);
    const part2 = match[2];
    const part3 = match[3] || '';

    // Nível 0: início de um novo registro
    if (level === 0) {
      lastEvent = null;
      if (part3 === 'INDI') {
        currentContext = 'INDI';
        currentFam = null;
        currentIndi = {
          id: part2.replace(/@/g, ''),
          name: '',
          sex: 'UNKNOWN',
          fams: [],
        };
        rawIndis.set(currentIndi.id, currentIndi);
      } else if (part3 === 'FAM') {
        currentContext = 'FAM';
        currentIndi = null;
        currentFam = {
          id: part2.replace(/@/g, ''),
          children: [],
        };
        rawFams.set(currentFam.id, currentFam);
      } else {
        currentContext = null;
        currentIndi = null;
        currentFam = null;
      }
      continue;
    }

    // Processamento de registro INDI
    if (currentContext === 'INDI' && currentIndi) {
      if (level === 1) {
        lastEvent = null;
        if (part2 === 'NAME') {
          // Remove as barras de sobrenome ex: Maria /Santos/ -> Maria Santos
          currentIndi.name = part3.replace(/\//g, '').trim();
        } else if (part2 === 'SEX') {
          const s = part3.toUpperCase().trim();
          currentIndi.sex = s === 'M' ? 'M' : s === 'F' ? 'F' : 'UNKNOWN';
        } else if (part2 === 'BIRT') {
          lastEvent = 'BIRT';
        } else if (part2 === 'DEAT') {
          lastEvent = 'DEAT';
          currentIndi.isDeceased = true;
        } else if (part2 === 'NOTE') {
          currentIndi.notes = (currentIndi.notes ? currentIndi.notes + '\n' : '') + part3;
        } else if (part2 === 'FAMC') {
          currentIndi.famc = part3.replace(/@/g, '');
        } else if (part2 === 'FAMS') {
          currentIndi.fams.push(part3.replace(/@/g, ''));
        }
      } else if (level === 2 && lastEvent) {
        if (part2 === 'DATE') {
          const parsed = fromGedcomDate(part3);
          if (lastEvent === 'BIRT') currentIndi.birthDate = parsed;
          if (lastEvent === 'DEAT') currentIndi.deathDate = parsed;
        } else if (part2 === 'PLAC') {
          if (lastEvent === 'BIRT') currentIndi.birthPlace = part3;
          if (lastEvent === 'DEAT') currentIndi.deathPlace = part3;
        }
      }
    }

    // Processamento de registro FAM
    if (currentContext === 'FAM' && currentFam) {
      if (level === 1) {
        lastEvent = null;
        if (part2 === 'HUSB') {
          currentFam.husb = part3.replace(/@/g, '');
        } else if (part2 === 'WIFE') {
          currentFam.wife = part3.replace(/@/g, '');
        } else if (part2 === 'CHIL') {
          currentFam.children.push(part3.replace(/@/g, ''));
        } else if (part2 === 'MARR') {
          lastEvent = 'MARR';
        }
      } else if (level === 2 && lastEvent === 'MARR' && part2 === 'DATE') {
        currentFam.marrDate = fromGedcomDate(part3);
      }
    }
  }

  // Reconstrói as entidades do HeredoStudio
  for (const indi of rawIndis.values()) {
    let clinicalStatus: Person['clinicalStatus'] = 'UNAFFECTED';
    let isProband = false;

    if (indi.notes) {
      if (indi.notes.includes('AFFECTED') || indi.notes.includes('Afetado')) {
        clinicalStatus = 'AFFECTED';
      } else if (indi.notes.includes('CARRIER') || indi.notes.includes('Portador')) {
        clinicalStatus = 'CARRIER';
      }
      if (indi.notes.includes('Probando') || indi.notes.includes('Proband')) {
        isProband = true;
      }
    }

    persons.push({
      id: indi.id,
      name: indi.name || `Indivíduo ${indi.id}`,
      sex: indi.sex,
      birthDate: indi.birthDate,
      birthPlace: indi.birthPlace,
      deathDate: indi.deathDate,
      deathPlace: indi.deathPlace,
      isDeceased: indi.isDeceased,
      notes: indi.notes,
      clinicalStatus,
      isProband,
    });
  }

  // Reconstrói as uniões e relações de parentesco
  for (const fam of rawFams.values()) {
    if (fam.husb && fam.wife) {
      unions.push({
        id: fam.id,
        partner1Id: fam.husb,
        partner2Id: fam.wife,
        type: 'MARRIAGE',
        startDate: fam.marrDate,
      });

      for (const childId of fam.children) {
        parentChildRelations.push({
          id: `rel-${fam.id}-${childId}`,
          childId,
          unionId: fam.id,
          filiationType: 'BIOLOGICAL',
        });
      }
    } else if (fam.husb || fam.wife) {
      // Caso de progenitor solo
      const parentId = fam.husb || fam.wife!;
      for (const childId of fam.children) {
        parentChildRelations.push({
          id: `rel-${parentId}-${childId}`,
          childId,
          parentId,
          filiationType: 'BIOLOGICAL',
        });
      }
    }
  }

  return {
    id: `project-gedcom-${Date.now()}`,
    name: 'Árvore Importada via GEDCOM',
    description: `Importação realizada em ${new Date().toLocaleDateString('pt-BR')} com ${persons.length} pessoas e ${unions.length} uniões.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    viewMode: 'GENETIC',
    persons,
    unions,
    parentChildRelations,
  };
}
