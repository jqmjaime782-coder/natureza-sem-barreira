"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getFichasA, getFichasB, deleteFichaA, deleteFichaB } from "@/lib/db";
import { FichaA, FichaB } from "@/lib/types";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import * as XLSX from "xlsx";

export default function DashboardPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fichasA, setFichasA] = useState<FichaA[]>([]);
  const [fichasB, setFichasB] = useState<FichaB[]>([]);
  const [tab, setTab] = useState<"overview" | "fichasA" | "fichasB" | "citacoes">("overview");

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      if (!user) { router.push("/login"); return; }
      setAuthed(true);
      loadData();
    });
  }, []);

  async function loadData() {
    setLoading(true);
    const [a, b] = await Promise.all([getFichasA(), getFichasB()]);
    setFichasA(a);
    setFichasB(b);
    setLoading(false);
  }

  // ── Analytics helpers ──────────────────────────────────────────────────
  function avgSection(fichas: FichaA[], section: keyof Pick<FichaA, "fisicaAcesso" | "fisicaSanitarios" | "fisicaTransporte" | "comunicacional" | "atitudinal">) {
    if (!fichas.length) return 0;
    const vals: number[] = [];
    fichas.forEach(f => {
      Object.values(f[section] ?? {}).forEach(v => { if (v) vals.push(v as number); });
    });
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : 0;
  }

  const radarData = [
    { subject: "Acesso Físico", A: avgSection(fichasA, "fisicaAcesso"), fullMark: 5 },
    { subject: "Sanitários", A: avgSection(fichasA, "fisicaSanitarios"), fullMark: 5 },
    { subject: "Transporte", A: avgSection(fichasA, "fisicaTransporte"), fullMark: 5 },
    { subject: "Comunicacional", A: avgSection(fichasA, "comunicacional"), fullMark: 5 },
    { subject: "Atitudinal", A: avgSection(fichasA, "atitudinal"), fullMark: 5 },
  ];

  const nivelCounts = fichasA.reduce((acc, f) => {
    const k = f.nivelAcessibilidade || "Não definido";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.entries(nivelCounts).map(([name, count]) => ({ name, count }));

  const COLORS: Record<string, string> = {
    "Inacessível": "#dc2626", "Parcialmente Acessível": "#f97316",
    "Acessível com Apoio": "#eab308", "Totalmente Acessível": "#16a34a", "Não definido": "#9ca3af",
  };

  const rotaPilotoSim = fichasA.filter(f => f.incluirRotaPiloto && f.incluirRotaPiloto !== "Não").length;

  // ── Export helpers ────────────────────────────────────────────────────────
  function exportExcel() {
    const wb = XLSX.utils.book_new();

    // Sheet 1 – Ficha A summary
    const wsAData = fichasA.map(f => ({
      "Data": f.data,
      "Avaliador": f.nomeAvaliador,
      "Local": f.pontoVisitado,
      "Deficiência": f.tipoDeficienciaAvaliador,
      "Nível Global": f.nivelAcessibilidade,
      "Rota Piloto": f.incluirRotaPiloto,
      "Média Acesso Físico": avgSingle(f.fisicaAcesso),
      "Média Sanitários": avgSingle(f.fisicaSanitarios),
      "Média Transporte": avgSingle(f.fisicaTransporte),
      "Média Comunicacional": avgSingle(f.comunicacional),
      "Média Atitudinal": avgSingle(f.atitudinal),
      "Principal Barreira": f.principalBarreira,
      "Recomendação Prioritária": f.recomendacaoPrioritaria,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wsAData), "Ficha A – Resumo");

    // Sheet 2 – Ficha B summary
    const wsBData = fichasB.map(f => ({
      "Data": f.data,
      "Comunidade": f.comunidade,
      "Moderador": f.moderador,
      "Nº Participantes": f.numParticipantes,
      "Nº Mulheres": f.numMulheres,
      "Barreira 1": f.top3Barreiras[0],
      "Barreira 2": f.top3Barreiras[1],
      "Barreira 3": f.top3Barreiras[2],
      "Citação Advocacy": f.citacaoPoderosa,
      "Solução 1": f.solucoesProposta[0],
      "Solução 2": f.solucoesProposta[1],
      "Monitores Comunitários": f.monitoresComunitarios ? "Sim" : "Não",
      "Observações": f.observacoesGerais,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wsBData), "Ficha B – Resumo");

    // Sheet 3 – Citações
    const citData = fichasB.filter(f => f.citacaoPoderosa).map(f => ({
      "Comunidade": f.comunidade,
      "Data": f.data,
      "Citação": f.citacaoPoderosa,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(citData), "Citações Advocacy");

    XLSX.writeFile(wb, `NSB_Relatorio_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function avgSingle(obj: Record<string, number | null> | undefined): string {
    if (!obj) return "–";
    const vals = Object.values(obj).filter(v => v !== null) as number[];
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "–";
  }

  async function handleDeleteA(id: string) {
    if (!confirm("Eliminar este registo?")) return;
    await deleteFichaA(id);
    loadData();
  }

  async function handleDeleteB(id: string) {
    if (!confirm("Eliminar este registo?")) return;
    await deleteFichaB(id);
    loadData();
  }

  if (!authed || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0faf4" }}>
        <div className="text-center">
          <div className="text-4xl mb-3">🌿</div>
          <p className="text-green-700 font-medium">A carregar dados...</p>
        </div>
      </div>
    );
  }

  const totalParticipantes = fichasB.reduce((s, f) => s + (parseInt(f.numParticipantes) || 0), 0);
  const totalMulheres = fichasB.reduce((s, f) => s + (parseInt(f.numMulheres) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: "#1A6B3A" }} className="shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-green-200 text-xs">ADEMO-Sofala</p>
            <h1 className="text-white font-bold text-lg">Dashboard — Natureza Sem Barreiras</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={exportExcel} className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all">
              📥 Exportar Excel
            </button>
            <button onClick={() => signOut(auth)} className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 rounded-xl transition-all">
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { id: "overview", label: "📊 Visão Geral" },
            { id: "fichasA", label: `🏕️ Fichas A (${fichasA.length})` },
            { id: "fichasB", label: `👥 Fichas B (${fichasB.length})` },
            { id: "citacoes", label: "💬 Citações" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab === t.id ? "text-white shadow" : "bg-white text-gray-600 hover:bg-gray-100"}`}
              style={tab === t.id ? { background: "#1A6B3A" } : {}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Locais Avaliados", value: fichasA.length, icon: "🏕️", color: "#1A6B3A" },
                { label: "Grupos Focais", value: fichasB.length, icon: "👥", color: "#0D4424" },
                { label: "PcD Ouvidas", value: totalParticipantes, icon: "🎤", color: "#1A6B3A" },
                { label: "Aptas para Rota Piloto", value: rotaPilotoSim, icon: "✅", color: "#0D4424" },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="text-2xl mb-1">{kpi.icon}</div>
                  <div className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Radar chart */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-1 text-sm">Pontuação Média por Categoria</h3>
                <p className="text-xs text-gray-400 mb-3">Escala 1–5 · Média de todos os locais avaliados</p>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <Radar name="Média" dataKey="A" stroke="#1A6B3A" fill="#1A6B3A" fillOpacity={0.35} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Bar chart */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-1 text-sm">Nível de Acessibilidade Global</h3>
                <p className="text-xs text-gray-400 mb-3">Nº de locais por classificação</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={COLORS[entry.name] ?? "#9ca3af"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Grupos focais summary */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-700 mb-3 text-sm">Resumo dos Grupos Focais</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold" style={{ color: "#1A6B3A" }}>{totalParticipantes}</div>
                  <div className="text-xs text-gray-500">PcD participantes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: "#1A6B3A" }}>{totalMulheres}</div>
                  <div className="text-xs text-gray-500">Mulheres com deficiência</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: "#1A6B3A" }}>
                    {fichasB.filter(f => f.monitoresComunitarios).length}
                  </div>
                  <div className="text-xs text-gray-500">Sessões com monitores dispostos</div>
                </div>
              </div>

              {fichasB.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Barreiras mais reportadas nas comunidades</p>
                  <div className="space-y-1">
                    {fichasB.flatMap(f => f.top3Barreiras.filter(Boolean))
                      .reduce((acc, b) => {
                        acc[b] = (acc[b] || 0) + 1; return acc;
                      }, {} as Record<string, number>)
                      && Object.entries(
                        fichasB.flatMap(f => f.top3Barreiras.filter(Boolean))
                          .reduce((acc, b) => { acc[b] = (acc[b] || 0) + 1; return acc; }, {} as Record<string, number>)
                      ).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([barrier, count]) => (
                        <div key={barrier} className="flex items-center gap-2">
                          <div className="h-2 rounded-full" style={{ width: `${Math.min(count * 30, 120)}px`, background: "#1A6B3A" }} />
                          <span className="text-xs text-gray-600">{barrier} <span className="text-gray-400">({count}x)</span></span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── FICHAS A ── */}
        {tab === "fichasA" && (
          <div className="space-y-3">
            {fichasA.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Nenhuma ficha A submetida ainda.</div>}
            {fichasA.map(f => (
              <div key={f.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800">{f.pontoVisitado || "Local não especificado"}</h3>
                    <p className="text-xs text-gray-400">{f.data} · {f.nomeAvaliador} · {f.tipoDeficienciaAvaliador}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {f.nivelAcessibilidade && (
                      <span className="text-xs px-2 py-1 rounded-full text-white font-semibold" style={{ background: COLORS[f.nivelAcessibilidade] ?? "#9ca3af" }}>
                        {f.nivelAcessibilidade}
                      </span>
                    )}
                    <button onClick={() => handleDeleteA(f.id!)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 mb-3">
                  {[
                    { label: "Acesso", val: avgSingle(f.fisicaAcesso) },
                    { label: "Sanit.", val: avgSingle(f.fisicaSanitarios) },
                    { label: "Transp.", val: avgSingle(f.fisicaTransporte) },
                    { label: "Comun.", val: avgSingle(f.comunicacional) },
                    { label: "Atitud.", val: avgSingle(f.atitudinal) },
                  ].map(m => (
                    <div key={m.label} className="text-center bg-gray-50 rounded-xl p-2">
                      <div className="text-lg font-bold" style={{ color: parseFloat(m.val) >= 3 ? "#1A6B3A" : "#dc2626" }}>{m.val}</div>
                      <div className="text-xs text-gray-400">{m.label}</div>
                    </div>
                  ))}
                </div>

                {f.principalBarreira && (
                  <div className="bg-red-50 rounded-xl p-3 mb-2">
                    <p className="text-xs font-bold text-red-600 mb-1">Principal Barreira</p>
                    <p className="text-sm text-gray-700">{f.principalBarreira}</p>
                  </div>
                )}
                {f.recomendacaoPrioritaria && (
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-green-700 mb-1">Recomendação Prioritária</p>
                    <p className="text-sm text-gray-700">{f.recomendacaoPrioritaria}</p>
                  </div>
                )}
                {f.incluirRotaPiloto && (
                  <p className="text-xs text-gray-500 mt-2">🗺️ Rota piloto: <strong>{f.incluirRotaPiloto}</strong></p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── FICHAS B ── */}
        {tab === "fichasB" && (
          <div className="space-y-3">
            {fichasB.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Nenhuma ficha B submetida ainda.</div>}
            {fichasB.map(f => (
              <div key={f.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800">{f.comunidade || "Comunidade não especificada"}</h3>
                    <p className="text-xs text-gray-400">{f.data} · {f.moderador} · {f.numParticipantes} participantes ({f.numMulheres} mulheres)</p>
                  </div>
                  <button onClick={() => handleDeleteB(f.id!)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                </div>

                {f.top3Barreiras.filter(Boolean).length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-bold text-gray-500 mb-1">Principais barreiras reportadas</p>
                    <div className="flex flex-wrap gap-1">
                      {f.top3Barreiras.filter(Boolean).map((b, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full text-white" style={{ background: "#1A6B3A" }}>{b}</span>
                      ))}
                    </div>
                  </div>
                )}

                {f.citacaoPoderosa && (
                  <div className="border-l-4 pl-3 py-1" style={{ borderColor: "#1A6B3A" }}>
                    <p className="text-sm text-gray-700 italic">"{f.citacaoPoderosa}"</p>
                    <p className="text-xs text-gray-400 mt-1">— Participante, {f.comunidade}</p>
                  </div>
                )}

                {f.respostas.filter(r => r.resposta).length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs font-bold text-green-700 cursor-pointer">Ver respostas completas ({f.respostas.filter(r => r.resposta).length} perguntas respondidas)</summary>
                    <div className="mt-2 space-y-2">
                      {f.respostas.filter(r => r.resposta).map(r => (
                        <div key={r.pergunta} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-bold text-gray-400 mb-1">Pergunta {r.pergunta}</p>
                          <p className="text-sm text-gray-700">{r.resposta}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── CITAÇÕES ── */}
        {tab === "citacoes" && (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
              <p className="text-sm text-green-800">💡 <strong>Para o relatório de advocacy:</strong> estas citações representam a voz directa das PcD e devem ser usadas para pressionar as autoridades locais e a direcção do PNG.</p>
            </div>
            <div className="space-y-3">
              {fichasB.filter(f => f.citacaoPoderosa).length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Nenhuma citação registada ainda.</div>
              )}
              {fichasB.filter(f => f.citacaoPoderosa).map(f => (
                <div key={f.id} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="border-l-4 pl-4 py-2" style={{ borderColor: "#1A6B3A" }}>
                    <p className="text-base text-gray-800 italic leading-relaxed">"{f.citacaoPoderosa}"</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    — Participante do grupo focal de <strong>{f.comunidade}</strong>, {f.data}
                    {f.numParticipantes && ` · Sessão com ${f.numParticipantes} PcD`}
                  </p>
                  {f.top3Barreiras.filter(Boolean).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {f.top3Barreiras.filter(Boolean).map((b, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{b}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
