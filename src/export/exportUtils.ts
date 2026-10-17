/**
 * Utilitários de Exportação de Heredogramas
 * Gera arquivos em SVG, PNG (alta resolução 300 DPI), PDF (A4/A3) e JSON.
 */

import { jsPDF } from 'jspdf';
import { exportToGedcom } from '../domain/gedcom';
import { exportToLatexTikz } from '../domain/latex';
import { FamilyProject, LayoutResult } from '../domain/types';

/**
 * Dispara o download de um arquivo de texto no navegador
 */
export function downloadTextFile(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Produz uma string SVG perfeitamente enquadrada e independente de pan/zoom atual
 */
export function getFramedSvgString(svgElement: SVGSVGElement, layout?: LayoutResult): {
  svgString: string;
  width: number;
  height: number;
} {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Remove classes e estilos aplicados pelo Tailwind que possam afetar a renderização isolada
  clone.removeAttribute('class');
  clone.removeAttribute('style');

  // Reseta transformações de Pan e Zoom do canvas para enquadrar 1:1
  const matrixGroup = clone.querySelector('g[transform*="translate"]');
  if (matrixGroup) {
    matrixGroup.setAttribute('transform', 'translate(0, 0) scale(1)');
  }

  // Remove qualquer retângulo de grade de fundo antigo
  const oldGridRects = clone.querySelectorAll('rect[fill*="grid-dots"]');
  oldGridRects.forEach((r) => r.remove());

  // Calcula com extrema precisão os limites reais de todos os elementos (nós, rótulos e linhas)
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  if (layout && layout.nodes.length > 0) {
    for (const node of layout.nodes) {
      // Área do nó incluindo folga lateral para nomes longos
      minX = Math.min(minX, node.x - 36);
      maxX = Math.max(maxX, node.x + node.width + 36);
      minY = Math.min(minY, node.y - 20);
      // Inclui textos e setas abaixo do nó (número, nome, datas)
      maxY = Math.max(maxY, node.y + node.height + 65);
    }
    // Inclui numeração romana de geração na margem esquerda (I, II, III...)
    for (const gl of layout.generationLevels) {
      minX = Math.min(minX, (layout.bounds.minX ?? minX) - 60);
      maxX = Math.max(maxX, (layout.bounds.maxX ?? maxX) + 30);
      minY = Math.min(minY, gl.y - 25);
      maxY = Math.max(maxY, gl.y + 25);
    }
  } else {
    try {
      const bbox = svgElement.getBBox();
      minX = bbox.x;
      maxX = bbox.x + bbox.width;
      minY = bbox.y;
      maxY = bbox.y + bbox.height;
    } catch {
      minX = 0;
      maxX = 1000;
      minY = 0;
      maxY = 700;
    }
  }

  // Margem de respiro harmônica
  const padding = 45;
  const boxX = Math.floor(minX - padding);
  const boxY = Math.floor(minY - padding);
  const boxWidth = Math.max(380, Math.ceil(maxX - minX + padding * 2));
  const boxHeight = Math.max(260, Math.ceil(maxY - minY + padding * 2));

  // Insere um retângulo branco de fundo cobrindo exatamente o viewBox
  const whiteBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  whiteBg.setAttribute('x', `${boxX}`);
  whiteBg.setAttribute('y', `${boxY}`);
  whiteBg.setAttribute('width', `${boxWidth}`);
  whiteBg.setAttribute('height', `${boxHeight}`);
  whiteBg.setAttribute('fill', '#FFFFFF');
  clone.insertBefore(whiteBg, clone.firstChild);

  // Injeta estilos tipográficos fundamentais para manter as fontes nítidas
  let defs = clone.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    clone.insertBefore(defs, clone.firstChild);
  }
  const fontStyle = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  fontStyle.textContent = `
    text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  `;
  defs.appendChild(fontStyle);

  // Define atributos viewBox e dimensões físicas exatas em pixels
  clone.setAttribute('viewBox', `${boxX} ${boxY} ${boxWidth} ${boxHeight}`);
  clone.setAttribute('width', `${boxWidth}`);
  clone.setAttribute('height', `${boxHeight}`);

  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(clone);
  if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  return { svgString: source, width: boxWidth, height: boxHeight };
}

/**
 * Exporta o SVG atualmente renderizado no DOM com enquadramento perfeito
 */
export function exportSvgElement(
  svgElement: SVGSVGElement,
  filename: string,
  layout?: LayoutResult
) {
  const { svgString } = getFramedSvgString(svgElement, layout);
  const fullSvg = `<?xml version="1.0" standalone="no"?>\r\n${svgString}`;
  downloadTextFile(fullSvg, `${filename}.svg`, 'image/svg+xml');
}

/**
 * Converte o SVG para PNG em alta resolução (1x, 2x ou 3x) perfeitamente enquadrado
 */
