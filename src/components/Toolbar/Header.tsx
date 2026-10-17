/**
 * Barra Superior Principal (Top Bar Contract)
 * Inclui:
 * - Wordmark HeredoStudio
 * - Seletor de Projetos
 * - Alternador de Modo (Genético vs Genealógico)
 * - Botões dedicados de Desfazer (Undo) e Refazer (Redo) com contadores
 * - Restauração de Layout Automático
 * - Busca de indivíduos com foco automático
 * - Indicador de Validação e Botões de Importação/Exportação/Impressão
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Dices,
  FolderOpen,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { FamilyProject, Person, ViewMode } from '../../domain/types';

interface HeaderProps {
  project: FamilyProject;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  validationErrorCount: number;
  validationWarningCount: number;
  onUndo: () => void;
  onRedo: () => void;
  onToggleViewMode: (mode: ViewMode) => void;
  onResetLayout: () => void;
  onSelectPerson: (personId: string) => void;
  onOpenExportModal: () => void;
  onOpenImportModal: () => void;
  onOpenProjectModal: () => void;
  onOpenValidationModal: () => void;
  onOpenRandomModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  validationErrorCount,
  validationWarningCount,
  onUndo,
  onRedo,
  onToggleViewMode,
  onResetLayout,
  onSelectPerson,
  onOpenExportModal,
  onOpenImportModal,
  onOpenProjectModal,
  onOpenValidationModal,
  onOpenRandomModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-foco ao expandir a busca
  useEffect(() => {
    if (isSearchExpanded) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isSearchExpanded]);

  // Fechar busca ao clicar fora caso esteja vazia
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        if (!searchQuery.trim()) {
          setIsSearchExpanded(false);
          setIsSearchOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  // Filtragem de busca
  const searchResults: Person[] =
    searchQuery.trim().length > 0
      ? project.persons
          .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
          .slice(0, 6)
      : [];

  const handleSelectSearchResult = (personId: string) => {
    onSelectPerson(personId);
    setSearchQuery('');
    setIsSearchOpen(false);
    setIsSearchExpanded(false);
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 z-30 select-none no-print">
      {/* Zona 1: Marca do Sistema + Seletor de Heredogramas */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
            H
          </div>
          <span className="font-bold tracking-tight text-slate-900 text-sm hidden sm:inline">
            HeredoStudio
          </span>
        </div>

        {/* Botão de Gestão de Heredogramas e Troca Rápida */}
        <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
          <button
            onClick={onOpenProjectModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-lg text-xs font-semibold transition-colors border border-slate-200/80 shadow-2xs group cursor-pointer"
            title="Gerenciar, alternar e renomear heredogramas"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-600" />
            <span className="max-w-[100px] md:max-w-[140px] truncate">{project.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform" />
          </button>

          {/* Botão Criar Novo Heredograma */}
          <button
            onClick={onOpenProjectModal}
            className="flex items-center gap-1 px-2 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            title="Criar um novo heredograma em branco ou a partir de modelo"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Novo</span>
          </button>
        </div>
      </div>

      {/* Zona 2: Controles de Edição, Modo, Dado Aleatório e Busca com Lupa Expansível */}
      <div className="flex items-center gap-2 flex-1 max-w-3xl justify-center transition-all duration-300">
        {/* Alternador de Modo de Visualização */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold transition-all">
          <button
            onClick={() => onToggleViewMode('GENETIC')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md transition-all ${
              project.viewMode === 'GENETIC'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className={isSearchExpanded ? 'hidden xl:inline' : 'inline'}>Modo </span>Genético
          </button>
          <button
            onClick={() => onToggleViewMode('GENEALOGICAL')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md transition-all ${
              project.viewMode === 'GENEALOGICAL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className={isSearchExpanded ? 'hidden xl:inline' : 'inline'}>Modo </span>Genealógico
          </button>
        </div>

        {/* Botões Visuais Dedicados de Desfazer e Refazer com Contadores */}
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg transition-all">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title={`Desfazer última alteração (${undoCount} histórico)`}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              canUndo
                ? 'text-slate-800 hover:bg-white hover:shadow-xs active:bg-slate-200 cursor-pointer'
                : 'text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <span>↶</span>
            <span className={isSearchExpanded ? 'hidden lg:inline' : 'inline'}>Desfazer</span>
            {undoCount > 0 && (
              <span className="text-[10px] font-mono text-slate-500 font-semibold">({undoCount})</span>
            )}
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            title={`Refazer alteração (${redoCount} histórico)`}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              canRedo
                ? 'text-slate-800 hover:bg-white hover:shadow-xs active:bg-slate-200 cursor-pointer'
                : 'text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <span>↷</span>
            <span className={isSearchExpanded ? 'hidden lg:inline' : 'inline'}>Refazer</span>
            {redoCount > 0 && (
              <span className="text-[10px] font-mono text-slate-500 font-semibold">({redoCount})</span>
            )}
          </button>
        </div>

        {/* Restaurar Layout Automático (Ícone compacto com texto no hover) */}
        <button
          onClick={onResetLayout}
          title="Restaurar layout automático por gerações"
          className="group relative flex items-center p-2 text-slate-600 hover:text-sky-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer shrink-0"
          aria-label="Restaurar layout automático"
        >
          <RotateCcw className="w-4 h-4 text-slate-500 group-hover:text-sky-600 transition-transform duration-300 group-hover:-rotate-90" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-300 text-xs font-medium text-slate-700">
            Restaurar layout
          </span>
        </button>

        {/* Gerar Heredograma Aleatório (Ícone de Dado com Tooltip e Confirmação) */}
        <button
          onClick={onOpenRandomModal}
          title="Gerar heredograma aleatório com critérios clínicos"
          className="group relative flex items-center p-2 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer shrink-0"
          aria-label="Gerar heredograma aleatório"
        >
          <Dices className="w-4 h-4 text-indigo-500 group-hover:text-indigo-600 group-hover:rotate-12 transition-transform duration-300" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-300 text-xs font-medium text-indigo-700">
            Heredograma Aleatório
          </span>
        </button>

        {/* Busca por Nome: Apenas Lupa Inicialmente -> Expansão Suave ao Clicar */}
        {!isSearchExpanded ? (
          <button
            onClick={() => setIsSearchExpanded(true)}
            title="Buscar indivíduo por nome"
            className="p-2 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-all cursor-pointer shrink-0"
            aria-label="Buscar por nome"
          >
            <Search className="w-4 h-4 text-slate-500 hover:text-sky-600" />
          </button>
        ) : (
          <div
            ref={searchContainerRef}
            className="relative flex items-center transition-all duration-300 ease-out w-48 sm:w-60 md:w-68 shrink-0"
          >
            <div className="relative w-full flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    setIsSearchExpanded(false);
                    setIsSearchOpen(false);
                  }
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-sky-500 rounded-lg bg-white shadow-xs focus:outline-none ring-2 ring-sky-500/20 text-slate-800 transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchExpanded(false);
                  setIsSearchOpen(false);
                }}
                className="absolute right-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-0.5 rounded cursor-pointer transition-colors"
                title="Fechar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Resultados de Autocomplete da Busca */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-xs max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectSearchResult(p.id)}
                    className="w-full px-3 py-2 text-left hover:bg-sky-50 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-slate-900 truncate">{p.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {p.sex === 'M' ? 'Homem' : p.sex === 'F' ? 'Mulher' : 'Outro'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Botão de Validação / Notificações de Integridade */}
        <button
          onClick={onOpenValidationModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 ${
            validationErrorCount > 0
              ? 'bg-red-100 text-red-800 hover:bg-red-200'
              : validationWarningCount > 0
              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          }`}
          title="Ver relatório de integridade cronológica e de parentesco"
        >
          <span>{validationErrorCount > 0 ? '⛔' : validationWarningCount > 0 ? '⚠️' : '✓'}</span>
          <span className={isSearchExpanded ? 'hidden xl:inline' : 'inline'}>
            {validationErrorCount > 0
              ? `${validationErrorCount} Erros`
              : validationWarningCount > 0
              ? `${validationWarningCount} Avisos`
              : 'Integridade OK'}
          </span>
        </button>
      </div>

      {/* Zona 3: Ações Primárias (Importar / Exportar / Imprimir) */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenImportModal}
          title="Importar de GEDCOM ou JSON"
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
        >
          Importar
        </button>

        <button
          onClick={onOpenExportModal}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors whitespace-nowrap"
        >
          Exportar
        </button>

        <button
          onClick={() => window.print()}
          title="Imprimir heredograma limpo em tela cheia"
          className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap hidden sm:block"
        >
          🖨️
        </button>
      </div>
    </header>
  );
};
