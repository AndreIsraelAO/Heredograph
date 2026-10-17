/**
 * Modal de Relatório de Integridade Biológica e Validação Cronológica
 * Exibe inconsistências detectadas (ciclos, datas incoerentes, uniões impróprias)
 * com link rápido para focar no indivíduo correspondente.
 */

import React from 'react';
import { FamilyProject, ValidationReport } from '../../domain/types';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ValidationReport;
  project: FamilyProject;
  onFocusPerson: (personId: string) => void;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  report,
  project,
  onFocusPerson,
}) => {
  if (!isOpen) return null;

  const getPersonName = (id: string) => project.persons.find((p) => p.id === id)?.name || id;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden text-xs">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Relatório de Integridade</h2>
            <p className="text-slate-500">
              Verificação em tempo real de ciclos genealógicos e coerência cronológica
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg p-1 rounded hover:bg-slate-200/60 leading-none"
          >
            ✕
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {report.isValid && report.warnings.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <span className="text-4xl">✓</span>
              <h3 className="font-bold text-slate-900 text-sm">Heredograma 100% Consistente!</h3>
              <p className="text-slate-600 text-[11px]">
                Nenhum ciclo de ancestralidade ou inconsistência cronológica foi detectado na estrutura familiar.
              </p>
            </div>
          ) : (
            <>
              {/* Erros Críticos */}
              {report.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="font-bold text-red-700 flex items-center gap-1.5">
                    <span>⛔</span> Erros Críticos ({report.errors.length})
                  </div>
                  {report.errors.map((err) => (
                    <div
                      key={err.id}
                      className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2"
                    >
                      <p className="text-red-900 font-medium">{err.message}</p>
                      <div className="flex gap-2">
                        {err.involvedPersonIds.map((pid) => (
                          <button
                            key={pid}
                            onClick={() => {
                              onFocusPerson(pid);
                              onClose();
                            }}
                            className="text-[10px] bg-red-100 hover:bg-red-200 text-red-800 font-semibold px-2 py-0.5 rounded transition-colors"
                          >
                            Ir para {getPersonName(pid)} ↗
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Avisos Não-Bloqueantes */}
              {report.warnings.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="font-bold text-amber-700 flex items-center gap-1.5">
                    <span>⚠️</span> Avisos Cronológicos ({report.warnings.length})
                  </div>
                  {report.warnings.map((warn) => (
                    <div
                      key={warn.id}
                      className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2"
                    >
                      <p className="text-amber-900">{warn.message}</p>
                      <div className="flex gap-2">
                        {warn.involvedPersonIds.map((pid) => (
                          <button
                            key={pid}
                            onClick={() => {
                              onFocusPerson(pid);
                              onClose();
                            }}
                            className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold px-2 py-0.5 rounded transition-colors"
                          >
                            Ir para {getPersonName(pid)} ↗
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
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
