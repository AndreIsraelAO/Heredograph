import { describe, expect, it } from 'vitest';
import { exportToLatexTikz } from '../latex';
import { CLINICAL_DEMO_PROJECT } from '../samples';

describe('LaTeX TikZ Exporter', () => {
  it('gera código TikZ com preâmbulo standalone e estilos médicos', () => {
    const latex = exportToLatexTikz(CLINICAL_DEMO_PROJECT, undefined, { standalone: true });

    expect(latex).toContain('\\documentclass[border=10pt]{standalone}');
    expect(latex).toContain('\\usepackage{tikz}');
    expect(latex).toContain('\\begin{tikzpicture}');
    expect(latex).toContain('male/.style');
    expect(latex).toContain('female/.style');
    expect(latex).toContain('affected/.style');
    expect(latex).toContain('carrier/.style');
    expect(latex).toContain('deceased/.style');
    expect(latex).toContain('\\end{tikzpicture}');
    expect(latex).toContain('\\end{document}');
  });

  it('inclui rótulos de geração romana e seta de probando', () => {
    const latex = exportToLatexTikz(CLINICAL_DEMO_PROJECT, undefined, {
      standalone: false,
      includeGenerationLabels: true,
    });

    expect(latex).not.toContain('\\documentclass');
    expect(latex).toContain('\\begin{tikzpicture}');
    expect(latex).toContain('{I}');
    expect(latex).toContain('{II}');
    expect(latex).toContain('{III}');
    // Seta do probando com 'P'
    expect(latex).toContain('node[midway, below left, font=\\bfseries] {P}');
  });
});
