/**
 * Modal de Geração de Heredograma Aleatório com Critérios Delimitados e Confirmação de Substituição
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Dices,
  Sparkles,
  X,
  Users,
  Activity,
  GitBranch,
} from 'lucide-react';
import {
  AffectedRate,
  FamilySize,
  generateRandomPedigree,
  GenerationCount,
  InheritanceType,
} from '../../domain/randomPedigreeGenerator';
import { FamilyProject } from '../../domain/types';

interface RandomPedigreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectName: string;
  onGenerate: (newProject: FamilyProject) => void;
}

export const RandomPedigreeModal: React.FC<RandomPedigreeModalProps> = ({
  isOpen,
  onClose,
  currentProjectName,
  onGenerate,
}) => {
  if (!isOpen) return null;

  // Estados dos critérios delimitados
  const [generations, setGenerations] = useState<GenerationCount>(3);
  const [familySize, setFamilySize] = useState<FamilySize>('MEDIUM');
  const [inheritance, setInheritance] = useState<InheritanceType>('AUTOSOMAL_DOMINANT');
  const [affectedRate, setAffectedRate] = useState<AffectedRate>('MEDIUM');
  const [includeConsanguinity, setIncludeConsanguinity] = useState(false);
  const [setProband, setSetProband] = useState(true);
  const [customName, setCustomName] = useState('');

  // Confirmação explícita de substituição
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleGenerate = () => {
    if (!isConfirmed) return;

    const newProject = generateRandomPedigree({
      projectName: customName.trim() || undefined,
      generations,
      familySize,
      inheritance,
      affectedRate,
      includeConsanguinity,
      setProband,
    });

    onGenerate(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Gerar Heredograma Aleatório
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                  Simulação Clínica
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Configure os parâmetros de estudo para simular uma nova árvore familiar válida.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Formulário de Critérios e Aviso de Confirmação */}
        <div className="px-6 py-5 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1">
          {/* Passo de Confirmação / Aviso de Substituição */}
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-950 space-y-2.5 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-semibold text-xs text-amber-900">
                  Confirmação de Substituição de Heredograma
                </h3>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Ao gerar um heredograma aleatório, o heredograma atual{' '}
                  <strong className="font-semibold text-amber-950">&ldquo;{currentProjectName}&rdquo;</strong>{' '}
                  será excluído e substituído pelo novo heredograma simulado. Se você deseja manter o atual, feche este assistente e use o botão <strong className="font-semibold">Exportar</strong> antes.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2.5 pt-1.5 border-t border-amber-200/80 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-amber-400 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-amber-900">
                Estou ciente e confirmo que o heredograma anterior será excluído
              </span>
            </label>
          </div>

          {/* Critério 1: Número de Gerações (Limites Delimitados: 2, 3 ou 4) */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                Número de Gerações (2 a 4)
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                {generations === 2
                  ? 'I e II (Pais e Filhos)'
                  : generations === 3
                  ? 'I, II e III (Avós a Netos)'
                  : 'I a IV (Bisavós a Bisnetos)'}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 2, label: '2 Gerações', desc: 'Pais e Filhos' },
                { value: 3, label: '3 Gerações', desc: 'Recomendado (Avós a Netos)' },
                { value: 4, label: '4 Gerações', desc: 'Bisavós a Bisnetos' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGenerations(opt.value as GenerationCount)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    generations === opt.value
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 text-indigo-950 font-semibold'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Critério 2: Padrão de Herança Genética */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              Padrão de Herança Genética
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  value: 'AUTOSOMAL_DOMINANT',
                  label: 'Autossômica Dominante',
                  desc: 'Ex: Doença de Huntington, Síndrome de Marfan, NF1',
                },
                {
                  value: 'AUTOSOMAL_RECESSIVE',
                  label: 'Autossômica Recessiva',
                  desc: 'Ex: Fibrose Cística, Anemia Falciforme, AME',
                },
                {
                  value: 'X_LINKED_RECESSIVE',
                  label: 'Ligada ao X Recessiva',
                  desc: 'Ex: Hemofilia A, Duchenne, Daltonismo',
                },
                {
                  value: 'NONE',
                  label: 'Genealógico / Neutro',
                  desc: 'Apenas genealogia pura, sem fenótipos de afecção',
                },
                {
                  value: 'RANDOM',
                  label: 'Sorteio Aleatório',
                  desc: 'O sistema escolhe um padrão clínico aleatório',
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setInheritance(opt.value as InheritanceType)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    inheritance === opt.value
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 text-indigo-950 font-semibold'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Critério 3: Tamanho da Família & Prevalência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Média de Filhos */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Média de Filhos por Casal
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 'SMALL', label: '1 a 2', sub: 'Pequena' },
                  { value: 'MEDIUM', label: '2 a 3', sub: 'Média' },
                  { value: 'LARGE', label: '3 a 4', sub: 'Grande' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFamilySize(opt.value as FamilySize)}
                    className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                      familySize === opt.value
                        ? 'border-indigo-600 bg-indigo-50/60 font-semibold text-indigo-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[9px] text-slate-500">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Taxa de Afetados */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Frequência de Afetados
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 'LOW', label: 'Baixa', sub: '~25%' },
                  { value: 'MEDIUM', label: 'Média', sub: '~38%' },
                  { value: 'HIGH', label: 'Alta', sub: '~50%' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAffectedRate(opt.value as AffectedRate)}
                    className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                      affectedRate === opt.value
                        ? 'border-indigo-600 bg-indigo-50/60 font-semibold text-indigo-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[9px] text-slate-500">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Critério 4: Opções Adicionais (Consanguinidade e Probando) */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="font-semibold text-slate-800">Opções Específicas:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeConsanguinity}
                  onChange={(e) => setIncludeConsanguinity(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-semibold text-xs text-slate-800">Casamento Consanguíneo</div>
                  <div className="text-[10px] text-slate-500">
                    Inclui linha dupla de consanguinidade entre parceiros
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={setProband}
                  onChange={(e) => setSetProband(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-semibold text-xs text-slate-800">Destacar Probando (P)</div>
                  <div className="text-[10px] text-slate-500">
                    Seta clínica no caso índice que buscou consulta
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Nome opcional do projeto */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 text-xs">
              Nome do Novo Heredograma (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: Família Oliveira - Estudo Clínico (ou gerado automaticamente)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            {isConfirmed ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirmação aceita
              </span>
            ) : (
              <span className="text-amber-700 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Marque a confirmação para liberar a geração
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!isConfirmed}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
                isConfirmed
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 cursor-pointer active:scale-[0.98]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-75'
              }`}
            >
              <Dices className="w-4 h-4" />
              <span>Substituir e Gerar Heredograma</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
