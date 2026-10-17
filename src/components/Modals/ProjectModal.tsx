/**
 * Modal de Gerenciamento de Projetos e Criação de Novo Heredograma
 * Permite alternar entre árvores salvas no IndexedDB, duplicar, excluir e criar novos estudos.
 */

import React, { useState } from 'react';
import { CLINICAL_DEMO_PROJECT, GENEALOGICAL_DEMO_PROJECT } from '../../domain/samples';
import { FamilyProject } from '../../domain/types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: FamilyProject[];
  currentProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (newProject: FamilyProject) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
}) => {
  if (!isOpen) return null;

  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [diseaseName, setDiseaseName] = useState('');
  const [inheritancePattern, setInheritancePattern] = useState('Autossômica Dominante');
  const [template, setTemplate] = useState<'EMPTY' | 'CLINICAL' | 'GENEALOGICAL'>('EMPTY');

  const handleCreate = () => {
    const name = newProjectName.trim() || 'Novo Heredograma';
    let base: FamilyProject;

    if (template === 'CLINICAL') {
      base = {
        ...CLINICAL_DEMO_PROJECT,
        id: `project-${Date.now()}`,
        name,
        diseaseName: diseaseName || CLINICAL_DEMO_PROJECT.diseaseName,
        inheritancePattern: inheritancePattern || CLINICAL_DEMO_PROJECT.inheritancePattern,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else if (template === 'GENEALOGICAL') {
      base = {
        ...GENEALOGICAL_DEMO_PROJECT,
        id: `project-${Date.now()}`,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Projeto em branco com probando inicial
      base = {
        id: `project-${Date.now()}`,
        name,
        diseaseName: diseaseName || undefined,
        inheritancePattern: inheritancePattern || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewMode: 'GENETIC',
        persons: [
          {
            id: `p-${Date.now()}-1`,
            name: 'Paciente Índice (Probando)',
            sex: 'M',
            clinicalStatus: 'AFFECTED',
            isProband: true,
            isConsultand: true,
            notes: 'Probando inicial para montagem do heredograma.',
          },
        ],
        unions: [],
        parentChildRelations: [],
      };
    }

    onCreateProject(base);
    setIsCreating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full flex flex-col max-h-[85vh] overflow-hidden text-xs">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isCreating ? 'Novo Estudo Familiar' : 'Heredogramas e Projetos'}
            </h2>
            <p className="text-slate-500">
              {isCreating
                ? 'Configure o nome e modelo inicial para a nova árvore'
                : 'Selecione ou crie árvores familiares salvas no navegador'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg p-1 rounded hover:bg-slate-200/60 leading-none"
          >
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {!isCreating ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Projetos Salvos ({projects.length})</span>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-1"
                >
                  <span>+</span> Novo Heredograma
                </button>
              </div>

              <div className="space-y-2">
                {projects.map((p) => {
                  const isActive = p.id === currentProjectId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        onSelectProject(p.id);
                        onClose();
                      }}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'border-sky-600 bg-sky-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="space-y-0.5 truncate pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs truncate">{p.name}</span>
                          {isActive && (
                            <span className="bg-sky-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                              Ativo
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{p.persons.length} pessoas</span>
                          <span>·</span>
                          <span>{p.unions.length} uniões</span>
                          {p.diseaseName && (
                            <>
                              <span>·</span>
                              <span className="text-sky-800 font-medium">{p.diseaseName}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {projects.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Deseja realmente excluir o projeto "${p.name}"?`)) {
                              onDeleteProject(p.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition-colors"
                          title="Excluir projeto"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Formulário de Criação */
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Título do Heredograma</label>
                <input
                  type="text"
                  placeholder="Ex: Família Oliveira - Estudo de Hemofilia"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Condição Genética / Doença</label>
                  <input
                    type="text"
                    placeholder="Opcional (Ex: Doença de Huntington)"
                    value={diseaseName}
                    onChange={(e) => setDiseaseName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Padrão de Herança</label>
                  <select
                    value={inheritancePattern}
                    onChange={(e) => setInheritancePattern(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="Autossômica Dominante">Autossômica Dominante</option>
                    <option value="Autossômica Recessiva">Autossômica Recessiva</option>
                    <option value="Ligada ao X Dominante">Ligada ao X Dominante</option>
                    <option value="Ligada ao X Recessiva">Ligada ao X Recessiva</option>
                    <option value="Mitocondrial">Mitocondrial</option>
                    <option value="Não especificado">Não especificado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Ponto de Partida</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'EMPTY', title: 'Em Branco', desc: 'Inicia com um probando' },
                    { id: 'CLINICAL', title: 'Modelo Clínico', desc: '3 gerações com recessividade' },
                    { id: 'GENEALOGICAL', title: 'Genealogia', desc: 'Árvore familiar histórica' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplate(t.id as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        template === t.id
                          ? 'border-sky-600 bg-sky-50 text-sky-950 font-semibold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold">{t.title}</div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Criar Heredograma
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        {!isCreating && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
