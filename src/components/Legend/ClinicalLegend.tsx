/**
 * Componente de Legenda Clínica e Genealógica Oficial
 * Apresenta o significado visual dos símbolos médicos de heredogramas
 * e notações genealógicas, com controle de recolhimento.
 */

import React, { useState } from 'react';
import { ViewMode } from '../../domain/types';

interface ClinicalLegendProps {
  viewMode: ViewMode;
  diseaseName?: string;
  inheritancePattern?: string;
}

export const ClinicalLegend: React.FC<ClinicalLegendProps> = ({
  viewMode,
  diseaseName,
  inheritancePattern,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <div className="absolute bottom-5 left-5 z-10 no-print">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur border border-slate-200 shadow-sm rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span>ℹ️</span> Ver Legenda
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-5 left-5 w-80 bg-white/95 backdrop-blur border border-slate-200 shadow-md rounded-xl p-3.5 z-10 text-xs no-print select-none">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-900 text-xs tracking-tight">
            {viewMode === 'GENETIC' ? 'Legenda do Heredograma Clínico' : 'Legenda Genealógica'}
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-600 text-sm px-1 leading-none rounded hover:bg-slate-100"
          title="Recolher legenda"
        >
          ✕
        </button>
      </div>

      {/* Identificação de Doença / Padrão se houver */}
      {viewMode === 'GENETIC' && (diseaseName || inheritancePattern) && (
        <div className="mb-2.5 p-2 bg-sky-50/70 border border-sky-100 rounded text-[11px] text-sky-950">
          {diseaseName && (
            <div>
              <span className="font-semibold">Condição:</span> {diseaseName}
            </div>
          )}
          {inheritancePattern && (
            <div>
              <span className="font-semibold">Padrão:</span> {inheritancePattern}
            </div>
          )}
        </div>
      )}

      {/* Grade de Símbolos */}
      {viewMode === 'GENETIC' ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-slate-700">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" className="shrink-0">
              <rect x="2" y="2" width="14" height="14" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
            </svg>
            <span>Masculino</span>
          </div>

          <div className="flex items-center gap-2">
            <svg width="18" height="18" className="shrink-0">
              <circle cx="9" cy="9" r="7" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
            </svg>
            <span>Feminino</span>
          </div>

          <div className="flex items-center gap-2">
            <svg width="18" height="18" className="shrink-0">
              <polygon points="9,2 16,9 9,16 2,9" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
            </svg>
            <span>Outro / Não inf.</span>
          </div>

          <div className="flex items-center gap-2">
            <svg width="18" height="18" className="shrink-0">
              <rect x="2" y="2" width="14" height="14" fill="#0F172A" stroke="#0F172A" strokeWidth="2" />
            </svg>
            <span className="font-medium text-slate-900">Afetado</span>
          </div>

          <div className="flex items-center gap-2">
            <svg width="18" height="18" className="shrink-0">
              <rect x="2" y="2" width="14" height="14" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
              <circle cx="9" cy="9" r="3" fill="#0F172A" />
            </svg>
            <span>Portador</span>
          </div>

          <div className="flex items-center gap-2">
            <svg width="18" height="18" className="shrink-0">
              <rect x="2" y="2" width="14" height="14" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
              <line x1="1" y1="17" x2="17" y2="1" stroke="#0F172A" strokeWidth="2" />
            </svg>
            <span>Falecido</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-sky-600 text-sm leading-none pl-1">↗ P</span>
            <span className="font-medium text-sky-800">Probando</span>
          </div>

          <div className="flex items-center gap-2">
            <svg width="24" height="14" className="shrink-0">
              <line x1="0" y1="5" x2="24" y2="5" stroke="#0F172A" strokeWidth="1.5" />
              <line x1="0" y1="9" x2="24" y2="9" stroke="#0F172A" strokeWidth="1.5" />
            </svg>
            <span>Consanguíneo</span>
          </div>

          <div className="flex items-center gap-2">
            <svg width="24" height="14" className="shrink-0">
              <line x1="12" y1="1" x2="4" y2="13" stroke="#0F172A" strokeWidth="1.5" />
              <line x1="12" y1="1" x2="20" y2="13" stroke="#0F172A" strokeWidth="1.5" />
            </svg>
            <span>Gêmeos Dizigóticos</span>
          </div>

          <div className="flex items-center gap-2">
            <svg width="24" height="14" className="shrink-0">
              <line x1="12" y1="1" x2="4" y2="13" stroke="#0F172A" strokeWidth="1.5" />
              <line x1="12" y1="1" x2="20" y2="13" stroke="#0F172A" strokeWidth="1.5" />
              <line x1="7" y1="7" x2="17" y2="7" stroke="#0F172A" strokeWidth="1.5" />
            </svg>
            <span>Monozigóticos</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 text-[11px] text-slate-700">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shrink-0" />
            <span>Indivíduo Masculino</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-pink-500 inline-block shrink-0" />
            <span>Indivíduo Feminino</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-500 font-bold">*</span>
            <span>Ano de Nascimento</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-500 font-bold">†</span>
            <span>Ano de Falecimento</span>
          </div>
        </div>
      )}
    </div>
  );
};
