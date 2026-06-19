"use client";
import { useEffect, useState, useCallback } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { listarFila, removerFila, incrementarTentativa, contarFila } from "@/lib/offlineQueue";

export function useSyncStatus() {
  const [online, setOnline] = useState(true);
  const [pendentes, setPendentes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  const sincronizar = useCallback(async () => {
    if (!navigator.onLine) return;
    setSincronizando(true);
    try {
      const fila = await listarFila();
      for (const item of fila) {
        try {
          await addDoc(collection(db, item.colecao), {
            ...item.dados,
            criadoEm: Timestamp.now(),
          });
          await removerFila(item.id);
        } catch (err) {
          console.error("Erro ao sincronizar item", item.id, err);
          await incrementarTentativa(item.id);
        }
      }
    } finally {
      const restantes = await contarFila();
      setPendentes(restantes);
      setSincronizando(false);
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    contarFila().then(setPendentes);

    function handleOnline() {
      setOnline(true);
      sincronizar();
    }
    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Tentar sincronizar ao carregar, e a cada 30s se houver itens pendentes
    sincronizar();
    const interval = setInterval(() => {
      if (navigator.onLine) sincronizar();
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [sincronizar]);

  return { online, pendentes, sincronizando, sincronizar, refreshPendentes: () => contarFila().then(setPendentes) };
}

export function SyncBanner() {
  const { online, pendentes, sincronizando } = useSyncStatus();

  if (online && pendentes === 0) return null;

  return (
    <div
      className={`sticky top-0 z-50 px-4 py-2 text-center text-xs font-semibold ${
        !online ? "bg-amber-500 text-white" : "bg-blue-500 text-white"
      }`}
    >
      {!online && pendentes === 0 && "📡 Sem ligação à internet — pode continuar a preencher normalmente"}
      {!online && pendentes > 0 && `📡 Sem internet · ${pendentes} ficha(s) guardada(s) no telemóvel, à espera de envio`}
      {online && pendentes > 0 && !sincronizando && `🔄 A sincronizar ${pendentes} ficha(s) pendente(s)...`}
      {online && pendentes > 0 && sincronizando && `⏳ A enviar dados...`}
    </div>
  );
}
