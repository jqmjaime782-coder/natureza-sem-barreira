import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { FichaA, FichaB } from "./types";

// ── Ficha A ────────────────────────────────────────────────────────────────
export async function saveFichaA(data: Omit<FichaA, "id" | "criadoEm">) {
  const ref = await addDoc(collection(db, "fichas_a"), {
    ...data,
    criadoEm: Timestamp.now(),
  });
  return ref.id;
}

export async function getFichasA(): Promise<FichaA[]> {
  const q = query(collection(db, "fichas_a"), orderBy("criadoEm", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    criadoEm: d.data().criadoEm?.toDate?.()?.toISOString() ?? "",
  })) as FichaA[];
}

export async function deleteFichaA(id: string) {
  await deleteDoc(doc(db, "fichas_a", id));
}

// ── Ficha B ────────────────────────────────────────────────────────────────
export async function saveFichaB(data: Omit<FichaB, "id" | "criadoEm">) {
  const ref = await addDoc(collection(db, "fichas_b"), {
    ...data,
    criadoEm: Timestamp.now(),
  });
  return ref.id;
}

export async function getFichasB(): Promise<FichaB[]> {
  const q = query(collection(db, "fichas_b"), orderBy("criadoEm", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    criadoEm: d.data().criadoEm?.toDate?.()?.toISOString() ?? "",
  })) as FichaB[];
}

export async function deleteFichaB(id: string) {
  await deleteDoc(doc(db, "fichas_b", id));
}
