import { openDB, DBSchema, IDBPDatabase } from "idb";

interface NSBOfflineDB extends DBSchema {
  fila: {
    key: string;
    value: {
      id: string;
      colecao: "fichas_a" | "fichas_b" | "fichas_c";
      dados: Record<string, unknown>;
      criadoEm: number;
      tentativas: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<NSBOfflineDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<NSBOfflineDB>("nsb-offline", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("fila")) {
          db.createObjectStore("fila", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

// ── Adicionar à fila offline ────────────────────────────────────────────────
export async function adicionarFila(colecao: "fichas_a" | "fichas_b" | "fichas_c", dados: Record<string, unknown>) {
  const db = await getDB();
  if (!db) return null;
  const id = `${colecao}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.put("fila", { id, colecao, dados, criadoEm: Date.now(), tentativas: 0 });
  return id;
}

// ── Listar itens pendentes ──────────────────────────────────────────────────
export async function listarFila() {
  const db = await getDB();
  if (!db) return [];
  return db.getAll("fila");
}

// ── Contar pendentes ─────────────────────────────────────────────────────────
export async function contarFila() {
  const db = await getDB();
  if (!db) return 0;
  return db.count("fila");
}

// ── Remover da fila depois de sincronizar ───────────────────────────────────
export async function removerFila(id: string) {
  const db = await getDB();
  if (!db) return;
  await db.delete("fila", id);
}

// ── Incrementar tentativa (em caso de falha) ────────────────────────────────
export async function incrementarTentativa(id: string) {
  const db = await getDB();
  if (!db) return;
  const item = await db.get("fila", id);
  if (item) {
    item.tentativas++;
    await db.put("fila", item);
  }
}