export async function exportPngFromSvg(
  svgElement: SVGSVGElement,
  filename: string,
  scale = 2,
  layout?: LayoutResult
): Promise<void> {
  const { svgString, width: exportWidth, height: exportHeight } = getFramedSvgString(
    svgElement,
    layout
  );
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const URL = window.URL || window.webkitURL || window;
  const blobURL = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.crossOrigin = 'anonymous';

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = exportWidth * scale;
      canvas.height = exportHeight * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(blobURL);
        return reject(new Error('Falha ao obter contexto 2D do Canvas.'));
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(blobURL);

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Erro ao converter Canvas para Blob PNG.'));
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = window.URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        resolve();
      }, 'image/png');
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(blobURL);
      reject(e);
    };

    img.src = blobURL;
  });
}

export interface PdfExportOptions {
  format?: 'a4' | 'a3';
  orientation?: 'landscape' | 'portrait';
  includeMetadata?: boolean;
}

/**
 * Exporta o heredograma como PDF formatado com título, metadados e enquadramento total sem cortes
 */
export async function exportPdfFromSvg(
  svgElement: SVGSVGElement,
  project: FamilyProject,
  options: PdfExportOptions = {},
  layout?: LayoutResult
): Promise<void> {
  const { format = 'a4', orientation = 'landscape', includeMetadata = true } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const marginX = 14;
  let currentY = 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(project.name, marginX, currentY);

  if (includeMetadata) {
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 100, 120);

    const metaParts = [];
    if (project.diseaseName) metaParts.push(`Condição: ${project.diseaseName}`);
    if (project.inheritancePattern) metaParts.push(`Padrão: ${project.inheritancePattern}`);
    metaParts.push(`Indivíduos: ${project.persons.length}`);
    metaParts.push(`Gerações: ${layout?.generationLevels.length || 3}`);
    metaParts.push(`Data: ${new Date().toLocaleDateString('pt-BR')}`);

    doc.text(metaParts.join('  |  '), marginX, currentY);
    currentY += 4;
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.3);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 4;
  }

  // Gera o SVG com enquadramento perfeito e limites exatos
  const { svgString, width: exportWidth, height: exportHeight } = getFramedSvgString(
    svgElement,
    layout
  );
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const URL = window.URL || window.webkitURL || window;
  const blobURL = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.crossOrigin = 'anonymous';

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Escala 2.5x para resolução impecável de impressão
      const rasterScale = 2.5;
      canvas.width = exportWidth * rasterScale;
      canvas.height = exportHeight * rasterScale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(blobURL);
        return reject(new Error('Erro ao instanciar canvas'));
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(blobURL);

      const imgData = canvas.toDataURL('image/png');

      // Área estritamente disponível para o heredograma no papel
      const bottomReserved = 14;
      const availableWidth = pageWidth - marginX * 2;
      const availableHeight = pageHeight - currentY - bottomReserved;

      const imgAspect = exportWidth / exportHeight;
      let renderWidth = availableWidth;
      let renderHeight = renderWidth / imgAspect;

      if (renderHeight > availableHeight) {
        renderHeight = availableHeight;
        renderWidth = renderHeight * imgAspect;
      }

      // Centraliza perfeitamente tanto horizontal quanto verticalmente no espaço disponível
      const posX = marginX + (availableWidth - renderWidth) / 2;
      const posY = currentY + (availableHeight - renderHeight) / 2;

      doc.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight);

      // Rodapé institucional
      doc.setFontSize(8);
      doc.setTextColor(140, 150, 160);
      doc.text(
        'Gerado por HeredoStudio - Construtor Profissional de Heredogramas',
        marginX,
        pageHeight - 8
      );

      const cleanFilename = project.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      doc.save(`${cleanFilename}.pdf`);
      resolve();
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(blobURL);
      reject(err);
    };

    img.src = blobURL;
  });
}

/**
 * Exporta o projeto como JSON formatado
 */
export function exportProjectJson(project: FamilyProject) {
  const json = JSON.stringify(project, null, 2);
  const safeName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  downloadTextFile(json, `${safeName}.json`, 'application/json');
}

/**
 * Lê e valida um arquivo JSON de projeto
 */
export async function importProjectJson(file: File): Promise<FamilyProject> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!parsed.persons || !Array.isArray(parsed.persons)) {
    throw new Error('Arquivo JSON inválido: campo "persons" ausente ou corrompido.');
  }

  return {
    ...parsed,
    id: `project-${Date.now()}`,
    name: parsed.name ? `${parsed.name} (Importado)` : 'Projeto Importado',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Exporta arquivo GEDCOM
 */
export function exportGedcomFile(project: FamilyProject) {
  const gedcom = exportToGedcom(project);
  const safeName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  downloadTextFile(gedcom, `${safeName}.ged`, 'text/plain');
}

/**
 * Exporta código LaTeX TikZ em arquivo .tex
 */
export function exportLatexFile(project: FamilyProject) {
  const latex = exportToLatexTikz(project);
  const safeName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  downloadTextFile(latex, `${safeName}_pedigree.tex`, 'application/x-latex');
}
