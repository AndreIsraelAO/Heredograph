/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PedigreeCanvas } from './components/Canvas/PedigreeCanvas';
import { Inspector } from './components/Inspector/Inspector';
import { ClinicalLegend } from './components/Legend/ClinicalLegend';
import { ExportModal } from './components/Modals/ExportModal';
import { ImportModal } from './components/Modals/ImportModal';
import { ProjectModal } from './components/Modals/ProjectModal';
import { RandomPedigreeModal } from './components/Modals/RandomPedigreeModal';
import { ValidationModal } from './components/Modals/ValidationModal';
import { Header } from './components/Toolbar/Header';
import { CLINICAL_DEMO_PROJECT } from './domain/samples';
import {
  FamilyProject,
  FiliationType,
  Person,
  Sex,
  TwinType,
  UnionRelation,
  UnionType,
  ViewMode,
} from './domain/types';
import {
  getAllAncestors,
  getAllDescendants,
  validateFamilyProject,
} from './domain/validation';
import { computePedigreeLayout } from './layout/engine';
import {
  deleteProject,
  HistoryManager,
  loadAllProjects,
  saveProject,
} from './storage/db';

export default function App() {
  const [projects, setProjects] = useState<FamilyProject[]>([CLINICAL_DEMO_PROJECT]);
  const [currentProjectId, setCurrentProjectId] = useState<string>(CLINICAL_DEMO_PROJECT.id);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>('p-iii2'); // Foca inicialmente no Probando

  // Modais
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [isRandomOpen, setIsRandomOpen] = useState(false);

  // Histórico de Desfazer / Refazer
  const historyManagerRef = useRef<HistoryManager>(new HistoryManager());
  const [historyVersion, setHistoryVersion] = useState(0);

  // Referência do SVG para exportação
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Carrega projetos do IndexedDB na montagem
  useEffect(() => {
    loadAllProjects().then((loaded) => {
      if (loaded.length > 0) {
        setProjects(loaded);
        setCurrentProjectId(loaded[0].id);
      }
    });
  }, []);

  // Projeto atualmente ativo
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === currentProjectId) || projects[0] || CLINICAL_DEMO_PROJECT;
  }, [projects, currentProjectId]);

  // Cálculo do layout do heredograma
  const layout = useMemo(() => {
    return computePedigreeLayout(currentProject);
  }, [currentProject]);

  // Relatório de validação
  const validationReport = useMemo(() => {
    return validateFamilyProject(currentProject);
  }, [currentProject]);

  // Linhagens de destaque (ancestrais e descendentes da pessoa selecionada)
  const ancestorIds = useMemo(() => {
    if (!selectedPersonId) return new Set<string>();
    return getAllAncestors(selectedPersonId, currentProject);
  }, [selectedPersonId, currentProject]);

  const descendantIds = useMemo(() => {
    if (!selectedPersonId) return new Set<string>();
    return getAllDescendants(selectedPersonId, currentProject);
  }, [selectedPersonId, currentProject]);

  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return currentProject.persons.find((p) => p.id === selectedPersonId) || null;
  }, [selectedPersonId, currentProject]);

  /**
   * Grava alteração no projeto ativo e salva no IndexedDB
   */
  const updateProject = useCallback(
    (updater: (prev: FamilyProject) => FamilyProject, recordHistory = true) => {
      setProjects((prevProjects) => {
        const idx = prevProjects.findIndex((p) => p.id === currentProjectId);
        if (idx < 0) return prevProjects;

        const current = prevProjects[idx];
        if (recordHistory) {
          historyManagerRef.current.record(current);
          setHistoryVersion((v) => v + 1);
        }

        const updated = updater(current);
        const nextList = [...prevProjects];
        nextList[idx] = updated;

        saveProject(updated).catch(console.error);
        return nextList;
      });
    },
    [currentProjectId]
  );

  /**
   * Operação Desfazer (Undo)
   */
  const handleUndo = useCallback(() => {
    const previous = historyManagerRef.current.undo(currentProject);
    if (previous) {
      setProjects((prev) => prev.map((p) => (p.id === previous.id ? previous : p)));
      saveProject(previous).catch(console.error);
      setHistoryVersion((v) => v + 1);
    }
  }, [currentProject]);

  /**
   * Operação Refazer (Redo)
   */
  const handleRedo = useCallback(() => {
    const next = historyManagerRef.current.redo(currentProject);
    if (next) {
      setProjects((prev) => prev.map((p) => (p.id === next.id ? next : p)));
      saveProject(next).catch(console.error);
      setHistoryVersion((v) => v + 1);
    }
  }, [currentProject]);

  /**
   * Atualização de dados da pessoa
   */
  const handleUpdatePerson = useCallback(
    (updated: Person) => {
      updateProject((prev) => ({
        ...prev,
        persons: prev.persons.map((p) => (p.id === updated.id ? updated : p)),
      }));
    },
    [updateProject]
  );

  /**
   * Atualização de posição customizada do nó
   */
  const handleUpdatePersonPosition = useCallback(
    (personId: string, customX: number, customY: number) => {
      updateProject(
        (prev) => ({
          ...prev,
          persons: prev.persons.map((p) =>
            p.id === personId ? { ...p, customX, customY } : p
          ),
        }),
        false // Não polui a pilha de undo a cada pixel arrastado
      );
    },
    [updateProject]
  );

  /**
   * Restauração do layout automático
   */
  const handleResetLayout = useCallback(() => {
    updateProject((prev) => ({
      ...prev,
      persons: prev.persons.map((p) => {
        const { customX, customY, ...rest } = p;
        return rest;
      }),
    }));
  }, [updateProject]);

  /**
   * Alternância de modo de visualização
   */
  const handleToggleViewMode = useCallback(
    (mode: ViewMode) => {
      updateProject((prev) => ({
        ...prev,
        viewMode: mode,
      }));
    },
    [updateProject]
  );

  /**
   * Exclusão de pessoa
   */
  const handleDeletePerson = useCallback(
    (personId: string) => {
      updateProject((prev) => {
        // Remove relações de parentesco onde a pessoa é filho
        const nextParentChild = prev.parentChildRelations.filter((r) => r.childId !== personId);
        // Remove uniões da pessoa
        const nextUnions = prev.unions.filter(
          (u) => u.partner1Id !== personId && u.partner2Id !== personId
        );
        // Remove relações onde a união foi deletada
        const validUnionIds = new Set(nextUnions.map((u) => u.id));
        const filteredParentChild = nextParentChild.filter(
          (r) => !r.unionId || validUnionIds.has(r.unionId)
        );

        return {
          ...prev,
          persons: prev.persons.filter((p) => p.id !== personId),
          unions: nextUnions,
          parentChildRelations: filteredParentChild,
        };
      });
      setSelectedPersonId(null);
    },
    [updateProject]
  );

  /**
   * Adicionar Pais
   */
  const handleAddParents = useCallback(
    (childId: string) => {
      const child = currentProject.persons.find((p) => p.id === childId);
      if (!child) return;

      const fatherId = `p-father-${Date.now()}`;
      const motherId = `p-mother-${Date.now()}`;
      const unionId = `u-parents-${Date.now()}`;

      const father: Person = {
        id: fatherId,
        name: `Pai de ${child.name.split(' ')[0]}`,
        sex: 'M',
        clinicalStatus: 'UNAFFECTED',
      };

      const mother: Person = {
        id: motherId,
        name: `Mãe de ${child.name.split(' ')[0]}`,
        sex: 'F',
        clinicalStatus: 'UNAFFECTED',
      };

      updateProject((prev) => ({
        ...prev,
        persons: [...prev.persons, father, mother],
        unions: [
          ...prev.unions,
          {
            id: unionId,
            partner1Id: fatherId,
            partner2Id: motherId,
            type: 'MARRIAGE',
          },
        ],
        parentChildRelations: [
          ...prev.parentChildRelations,
          {
            id: `rel-${unionId}-${childId}`,
            childId,
            unionId,
            filiationType: 'BIOLOGICAL',
          },
        ],
      }));
    },
    [currentProject.persons, updateProject]
  );

  /**
   * Adicionar Cônjuge
   */
  const handleAddSpouse = useCallback(
    (personId: string, spouseSex: Sex) => {
      const person = currentProject.persons.find((p) => p.id === personId);
      if (!person) return;

      const spouseId = `p-spouse-${Date.now()}`;
      const unionId = `u-spouse-${Date.now()}`;

      const spouse: Person = {
        id: spouseId,
        name: `Cônjuge de ${person.name.split(' ')[0]}`,
        sex: spouseSex,
        clinicalStatus: 'UNAFFECTED',
      };

      updateProject((prev) => ({
        ...prev,
        persons: [...prev.persons, spouse],
        unions: [
          ...prev.unions,
          {
            id: unionId,
            partner1Id: personId,
            partner2Id: spouseId,
            type: 'MARRIAGE',
          },
        ],
      }));
    },
    [currentProject.persons, updateProject]
  );

  /**
   * Adicionar Filho
   */
  const handleAddChild = useCallback(
    (unionId: string, filiationType: FiliationType) => {
      const union = currentProject.unions.find((u) => u.id === unionId);
      if (!union) return;

      const childId = `p-child-${Date.now()}`;
      const child: Person = {
        id: childId,
        name: 'Novo Filho(a)',
        sex: 'M',
        clinicalStatus: 'UNAFFECTED',
      };

      updateProject((prev) => ({
        ...prev,
        persons: [...prev.persons, child],
        parentChildRelations: [
          ...prev.parentChildRelations,
          {
            id: `rel-${unionId}-${childId}`,
            childId,
            unionId,
            filiationType,
          },
        ],
      }));

      setSelectedPersonId(childId);
    },
    [currentProject.unions, updateProject]
  );

  /**
   * Adicionar Irmão ou Gêmeo
   */
  const handleAddSiblingOrTwin = useCallback(
    (personId: string, isTwin: boolean, twinType: TwinType = 'DIZYGOTIC') => {
      const filiation = currentProject.parentChildRelations.find((r) => r.childId === personId);
      if (!filiation || !filiation.unionId) return;

      const siblingId = `p-sib-${Date.now()}`;
      const sibling: Person = {
        id: siblingId,
        name: isTwin ? 'Irmão(ã) Gêmeo(a)' : 'Novo Irmão(ã)',
        sex: 'F',
        clinicalStatus: 'UNAFFECTED',
      };

      const twinGroupId = isTwin
        ? filiation.twinGroupId || `twingroup-${Date.now()}`
        : undefined;

      updateProject((prev) => {
        // Se for gêmeo, atualiza a relação do irmão original com o mesmo twinGroupId
        const updatedFiliations = prev.parentChildRelations.map((r) => {
          if (r.childId === personId && isTwin) {
            return {
              ...r,
              twinGroupId,
              twinType,
            };
          }
          return r;
        });

        return {
          ...prev,
          persons: [...prev.persons, sibling],
          parentChildRelations: [
            ...updatedFiliations,
            {
              id: `rel-sib-${siblingId}`,
              childId: siblingId,
              unionId: filiation.unionId,
              filiationType: 'BIOLOGICAL',
              twinGroupId,
              twinType: isTwin ? twinType : undefined,
            },
          ],
        };
      });

      setSelectedPersonId(siblingId);
    },
    [currentProject.parentChildRelations, updateProject]
  );

  /**
   * Alternar Casamento Consanguíneo
   */
  const handleToggleConsanguinity = useCallback(
    (unionId: string) => {
      updateProject((prev) => ({
        ...prev,
        unions: prev.unions.map((u) =>
          u.id === unionId ? { ...u, isConsanguineous: !u.isConsanguineous } : u
        ),
      }));
    },
    [updateProject]
  );

  /**
   * Vincular Cônjuge Já Presente no Heredograma
   */
  const handleLinkExistingSpouse = useCallback(
    (personId: string, partnerId: string, type: UnionType, isConsanguineous: boolean) => {
      // Verifica se já existe união entre eles
      const existingUnion = currentProject.unions.find(
        (u) =>
          (u.partner1Id === personId && u.partner2Id === partnerId) ||
          (u.partner1Id === partnerId && u.partner2Id === personId)
      );
      if (existingUnion) return;

      const newUnion: UnionRelation = {
        id: `u-${Date.now()}`,
        partner1Id: personId,
        partner2Id: partnerId,
        type,
        isConsanguineous,
      };

      updateProject((prev) => ({
        ...prev,
        unions: [...prev.unions, newUnion],
      }));
    },
    [currentProject.unions, updateProject]
  );

  /**
   * Vincular Irmão Já Presente no Heredograma
   */
  const handleLinkExistingSibling = useCallback(
    (
      personId: string,
      existingSiblingId: string,
      isTwin: boolean,
      twinType: TwinType = 'DIZYGOTIC'
    ) => {
      const personFiliation = currentProject.parentChildRelations.find(
        (r) => r.childId === personId
      );
      const siblingFiliation = currentProject.parentChildRelations.find(
        (r) => r.childId === existingSiblingId
      );

      const targetUnionId = personFiliation?.unionId || siblingFiliation?.unionId;
      const twinGroupId = isTwin ? `twin-${Date.now()}` : undefined;

      updateProject((prev) => {
        let parentUnionId = targetUnionId;
        const newUnions = [...prev.unions];
        const newPersons = [...prev.persons];

        // Se nenhum dos dois tem união de pais, cria pais comuns
        if (!parentUnionId) {
          const fatherId = `p-father-${Date.now()}`;
          const motherId = `p-mother-${Date.now()}`;
          parentUnionId = `u-parents-${Date.now()}`;

          newPersons.push(
            { id: fatherId, name: 'Pai Compartilhado', sex: 'M', clinicalStatus: 'UNAFFECTED' },
            { id: motherId, name: 'Mãe Compartilhada', sex: 'F', clinicalStatus: 'UNAFFECTED' }
          );
          newUnions.push({
            id: parentUnionId,
            partner1Id: fatherId,
            partner2Id: motherId,
            type: 'MARRIAGE',
          });
        }

        // Remove filiações anteriores para evitar duplicações
        const remainingRelations = prev.parentChildRelations.filter(
          (r) => r.childId !== personId && r.childId !== existingSiblingId
        );

        // Insere ou atualiza a filiação de ambos sob a mesma união de pais
        remainingRelations.push({
          id: personFiliation?.id || `rel-${parentUnionId}-${personId}`,
          childId: personId,
          unionId: parentUnionId,
          filiationType: personFiliation?.filiationType || 'BIOLOGICAL',
          twinGroupId: isTwin ? twinGroupId : personFiliation?.twinGroupId,
          twinType: isTwin ? twinType : personFiliation?.twinType,
        });

        remainingRelations.push({
          id: siblingFiliation?.id || `rel-${parentUnionId}-${existingSiblingId}`,
          childId: existingSiblingId,
          unionId: parentUnionId,
          filiationType: siblingFiliation?.filiationType || 'BIOLOGICAL',
          twinGroupId: isTwin ? twinGroupId : siblingFiliation?.twinGroupId,
          twinType: isTwin ? twinType : siblingFiliation?.twinType,
        });

        return {
          ...prev,
          persons: newPersons,
          unions: newUnions,
          parentChildRelations: remainingRelations,
        };
      });
    },
    [currentProject.parentChildRelations, updateProject]
  );

  /**
   * Vincular Pais Já Existentes no Heredograma
   */
  const handleLinkExistingParents = useCallback(
    (childId: string, unionId: string) => {
      updateProject((prev) => {
        const remaining = prev.parentChildRelations.filter((r) => r.childId !== childId);
        return {
          ...prev,
          parentChildRelations: [
            ...remaining,
            {
              id: `rel-${unionId}-${childId}`,
              childId,
              unionId,
              filiationType: 'BIOLOGICAL',
            },
          ],
        };
      });
    },
    [updateProject]
  );

  /**
   * Selecionar Projeto
   */
  const handleSelectProject = useCallback((projectId: string) => {
    setCurrentProjectId(projectId);
    setSelectedPersonId(null);
    historyManagerRef.current.clear();
    setHistoryVersion((v) => v + 1);
  }, []);

  /**
   * Criar Projeto
   */
  const handleCreateProject = useCallback((newProject: FamilyProject) => {
    setProjects((prev) => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
    setSelectedPersonId(newProject.persons[0]?.id || null);
    historyManagerRef.current.clear();
    setHistoryVersion((v) => v + 1);
    saveProject(newProject).catch(console.error);
  }, []);

  /**
   * Excluir Projeto
   */
  const handleDeleteProject = useCallback(
    (projectId: string) => {
      deleteProject(projectId).catch(console.error);
      setProjects((prev) => {
        const next = prev.filter((p) => p.id !== projectId);
        if (currentProjectId === projectId && next.length > 0) {
          setCurrentProjectId(next[0].id);
        }
        return next;
      });
    },
    [currentProjectId]
  );

  /**
   * Importação bem-sucedida
   */
  const handleImportSuccess = useCallback((importedProject: FamilyProject) => {
    setProjects((prev) => [importedProject, ...prev]);
    setCurrentProjectId(importedProject.id);
    setSelectedPersonId(importedProject.persons[0]?.id || null);
    historyManagerRef.current.clear();
    setHistoryVersion((v) => v + 1);
    saveProject(importedProject).catch(console.error);
  }, []);

  /**
   * Geração de Heredograma Aleatório com Substituição do Anterior
   */
  const handleGenerateRandomProject = useCallback(
    (newProject: FamilyProject) => {
      const previousId = currentProjectId;

      // Exclui o projeto anterior do armazenamento
      deleteProject(previousId).catch(console.error);

      // Substitui o projeto atual pelo novo gerado aleatoriamente
      setProjects((prev) => {
        const remaining = prev.filter((p) => p.id !== previousId);
        return [newProject, ...remaining];
      });

      setCurrentProjectId(newProject.id);

      // Foca automaticamente no Probando clínico gerado ou no primeiro indivíduo
      const proband = newProject.persons.find((p) => p.isProband);
      setSelectedPersonId(proband ? proband.id : newProject.persons[0]?.id || null);

      // Limpa histórico anterior para o novo estudo
      historyManagerRef.current.clear();
      setHistoryVersion((v) => v + 1);

      // Salva o novo heredograma no armazenamento local
      saveProject(newProject).catch(console.error);
    },
    [currentProjectId]
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Barra de Ferramentas Superior */}
      <Header
        project={currentProject}
        canUndo={historyManagerRef.current.canUndo()}
        canRedo={historyManagerRef.current.canRedo()}
        undoCount={historyManagerRef.current.getUndoCount()}
        redoCount={historyManagerRef.current.getRedoCount()}
        validationErrorCount={validationReport.errors.length}
        validationWarningCount={validationReport.warnings.length}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleViewMode={handleToggleViewMode}
        onResetLayout={handleResetLayout}
        onSelectPerson={setSelectedPersonId}
        onOpenExportModal={() => setIsExportOpen(true)}
        onOpenImportModal={() => setIsImportOpen(true)}
        onOpenProjectModal={() => setIsProjectOpen(true)}
        onOpenValidationModal={() => setIsValidationOpen(true)}
        onOpenRandomModal={() => setIsRandomOpen(true)}
      />

      {/* Área Central: Canvas + Inspector Lateral */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Canvas do Heredograma */}
        <PedigreeCanvas
          project={currentProject}
          layout={layout}
          selectedPersonId={selectedPersonId}
          ancestorIds={ancestorIds}
          descendantIds={descendantIds}
          onSelectPerson={setSelectedPersonId}
          onUpdatePersonPosition={handleUpdatePersonPosition}
          svgRef={svgRef}
        />

        {/* Legenda Médica / Genealógica */}
        <ClinicalLegend
          viewMode={currentProject.viewMode}
          diseaseName={currentProject.diseaseName}
          inheritancePattern={currentProject.inheritancePattern}
        />

        {/* Painel Lateral Inspector */}
        {selectedPerson && (
          <Inspector
            person={selectedPerson}
            project={currentProject}
            validationIssues={[...validationReport.errors, ...validationReport.warnings]}
            onUpdatePerson={handleUpdatePerson}
            onDeletePerson={handleDeletePerson}
            onAddParents={handleAddParents}
            onAddSpouse={handleAddSpouse}
            onAddChild={handleAddChild}
            onAddSiblingOrTwin={handleAddSiblingOrTwin}
            onLinkExistingSpouse={handleLinkExistingSpouse}
            onLinkExistingSibling={handleLinkExistingSibling}
            onLinkExistingParents={handleLinkExistingParents}
            onToggleConsanguinity={handleToggleConsanguinity}
            onClose={() => setSelectedPersonId(null)}
          />
        )}
      </main>

      {/* Modais do Sistema */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={currentProject}
        layout={layout}
        svgElement={svgRef.current}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <ProjectModal
        isOpen={isProjectOpen}
        onClose={() => setIsProjectOpen(false)}
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
      />

      <RandomPedigreeModal
        isOpen={isRandomOpen}
        onClose={() => setIsRandomOpen(false)}
        currentProjectName={currentProject.name}
        onGenerate={handleGenerateRandomProject}
      />

      <ValidationModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        report={validationReport}
        project={currentProject}
        onFocusPerson={setSelectedPersonId}
      />
    </div>
  );
}
