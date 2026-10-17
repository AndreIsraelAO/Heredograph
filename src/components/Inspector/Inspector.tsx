/**
 * Painel Lateral (Inspector) para Visualização e Edição da Pessoa Selecionada
 * Oferece edição de dados pessoais, parâmetros clínicos de genética médica,
 * criação de parentescos (novos ou vinculando pessoas JÁ PRESENTES no heredograma)
 * e avisos de validação.
 */

import React, { useState } from 'react';
import {
  ClinicalStatus,
  FamilyProject,
  FiliationType,
  Person,
  Sex,
  TwinType,
  UnionType,
  ValidationError,
} from '../../domain/types';
import { wouldCreateCycle } from '../../domain/validation';

interface InspectorProps {
  person: Person | null;
  project: FamilyProject;
  validationIssues: ValidationError[];
  onUpdatePerson: (updated: Person) => void;
  onDeletePerson: (personId: string) => void;
  onAddParents: (childId: string) => void;
  onAddSpouse: (personId: string, spouseSex: Sex) => void;
  onAddChild: (parentOrUnionId: string, filiationType: FiliationType) => void;
  onAddSiblingOrTwin: (personId: string, isTwin: boolean, twinType?: TwinType) => void;
  onLinkExistingSpouse: (
    personId: string,
    partnerId: string,
    type: UnionType,
    isConsanguineous: boolean
  ) => void;
  onLinkExistingSibling: (
    personId: string,
    existingSiblingId: string,
    isTwin: boolean,
    twinType?: TwinType
  ) => void;
  onLinkExistingParents: (childId: string, unionId: string) => void;
  onToggleConsanguinity: (unionId: string) => void;
  onClose: () => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  person,
  project,
  validationIssues,
  onUpdatePerson,
  onDeletePerson,
  onAddParents,
  onAddSpouse,
  onAddChild,
  onAddSiblingOrTwin,
  onLinkExistingSpouse,
  onLinkExistingSibling,
  onLinkExistingParents,
  onToggleConsanguinity,
  onClose,
}) => {
  if (!person) return null;

  const [activeTab, setActiveTab] = useState<'BIO' | 'CLINICAL' | 'RELATIONS'>('RELATIONS');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Estados dos formulários de vinculação de pessoas existentes
  const [isLinkingSpouse, setIsLinkingSpouse] = useState(false);
  const [selectedSpouseId, setSelectedSpouseId] = useState<string>('');
  const [unionType, setUnionType] = useState<UnionType>('MARRIAGE');
  const [isConsanguineousUnion, setIsConsanguineousUnion] = useState(false);

  const [isLinkingSibling, setIsLinkingSibling] = useState(false);
  const [selectedSiblingId, setSelectedSiblingId] = useState<string>('');
  const [isTwinSibling, setIsTwinSibling] = useState(false);
  const [siblingTwinType, setSiblingTwinType] = useState<TwinType>('DIZYGOTIC');

  const [isLinkingParents, setIsLinkingParents] = useState(false);
  const [selectedParentUnionId, setSelectedParentUnionId] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);

  // Problemas de validação envolvendo esta pessoa
  const issues = validationIssues.filter((i) => i.involvedPersonIds.includes(person.id));

  // Localiza uniões da pessoa
  const personUnions = project.unions.filter(
    (u) => u.partner1Id === person.id || u.partner2Id === person.id
  );

  // Parceiros atuais da pessoa
  const currentPartnerIds = new Set(
    personUnions.map((u) => (u.partner1Id === person.id ? u.partner2Id : u.partner1Id))
  );

  // Localiza pais biológicos ou legais da pessoa
  const parentFiliation = project.parentChildRelations.find((r) => r.childId === person.id);
  const parentUnion = parentFiliation?.unionId
    ? project.unions.find((u) => u.id === parentFiliation.unionId)
    : null;

  // Irmãos atuais (compartilham a mesma união de pais)
  const currentSiblingIds = new Set<string>();
  if (parentFiliation?.unionId) {
    project.parentChildRelations
      .filter((r) => r.unionId === parentFiliation.unionId)
      .forEach((r) => currentSiblingIds.add(r.childId));
  } else {
    currentSiblingIds.add(person.id);
  }

  // Candidatos para Cônjuge Existente (outras pessoas que ainda não são parceiros e não são a própria pessoa)
  const candidateSpouses = project.persons.filter(
    (p) => p.id !== person.id && !currentPartnerIds.has(p.id)
  );

  // Candidatos para Irmão Existente (outras pessoas que ainda não estão no grupo de irmãos)
  const candidateSiblings = project.persons.filter(
    (p) => p.id !== person.id && !currentSiblingIds.has(p.id)
  );

  // Candidatos para Pais Existentes (uniões existentes no projeto)
  const candidateParentUnions = project.unions.filter((u) => {
    // Não pode ter a própria pessoa como membro da união de pais
    return u.partner1Id !== person.id && u.partner2Id !== person.id;
  });

  const handleFieldChange = <K extends keyof Person>(key: K, value: Person[K]) => {
    onUpdatePerson({
      ...person,
      [key]: value,
    });
  };

  /**
   * Submete a vinculação de cônjuge existente
   */
  const handleConfirmLinkSpouse = () => {
    if (!selectedSpouseId) {
      setFormError('Selecione uma pessoa da lista para estabelecer a união.');
      return;
    }

    setFormError(null);
    onLinkExistingSpouse(person.id, selectedSpouseId, unionType, isConsanguineousUnion);
    setIsLinkingSpouse(false);
    setSelectedSpouseId('');
  };

  /**
   * Submete a vinculação de irmão existente
   */
  const handleConfirmLinkSibling = () => {
    if (!selectedSiblingId) {
      setFormError('Selecione uma pessoa da lista para definir como irmão(ã).');
      return;
    }

    setFormError(null);
    onLinkExistingSibling(person.id, selectedSiblingId, isTwinSibling, siblingTwinType);
    setIsLinkingSibling(false);
    setSelectedSiblingId('');
    setIsTwinSibling(false);
  };

  /**
   * Submete a vinculação de pais existentes
   */
  const handleConfirmLinkParents = () => {
    if (!selectedParentUnionId) {
      setFormError('Selecione um casal da lista de pais.');
      return;
    }

    const union = project.unions.find((u) => u.id === selectedParentUnionId);
    if (union) {
      if (
        wouldCreateCycle(person.id, union.partner1Id, project) ||
        wouldCreateCycle(person.id, union.partner2Id, project)
      ) {
        setFormError(
          'Esta filiação criaria um ciclo de ancestralidade inválido (um indivíduo não pode ser ancestral de si mesmo).'
        );
        return;
      }
    }

    setFormError(null);
    onLinkExistingParents(person.id, selectedParentUnionId);
    setIsLinkingParents(false);
    setSelectedParentUnionId('');
  };

  return (
    <aside className="w-80 md:w-96 bg-white border-l border-slate-200 h-full flex flex-col shadow-lg z-20 overflow-hidden no-print">
      {/* Cabeçalho do Inspector */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2 truncate">
          <div
            className={`w-3.5 h-3.5 shrink-0 ${
              person.sex === 'M'
                ? 'bg-blue-600'
                : person.sex === 'F'
                ? 'rounded-full bg-pink-500'
                : 'rotate-45 bg-slate-600'
            }`}
          />
          <h2 className="font-semibold text-slate-900 text-sm truncate">
            {person.name || 'Sem nome'}
          </h2>
          {person.generation && (
            <span className="text-xs font-mono text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
              Geração {person.generation}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
          title="Fechar painel"
          aria-label="Fechar painel"
        >
          ✕
        </button>
      </div>

      {/* Alertas de Validação Biológica / Cronológica para a Pessoa */}
      {issues.length > 0 && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs flex flex-col gap-1.5">
          {issues.map((iss) => (
            <div
              key={iss.id}
              className={`p-1.5 rounded ${
                iss.type === 'ERROR'
                  ? 'bg-red-100/80 text-red-800'
                  : 'bg-amber-100/80 text-amber-900'
              }`}
            >
              <span className="font-semibold">{iss.type === 'ERROR' ? 'Erro: ' : 'Aviso: '}</span>
              {iss.message}
            </div>
          ))}
        </div>
      )}

      {/* Abas do Inspector */}
      <div className="flex border-b border-slate-200 bg-slate-50/80 text-xs font-medium">
        <button
          onClick={() => setActiveTab('RELATIONS')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'RELATIONS'
              ? 'border-sky-600 text-sky-700 font-semibold bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Parentesco
        </button>
        <button
          onClick={() => setActiveTab('CLINICAL')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'CLINICAL'
              ? 'border-sky-600 text-sky-700 font-semibold bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Clínico / Genético
        </button>
        <button
          onClick={() => setActiveTab('BIO')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'BIO'
              ? 'border-sky-600 text-sky-700 font-semibold bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Dados Pessoais
        </button>
      </div>

      {/* Conteúdo com Scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* ABA PARENTESCO E AÇÕES RÁPIDAS */}
        {activeTab === 'RELATIONS' && (
          <div className="space-y-4">
            {formError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-[11px] leading-tight">
                {formError}
              </div>
            )}

            {/* SEÇÃO 1: PAIS */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-xs">Pais / Ascendência</span>
                {parentUnion && (
                  <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Definidos
                  </span>
                )}
              </div>

              {!parentUnion ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAddParents(person.id)}
                      className="py-1.5 px-2 bg-sky-600 hover:bg-sky-700 text-white rounded font-medium text-center text-[11px] transition-colors"
                    >
                      ▲ Criar Novos Pais
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLinkingParents(!isLinkingParents);
                        setFormError(null);
                      }}
                      className="py-1.5 px-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded font-medium text-center text-[11px] transition-colors"
                    >
                      🔗 Pais Existentes
                    </button>
                  </div>

                  {/* Formulário Inline: Vincular a Pais / Casal Existente */}
                  {isLinkingParents && (
                    <div className="p-2.5 bg-white border border-sky-200 rounded-md space-y-2 mt-2">
                      <label className="block text-[11px] font-medium text-slate-700">
                        Selecione o casal de pais existente:
                      </label>
                      {candidateParentUnions.length > 0 ? (
                        <select
                          value={selectedParentUnionId}
                          onChange={(e) => setSelectedParentUnionId(e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800"
                        >
                          <option value="">-- Escolha um casal existente --</option>
                          {candidateParentUnions.map((u) => {
                            const p1 = project.persons.find((p) => p.id === u.partner1Id);
                            const p2 = project.persons.find((p) => p.id === u.partner2Id);
                            return (
                              <option key={u.id} value={u.id}>
                                {p1?.name || u.partner1Id} & {p2?.name || u.partner2Id}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          Nenhum casal existente elegível cadastrado no heredograma.
                        </p>
                      )}

                      <div className="flex gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={handleConfirmLinkParents}
                          disabled={!selectedParentUnionId}
                          className="flex-1 py-1 px-2 bg-sky-600 text-white rounded font-medium hover:bg-sky-700 disabled:opacity-50 text-[11px]"
                        >
                          Confirmar Filiação
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsLinkingParents(false)}
                          className="py-1 px-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-[11px]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-slate-600">
                  {(() => {
                    const p1 = project.persons.find((p) => p.id === parentUnion.partner1Id);
                    const p2 = project.persons.find((p) => p.id === parentUnion.partner2Id);
                    return (
                      <span>
                        Filho(a) de <strong>{p1?.name}</strong> e <strong>{p2?.name}</strong>.
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* SEÇÃO 2: CÔNJUGES E UNIÕES (NOVO OU EXISTENTE) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-xs">
                  Cônjuges & Parceiros ({personUnions.length})
                </span>
              </div>

              {/* Botões de Ação para Cônjuge */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onAddSpouse(person.id, person.sex === 'M' ? 'F' : 'M')}
                  className="py-1.5 px-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded font-medium text-center text-[11px] transition-colors"
                >
                  + Novo Cônjuge
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLinkingSpouse(!isLinkingSpouse);
                    setFormError(null);
                  }}
                  className={`py-1.5 px-2 rounded font-medium text-center text-[11px] transition-colors ${
                    isLinkingSpouse
                      ? 'bg-sky-600 text-white'
                      : 'bg-sky-50 border border-sky-300 text-sky-800 hover:bg-sky-100'
                  }`}
                >
                  🔗 Cônjuge Existente
                </button>
              </div>

              {/* Formulário Inline: Vincular Cônjuge Já Presente */}
              {isLinkingSpouse && (
                <div className="p-2.5 bg-white border border-sky-200 rounded-md space-y-2 mt-2">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Selecione alguém já presente no heredograma:
                  </label>
                  {candidateSpouses.length > 0 ? (
                    <select
                      value={selectedSpouseId}
                      onChange={(e) => setSelectedSpouseId(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800"
                    >
                      <option value="">-- Escolha um cônjuge existente --</option>
                      {candidateSpouses.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sex === 'M' ? 'Homem' : p.sex === 'F' ? 'Mulher' : 'Outro'})
                          {p.generation ? ` - Geração ${p.generation}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      Não há outras pessoas disponíveis para casar neste heredograma.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-600 font-medium">Tipo</label>
                      <select
                        value={unionType}
                        onChange={(e) => setUnionType(e.target.value as UnionType)}
                        className="w-full p-1 border border-slate-300 rounded text-[11px] bg-white"
                      >
                        <option value="MARRIAGE">Casamento</option>
                        <option value="CIVIL_UNION">União Estável</option>
                        <option value="NON_FORMAL">Não formalizada</option>
                        <option value="DIVORCED">Divorciados</option>
                      </select>
                    </div>
                    <div className="flex items-center pt-3">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-700 font-medium">
                        <input
                          type="checkbox"
                          checked={isConsanguineousUnion}
                          onChange={(e) => setIsConsanguineousUnion(e.target.checked)}
                          className="rounded border-slate-300 text-sky-600"
                        />
                        <span>Consanguíneo</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handleConfirmLinkSpouse}
                      disabled={!selectedSpouseId}
                      className="flex-1 py-1 px-2 bg-sky-600 text-white rounded font-medium hover:bg-sky-700 disabled:opacity-50 text-[11px]"
                    >
                      Confirmar Casamento
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLinkingSpouse(false)}
                      className="py-1 px-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-[11px]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Uniões Ativas da Pessoa */}
              {personUnions.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {personUnions.map((u) => {
                    const partnerId = u.partner1Id === person.id ? u.partner2Id : u.partner1Id;
                    const partner = project.persons.find((p) => p.id === partnerId);
                    return (
                      <div key={u.id} className="p-2 bg-white border border-slate-200 rounded space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-800 text-[11px] truncate">
                            ⚭ {partner?.name || 'Parceiro'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggleConsanguinity(u.id)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              u.isConsanguineous
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {u.isConsanguineous ? 'Consanguíneo (Linha Dupla)' : 'Tornar Consanguíneo'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onAddChild(u.id, 'BIOLOGICAL')}
                          className="w-full py-1 px-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-center text-[10px] font-medium"
                        >
                          + Adicionar Filho(a) deste Casal
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SEÇÃO 3: IRMÃOS E GÊMEOS (NOVO OU EXISTENTE) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-xs">Irmãos & Gêmeos</span>
              </div>

              {/* Botões de Ação para Irmão */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onAddSiblingOrTwin(person.id, false)}
                  className="py-1.5 px-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded font-medium text-center text-[11px] transition-colors"
                >
                  + Novo Irmão(ã)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLinkingSibling(!isLinkingSibling);
                    setFormError(null);
                  }}
                  className={`py-1.5 px-2 rounded font-medium text-center text-[11px] transition-colors ${
                    isLinkingSibling
                      ? 'bg-sky-600 text-white'
                      : 'bg-sky-50 border border-sky-300 text-sky-800 hover:bg-sky-100'
                  }`}
                >
                  🔗 Irmão Existente
                </button>
              </div>

              <button
                type="button"
                onClick={() => onAddSiblingOrTwin(person.id, true, 'DIZYGOTIC')}
                className="w-full py-1.5 px-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded font-medium text-center text-[11px] transition-colors"
              >
                + Adicionar Novo Irmão Gêmeo(a)
              </button>

              {/* Formulário Inline: Vincular Irmão Já Presente no Heredograma */}
              {isLinkingSibling && (
                <div className="p-2.5 bg-white border border-sky-200 rounded-md space-y-2 mt-2">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Selecione a pessoa existente para tornar irmão(ã):
                  </label>
                  {candidateSiblings.length > 0 ? (
                    <select
                      value={selectedSiblingId}
                      onChange={(e) => setSelectedSiblingId(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800"
                    >
                      <option value="">-- Escolha um indivíduo existente --</option>
                      {candidateSiblings.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sex === 'M' ? 'Homem' : p.sex === 'F' ? 'Mulher' : 'Outro'})
                          {p.generation ? ` - Geração ${p.generation}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      Não há outros indivíduos disponíveis para associar como irmãos.
                    </p>
                  )}

                  {/* Opção de Gêmeo */}
                  <div className="pt-1 space-y-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={isTwinSibling}
                        onChange={(e) => setIsTwinSibling(e.target.checked)}
                        className="rounded border-slate-300 text-sky-600"
                      />
                      <span>Vincular como Gêmeo(a)</span>
                    </label>

                    {isTwinSibling && (
                      <div className="pl-5 grid grid-cols-2 gap-2 text-[10px]">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="siblingTwinType"
                            checked={siblingTwinType === 'DIZYGOTIC'}
                            onChange={() => setSiblingTwinType('DIZYGOTIC')}
                            className="text-sky-600"
                          />
                          <span>Dizigótico (Fraterno)</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="siblingTwinType"
                            checked={siblingTwinType === 'MONOZYGOTIC'}
                            onChange={() => setSiblingTwinType('MONOZYGOTIC')}
                            className="text-sky-600"
                          />
                          <span>Monozigótico (Idêntico)</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handleConfirmLinkSibling}
                      disabled={!selectedSiblingId}
                      className="flex-1 py-1 px-2 bg-sky-600 text-white rounded font-medium hover:bg-sky-700 disabled:opacity-50 text-[11px]"
                    >
                      Confirmar Parentesco
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLinkingSibling(false)}
                      className="py-1 px-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-[11px]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Redefinição de Posição Manual */}
            {(person.customX !== undefined || person.customY !== undefined) && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdatePerson({
                      ...person,
                      customX: undefined,
                      customY: undefined,
                    });
                  }}
                  className="w-full py-1.5 px-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50"
                >
                  Restaurar Layout Automático deste Nó
                </button>
              </div>
            )}
          </div>
        )}

        {/* ABA CLÍNICA */}
        {activeTab === 'CLINICAL' && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1.5">Status Fenotípico / Clínico</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'UNAFFECTED', label: 'Não Afetado (Normal)', symbol: '□' },
                  { value: 'AFFECTED', label: 'Afetado', symbol: '■' },
                  { value: 'CARRIER', label: 'Portador (Heterozigoto)', symbol: '⊙' },
                  { value: 'UNKNOWN', label: 'Desconhecido', symbol: '?' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleFieldChange('clinicalStatus', item.value as ClinicalStatus)}
                    className={`p-2 rounded border text-left flex items-center gap-2 transition-colors ${
                      person.clinicalStatus === item.value
                        ? 'border-sky-600 bg-sky-50 text-sky-950 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base font-mono leading-none">{item.symbol}</span>
                    <span className="text-[11px] leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Parâmetros Médicos */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!person.isProband}
                  onChange={(e) => handleFieldChange('isProband', e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span className="font-medium text-slate-800">
                  Indivíduo Probando (Seta diagnóstica &quot;P&quot;)
                </span>
              </label>
              <p className="text-[11px] text-slate-500 pl-6 leading-tight">
                Primeiro indivíduo afetado da linhagem através do qual a família chegou à avaliação médica.
              </p>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!person.isConsultand}
                  onChange={(e) => handleFieldChange('isConsultand', e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span className="font-medium text-slate-800">
                  Indivíduo Consultando (Buscou o serviço)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!person.isDeceased}
                  onChange={(e) => handleFieldChange('isDeceased', e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span className="font-medium text-slate-800">
                  Falecido(a) (Traço diagonal)
                </span>
              </label>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Diagnóstico / Condição Genética</label>
              <input
                type="text"
                placeholder="Ex: Fibrose Cística, Daltonismo..."
                value={person.conditionName || ''}
                onChange={(e) => handleFieldChange('conditionName', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        )}

        {/* ABA BIOGRÁFICA */}
        {activeTab === 'BIO' && (
          <div className="space-y-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Nome Completo</label>
              <input
                type="text"
                value={person.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Sexo Biológico</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 'M', label: 'Masculino (□)' },
                  { value: 'F', label: 'Feminino (○)' },
                  { value: 'OTHER', label: 'Outro (◇)' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => handleFieldChange('sex', s.value as Sex)}
                    className={`py-1.5 px-2 rounded border text-center transition-colors ${
                      person.sex === s.value
                        ? 'border-sky-600 bg-sky-50 text-sky-950 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nascimento</label>
                <input
                  type="date"
                  value={person.birthDate || ''}
                  onChange={(e) => handleFieldChange('birthDate', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-900 text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Local Nascimento</label>
                <input
                  type="text"
                  placeholder="Cidade, UF"
                  value={person.birthPlace || ''}
                  onChange={(e) => handleFieldChange('birthPlace', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-900 text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {person.isDeceased && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Falecimento</label>
                  <input
                    type="date"
                    value={person.deathDate || ''}
                    onChange={(e) => handleFieldChange('deathDate', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-900 text-[11px] focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Local Falecimento</label>
                  <input
                    type="text"
                    placeholder="Cidade, UF"
                    value={person.deathPlace || ''}
                    onChange={(e) => handleFieldChange('deathPlace', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-900 text-[11px] focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-medium mb-1">Observações / Histórico Clínico</label>
              <textarea
                rows={3}
                placeholder="Resultados laboratoriais, cirurgias, anotações..."
                value={person.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-sky-500 resize-none text-[11px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Rodapé com Botão de Excluir */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2 px-3 text-red-600 hover:bg-red-50 border border-red-200 rounded font-medium transition-colors text-xs"
          >
            Remover Pessoa do Heredograma
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onDeletePerson(person.id)}
              className="flex-1 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 text-xs"
            >
              Confirmar Exclusão
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded font-medium hover:bg-slate-300 text-xs"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
