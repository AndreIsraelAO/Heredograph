/**
 * Módulo de Exportação para Código LaTeX (TikZ)
 * Gera código TikZ altamente customizável e de grau de publicação
 * para inclusão direta em artigos científicos, teses e relatórios médicos.
 */

import { computePedigreeLayout, toRomanNumeral } from '../layout/engine';
import { FamilyProject, LayoutResult } from './types';

export interface LatexExportOptions {
  standalone?: boolean;       // Inclui preâmbulo completo \documentclass{standalone}
  scale?: number;             // Fator de escala geométrica (padrão 0.035 para converter pixels em cm)
  includeGenerationLabels?: boolean;
  colorScheme?: 'monochrome' | 'color'; // Padrão médico clássico (preto e branco) ou colorido
}

/**
 * Converte o heredograma para código LaTeX TikZ
 */
export function exportToLatexTikz(
  project: FamilyProject,
  layout?: LayoutResult,
  options: LatexExportOptions = {}
): string {
  const {
    standalone = true,
    scale = 0.035,
    includeGenerationLabels = true,
    colorScheme = 'monochrome',
  } = options;

  const currentLayout = layout || computePedigreeLayout(project);
  const code: string[] = [];

  if (standalone) {
    code.push('% ========================================================');
    code.push(`% Heredograma gerado por HeredoStudio`);
    code.push(`% Projeto: ${project.name}`);
    if (project.diseaseName) code.push(`% Condição Clínica: ${project.diseaseName}`);
    if (project.inheritancePattern) code.push(`% Padrão de Herança: ${project.inheritancePattern}`);
    code.push(`% Data: ${new Date().toLocaleDateString('pt-BR')}`);
    code.push('% ========================================================');
    code.push('\\documentclass[border=10pt]{standalone}');
    code.push('\\usepackage[utf8]{inputenc}');
    code.push('\\usepackage{tikz}');
    code.push('\\usetikzlibrary{shapes.geometric, arrows.meta, positioning}');
    if (colorScheme === 'color') {
      code.push('\\usepackage{xcolor}');
    }
    code.push('');
    code.push('\\begin{document}');
  }

  code.push('% --- Definições de Estilos para Heredograma ---');
  code.push('\\begin{tikzpicture}[');
  code.push('  male/.style={draw, rectangle, minimum size=1.1cm, inner sep=0pt, line width=1.2pt},');
  code.push('  female/.style={draw, circle, minimum size=1.1cm, inner sep=0pt, line width=1.2pt},');
  code.push('  other/.style={draw, regular polygon, regular polygon sides=4, minimum size=1.1cm, inner sep=0pt, line width=1.2pt},');
  code.push('  affected/.style={fill=black!85, text=white},');
  code.push('  carrier/.style={path picture={\\fill[black] (path picture bounding box.center) circle (3pt);}},');
  code.push('  deceased/.style={path picture={\\draw[line width=1.2pt] (path picture bounding box.south west) -- (path picture bounding box.north east);}},');
  code.push('  busline/.style={line width=1.2pt},');
  code.push('  unionline/.style={line width=1.2pt},');
  code.push('  consangline/.style={line width=1.2pt, double, double distance=2pt},');
  code.push('  labeltext/.style={font=\\footnotesize\\sffamily, align=center},');
  code.push('  genlabel/.style={font=\\bfseries\\sffamily\\large, text=black!70}');
  code.push(']');
  code.push('');

  // 1. Rótulos das Gerações (I, II, III...)
  if (includeGenerationLabels && currentLayout.generationLevels.length > 0) {
    code.push('  % Numeração das Gerações');
    for (const gl of currentLayout.generationLevels) {
      const latexY = (-gl.y * scale).toFixed(2);
      code.push(`  \\node[genlabel] at (0, ${latexY}) {${gl.roman}};`);
    }
    code.push('');
  }

  // 2. Nós dos Indivíduos
  code.push('  % Indivíduos do Heredograma');
  const nodeNameMap = new Map<string, string>();

  for (const node of currentLayout.nodes) {
    const p = node.person;
    const safeId = `node_${p.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
    nodeNameMap.set(p.id, safeId);

    // Determina estilos
    const styles: string[] = [];
    if (p.sex === 'M') styles.push('male');
    else if (p.sex === 'F') styles.push('female');
    else styles.push('other');

    if (p.clinicalStatus === 'AFFECTED') styles.push('affected');
    else if (p.clinicalStatus === 'CARRIER') styles.push('carrier');

    if (p.isDeceased) styles.push('deceased');

    const latexX = (node.x * scale).toFixed(2);
    const latexY = (-node.y * scale).toFixed(2);

    // Texto de identificação (número ordinal I-1, II-3, etc)
    const genIndex = node.generationIndex || 1;
    code.push(`  \\node[${styles.join(', ')}] (${safeId}) at (${latexX}, ${latexY}) {};`);
    code.push(`  \\node[labeltext, below=2pt of ${safeId}] {${genIndex}\\\\ ${latexEscape(p.name)}};`);

    // Seta de probando
    if (p.isProband) {
      code.push(`  \\draw[-{Latex[length=3mm]}, line width=1.5pt] ([shift={(-0.8cm,-0.6cm)}]${safeId}.south west) -- (${safeId}.south west) node[midway, below left, font=\\bfseries] {P};`);
    }
  }
  code.push('');

  // 3. Linhas de União (Casamento / Consanguinidade)
  code.push('  % Linhas de União e Casais');
  for (const u of currentLayout.unions) {
    const p1Id = nodeNameMap.get(u.partner1Node.person.id);
    const p2Id = nodeNameMap.get(u.partner2Node.person.id);
    if (!p1Id || !p2Id) continue;

    const unionStyle = u.union.isConsanguineous ? 'consangline' : 'unionline';
    const unionName = `union_${u.union.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

    code.push(`  \\draw[${unionStyle}] (${p1Id}.east) -- (${p2Id}.west) coordinate[midway] (${unionName});`);

    // Filhos da união
    if (u.children.length > 0) {
      const busY = ((-u.y - 75) * scale).toFixed(2);
      const unionMidX = (u.midpointX * scale).toFixed(2);

      // Linha vertical do meio do casal para o barramento
      code.push(`  \\draw[busline] (${unionName}) -- (${unionMidX}, ${busY});`);

      const childXCoords = u.children.map((c) => Number((c.childNode.x * scale).toFixed(2)));
      const minX = Math.min(Number(unionMidX), ...childXCoords).toFixed(2);
      const maxX = Math.max(Number(unionMidX), ...childXCoords).toFixed(2);

      if (Number(maxX) > Number(minX)) {
        code.push(`  \\draw[busline] (${minX}, ${busY}) -- (${maxX}, ${busY});`);
      }

      for (const childObj of u.children) {
        const childSafe = nodeNameMap.get(childObj.childNode.person.id);
        if (childSafe) {
          code.push(`  \\draw[busline] (${childSafe}.north |- 0, ${busY}) -- (${childSafe}.north);`);
        }
      }
    }
  }

  code.push('\\end{tikzpicture}');

  if (standalone) {
    code.push('\\end{document}');
  }

  return code.join('\n');
}

/**
 * Escapa caracteres reservados do LaTeX (&, %, $, #, _, {, }, ~, ^)
 */
function latexEscape(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}
