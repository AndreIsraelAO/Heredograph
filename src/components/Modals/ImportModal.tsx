/**
 * Modal de Importação de Arquivos GEDCOM e JSON
 * Permite carregar árvores genealógicas e heredogramas existentes.
 */

import React, { useState } from 'react';
import { importFromGedcom } from '../../domain/gedcom';
import { FamilyProject } from '../../domain/types';
import { importProjectJson } from '../../export/exportUtils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (project: FamilyProject) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  if (!isOpen) return null;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fileName = file.name.toLowerCase();
      let importedProject: FamilyProject;

      if (fileName.endsWith('.ged')) {
        const text = await file.text();
        importedProject = importFromGedcom(text);
      } else if (fileName.endsWith('.json')) {
        importedProject = await importProjectJson(file);
      } else {
        throw new Error('Formato de arquivo não suportado. Por favor utilize um arquivo .ged ou .json.');
      }

      onImportSuccess(importedProject);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao processar o arquivo. Verifique se o formato é válido.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Importar Heredograma</h2>
            <p className="text-xs text-slate-500">Formatos compatíveis: GEDCOM 5.5.1 (.ged) e JSON</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg p-1 rounded hover:bg-slate-200/60 leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <label className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-sky-50/50 transition-colors">
            <span className="text-3xl mb-2">📂</span>
            <span className="text-xs font-semibold text-slate-700 mb-1">
              Clique para selecionar ou arraste o arquivo
            </span>
            <span className="text-[11px] text-slate-500">
              Arquivos .ged (GEDCOM) ou .json (HeredoStudio)
            </span>
            <input
              type="file"
              accept=".ged,.json"
              className="hidden"
              onChange={handleInputChange}
            />
          </label>

          {isLoading && (
            <div className="text-center text-xs text-sky-700 font-medium animate-pulse">
              Processando genealogia e calculando conexões...
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
