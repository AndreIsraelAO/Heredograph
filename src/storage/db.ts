/**
 * Módulo de Armazenamento Local IndexedDB e Gestão de Histórico (Undo/Redo)
 * Suporta múltiplos projetos, persistência assíncrona robusta e fallback transparente.
 */

import { CLINICAL_DEMO_PROJECT, GENEALOGICAL_DEMO_PROJECT } from '../domain/samples';
import { FamilyProject } from '../domain/types';

const DB_NAME = 'heredostudio_db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const LOCALSTORAGE_KEY = 'heredostudio_projects_fallback';

let dbInstance: IDBDatabase | null = null;

/**
 * Inicializa a conexão com o IndexedDB do navegador
 */
export async function getDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB não suportado neste navegador.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.warn('Erro ao abrir IndexedDB, utilizando fallback localStorage:', event);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Carrega todos os projetos salvos
 */
export async function loadAllProjects(): Promise<FamilyProject[]> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = async () => {
        let projects: FamilyProject[] = request.result || [];
        if (projects.length === 0) {
          // Inicializa com dados de demonstração
          await saveProject(CLINICAL_DEMO_PROJECT);
          await saveProject(GENEALOGICAL_DEMO_PROJECT);
          projects = [CLINICAL_DEMO_PROJECT, GENEALOGICAL_DEMO_PROJECT];
        }
        resolve(projects);
      };

      request.onerror = () => reject(request.error);
    });
  } catch {
    // Fallback LocalStorage
    try {
      const raw = localStorage.getItem(LOCALSTORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignora erro
    }
    return [CLINICAL_DEMO_PROJECT, GENEALOGICAL_DEMO_PROJECT];
  }
}

/**
 * Salva ou atualiza um projeto
 */
export async function saveProject(project: FamilyProject): Promise<void> {
  const updatedProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };

  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(updatedProject);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Fallback LocalStorage
    try {
      const raw = localStorage.getItem(LOCALSTORAGE_KEY);
      let projects: FamilyProject[] = raw ? JSON.parse(raw) : [];
      const idx = projects.findIndex((p) => p.id === project.id);
      if (idx >= 0) {
        projects[idx] = updatedProject;
      } else {
        projects.push(updatedProject);
      }
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(projects));
    } catch {
      // Silencioso em caso de restrição de armazenamento
    }
  }
}

/**
 * Remove um projeto pelo ID
 */
export async function deleteProject(projectId: string): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(projectId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Fallback LocalStorage
    try {
      const raw = localStorage.getItem(LOCALSTORAGE_KEY);
      if (raw) {
        let projects: FamilyProject[] = JSON.parse(raw);
        projects = projects.filter((p) => p.id !== projectId);
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(projects));
      }
    } catch {
      // Ignora erro
    }
  }
}

/**
 * Gerenciador de histórico (Desfazer / Refazer) em memória
 */
export class HistoryManager {
  private past: FamilyProject[] = [];
  private future: FamilyProject[] = [];
  private maxDepth = 40;

  constructor(initialState?: FamilyProject) {
    if (initialState) {
      this.past = [];
    }
  }

  public record(currentState: FamilyProject): void {
    // Clona o estado atual antes da alteração
    const snapshot = JSON.parse(JSON.stringify(currentState));
    this.past.push(snapshot);
    if (this.past.length > this.maxDepth) {
      this.past.shift();
    }
    // Uma nova alteração limpa a fila de refazer
    this.future = [];
  }

  public undo(currentState: FamilyProject): FamilyProject | null {
    if (this.past.length === 0) return null;
    const previous = this.past.pop()!;
    this.future.push(JSON.parse(JSON.stringify(currentState)));
    return previous;
  }

  public redo(currentState: FamilyProject): FamilyProject | null {
    if (this.future.length === 0) return null;
    const next = this.future.pop()!;
    this.past.push(JSON.parse(JSON.stringify(currentState)));
    return next;
  }

  public canUndo(): boolean {
    return this.past.length > 0;
  }

  public canRedo(): boolean {
    return this.future.length > 0;
  }

  public getUndoCount(): number {
    return this.past.length;
  }

  public getRedoCount(): number {
    return this.future.length;
  }

  public clear(): void {
    this.past = [];
    this.future = [];
  }
}
