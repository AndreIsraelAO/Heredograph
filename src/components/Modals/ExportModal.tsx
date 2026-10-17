/**
 * Modal de Exportação Profissional
 * Suporta múltiplos formatos: SVG, PNG (alta resolução), PDF (A4/A3),
 * LaTeX (TikZ), GEDCOM 5.5.1 e JSON.
 */

import React, { useState } from 'react';
import { exportToGedcom } from '../../domain/gedcom';
import { exportToLatexTikz } from '../../domain/latex';
import { FamilyProject, LayoutResult } from '../../domain/types';
import {
  exportGedcomFile,
  exportLatexFile,
  exportPdfFromSvg,
  exportPngFromSvg,
  exportProjectJson,
  exportSvgElement,
} from '../../export/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FamilyProject;
  layout: LayoutResult;
  svgElement: SVGSVGElement | null;
}

type TabType = 'SVG' | 'PNG' | 'PDF' | 'LATEX' | 'GEDCOM' | 'JSON';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  layout,
  svgElement,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<TabType>('PDF');
  const [pngScale, setPngScale] = useState<number>(2);
  const [pdfFormat, setPdfFormat] = useState<'a4' | 'a3'>('a4');
  const [pdfOrientation, setPdfOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [latexStandalone, setLatexStandalone] = useState<boolean>(true);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);

  // Gera código LaTeX atualizado
  const latexCode = exportToLatexTikz(project, layout, {
    standalone: latexStandalone,
  });

  // Gera prévia GEDCOM
  const gedcomPreview = exportToGedcom(project);

  const handleCopyLatex = async () => {
    try {
      await navigator.clipboard.writeText(latexCode);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleExportSvg = () => {
    if (!svgElement) return;
    const cleanName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    exportSvgElement(svgElement, cleanName, layout);
  };

  const handleExportPng = async () => {
    if (!svgElement) return;
    setIsExporting(true);
    try {
      const cleanName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await exportPngFromSvg(svgElement, cleanName, pngScale, layout);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!svgElement) return;
    setIsExporting(true);
    try {
      await exportPdfFromSvg(
        svgElement,
        project,
        {
          format: pdfFormat,
          orientation: pdfOrientation,
          includeMetadata: true,
        },
        layout
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Exportar Heredograma</h2>
            <p className="text-xs text-slate-500">Escolha o formato adequado para publicação ou impressão</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg p-1 rounded hover:bg-slate-200/60 leading-none"
          >
            ✕
          </button>
        </div>

        {/* Barra de Abas */}
        <div className="flex border-b border-slate-200 px-5 bg-slate-50/50 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'PDF', label: 'PDF Impressão' },
            { id: 'PNG', label: 'Imagem PNG' },
            { id: 'SVG', label: 'Vetorial SVG' },
            { id: 'LATEX', label: 'Código LaTeX (TikZ)' },
            { id: 'GEDCOM', label: 'GEDCOM 5.5.1' },
            { id: 'JSON', label: 'Backup JSON' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-3 px-3.5 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-sky-600 text-sky-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo da Aba */}
        <div className="p-5 flex-1 overflow-y-auto text-xs space-y-4">
          {/* ABA PDF */}
          {activeTab === 'PDF' && (
            <div className="space-y-4">
              <p className="text-slate-600 leading-relaxed">
                Exporta o heredograma em documento PDF paginado, com título da família, data e metadados clínicos em alta nitidez para impressão ou laudos.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tamanho da Página</label>
                  <select
                    value={pdfFormat}
                    onChange={(e) => setPdfFormat(e.target.value as 'a4' | 'a3')}
                    className="w-full p-2 border border-slate-200 rounded bg-white text-slate-800"
                  >
                    <option value="a4">A4 (210 x 297 mm)</option>
                    <option value="a3">A3 (297 x 420 mm - Ideal para árvores grandes)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Orientação</label>
                  <select
                    value={pdfOrientation}
                    onChange={(e) => setPdfOrientation(e.target.value as 'landscape' | 'portrait')}
                    className="w-full p-2 border border-slate-200 rounded bg-white text-slate-800"
                  >
                    <option value="landscape">Paisagem (Horizontal - Recomendado)</option>
                    <option value="portrait">Retrato (Vertical)</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {isExporting ? 'Processando PDF...' : 'Baixar Documento PDF'}
              </button>
            </div>
          )}

          {/* ABA PNG */}
          {activeTab === 'PNG' && (
            <div className="space-y-4">
              <p className="text-slate-600 leading-relaxed">
                Renderiza o heredograma em formato de imagem rasterizada PNG com fundo branco para inclusão em slides, relatórios ou mensagens.
              </p>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Resolução / Escala de Exportação</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 1, label: '1x (Padrão Web)' },
                    { val: 2, label: '2x (Alta Resolução)' },
                    { val: 3, label: '3x (300 DPI Publicação)' },
                  ].map((s) => (
                    <button
                      key={s.val}
                      onClick={() => setPngScale(s.val)}
                      className={`py-2 px-3 rounded border text-center font-medium ${
                        pngScale === s.val
                          ? 'border-sky-600 bg-sky-50 text-sky-900 font-semibold'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleExportPng}
                disabled={isExporting}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {isExporting ? 'Gerando Imagem...' : 'Baixar Imagem PNG'}
              </button>
            </div>
          )}

          {/* ABA SVG */}
          {activeTab === 'SVG' && (
            <div className="space-y-4">
              <p className="text-slate-600 leading-relaxed">
                Exporta o arquivo vetorial puro em formato SVG (Scalable Vector Graphics), permitindo ampliação infinita sem perda de qualidade e edição em softwares como Inkscape, Illustrator ou Figma.
              </p>
              <button
                onClick={handleExportSvg}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                Baixar Arquivo SVG Vetorial
              </button>
            </div>
          )}

          {/* ABA LATEX TIKZ */}
          {activeTab === 'LATEX' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-600 leading-relaxed">
                  Código fonte nativo em <code>TikZ</code> para compilação direta no Overleaf ou distribuição em artigos acadêmicos.
                </p>
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={latexStandalone}
                    onChange={(e) => setLatexStandalone(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-[11px] font-medium text-slate-700">Preâmbulo Completo</span>
                </label>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  value={latexCode}
                  rows={10}
                  className="w-full p-3 font-mono text-[11px] bg-slate-900 text-emerald-400 rounded-lg border border-slate-700 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyLatex}
                  className="flex-1 py-2 px-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedNotice ? '✓ Copiado para a Área de Transferência!' : 'Copiar Código TikZ'}
                </button>
                <button
                  onClick={() => exportLatexFile(project)}
                  className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  Baixar Arquivo .tex
                </button>
              </div>
            </div>
          )}

          {/* ABA GEDCOM */}
          {activeTab === 'GEDCOM' && (
            <div className="space-y-3">
              <p className="text-slate-600 leading-relaxed">
                Padrão internacional GEDCOM 5.5.1 para intercâmbio de dados com softwares genealógicos (Gramps, FamilySearch, MyHeritage).
              </p>
              <textarea
                readOnly
                value={gedcomPreview}
                rows={10}
                className="w-full p-3 font-mono text-[11px] bg-slate-900 text-slate-200 rounded-lg border border-slate-700 focus:outline-none resize-none leading-relaxed"
              />
              <button
                onClick={() => exportGedcomFile(project)}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Baixar Arquivo GEDCOM (.ged)
              </button>
            </div>
          )}

          {/* ABA JSON */}
          {activeTab === 'JSON' && (
            <div className="space-y-4">
              <p className="text-slate-600 leading-relaxed">
                Arquivo de dados completo do projeto em formato JSON estruturado, preservando todas as coordenadas manuais, notas clínicas e relações.
              </p>
              <button
                onClick={() => exportProjectJson(project)}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Baixar Arquivo JSON do Projeto
              </button>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
