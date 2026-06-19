"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { getFichasA, getFichasB, deleteFichaA, deleteFichaB } from "@/lib/db";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { FichaA, FichaB } from "@/lib/types";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import * as XLSX from "xlsx";

interface FichaC {
  id?: string;
  numeroEntrevista: string;
  data: string;
  comunidade: string;
  entrevistador: string;
  nomeOuCodigoPseudo: string;
  idade: string;
  genero: string;
  tipoDeficiencia: string;
  respostas: Record<string, string>;
  citacaoPrincipal: string;
  barreiraPrincipal: string;
  solucaoProposta: string;
  disponivelRota: string;
  observacoesEntrevistador: string;
}

async function getFichasC(): Promise<FichaC[]> {
  const q = query(collection(db, "fichas_c"), orderBy("criadoEm", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as FichaC[];
}

async function deleteFichaC(id: string) {
  await deleteDoc(doc(db, "fichas_c", id));
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [fichasA, setFichasA] = useState<FichaA[]>([]);
  const [fichasB, setFichasB] = useState<FichaB[]>([]);
  const [fichasC, setFichasC] = useState<FichaC[]>([]);
  const [tab, setTab] = useState<"overview" | "fichasA" | "fichasB" | "fichasC" | "citacoes">("overview");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [a, b, c] = await Promise.all([getFichasA(), getFichasB(), getFichasC()]);
    setFichasA(a);
    setFichasB(b);
    setFichasC(c);
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

  // ── Análise demográfica cruzada (Fichas B + C) ─────────────────────────
  function countBy<T extends Record<string, unknown>>(items: T[], getKey: (item: T) => string | string[] | undefined): Record<string, number> {
    const acc: Record<string, number> = {};
    items.forEach(item => {
      const k = getKey(item);
      if (!k) return;
      const keys = Array.isArray(k) ? k : [k];
      keys.forEach(key => {
        if (!key) return;
        acc[key] = (acc[key] || 0) + 1;
      });
    });
    return acc;
  }

  function sortedEntries(obj: Record<string, number>) {
    return Object.entries(obj).sort((a, b) => b[1] - a[1]);
  }

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

    // Sheet 3 – Ficha C
    const wsCData = fichasC.map(f => ({
      "Data": f.data,
      "Comunidade": f.comunidade,
      "Entrevistador": f.entrevistador,
      "Entrevistado": f.nomeOuCodigoPseudo,
      "Idade": f.idade,
      "Género": f.genero,
      "Tipo de Deficiência": f.tipoDeficiencia,
      "Principal Barreira": f.barreiraPrincipal,
      "Solução Proposta": f.solucaoProposta,
      "Citação Principal": f.citacaoPrincipal,
      "Disponível Rota Piloto": f.disponivelRota,
      "Observações": f.observacoesEntrevistador,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wsCData), "Ficha C – Entrevistas");

    // Sheet 4 – Citações
    const citDataB = fichasB.filter(f => f.citacaoPoderosa).map(f => ({
      "Origem": "Grupo Focal", "Comunidade": f.comunidade, "Data": f.data, "Citação": f.citacaoPoderosa,
    }));
    const citDataC = fichasC.filter(f => f.citacaoPrincipal).map(f => ({
      "Origem": "Entrevista Individual", "Comunidade": f.comunidade, "Data": f.data, "Citação": f.citacaoPrincipal,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([...citDataB, ...citDataC]), "Citações Advocacy");

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

  if (loading) {
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

  // Total de PcD ouvidas em TODAS as fichas (B = grupo, C = individual)
  const totalPcDOuvidas = totalParticipantes + fichasC.length;

  // Deficiência: combinar dados de participantes da Ficha B + entrevistados da Ficha C
  const deficienciasB = fichasB.flatMap(f => f.participantes.map(p => p.tipoDeficiencia).filter(Boolean));
  const deficienciasC = fichasC.map(f => f.tipoDeficiencia).filter(Boolean);
  const deficienciaCounts = countBy(
    [...deficienciasB, ...deficienciasC].map(d => ({ d })),
    item => item.d
  );

  // Género: Ficha B participantes + Ficha C entrevistados
  const generoB = fichasB.flatMap(f => f.participantes.map(p => p.genero).filter(Boolean));
  const generoC = fichasC.map(f => f.genero).filter(Boolean);
  const generoCounts = countBy([...generoB, ...generoC].map(g => ({ g })), item => item.g);

  // Comunidades cobertas (B + C)
  const comunidadesB = fichasB.map(f => f.comunidade).filter(Boolean);
  const comunidadesC = fichasC.map(f => f.comunidade).filter(Boolean);
  const comunidadeCounts = countBy([...comunidadesB, ...comunidadesC].map(c => ({ c })), item => item.c);

  // Cruzamento: Deficiência × Disponibilidade para rota piloto (Ficha C)
  const crossDeficienciaRota: Record<string, { sim: number; talvez: number; nao: number }> = {};
  fichasC.forEach(f => {
    if (!f.tipoDeficiencia) return;
    if (!crossDeficienciaRota[f.tipoDeficiencia]) crossDeficienciaRota[f.tipoDeficiencia] = { sim: 0, talvez: 0, nao: 0 };
    if (f.disponivelRota === "Sim, com certeza") crossDeficienciaRota[f.tipoDeficiencia].sim++;
    else if (f.disponivelRota === "Talvez") crossDeficienciaRota[f.tipoDeficiencia].talvez++;
    else if (f.disponivelRota === "Não por agora") crossDeficienciaRota[f.tipoDeficiencia].nao++;
  });

  // Faixa etária (Ficha C)
  const faixaEtariaCounts: Record<string, number> = { "18-25": 0, "26-35": 0, "36-50": 0, "51+": 0, "N/D": 0 };
  fichasC.forEach(f => {
    const idade = parseInt(f.idade);
    if (!idade) { faixaEtariaCounts["N/D"]++; return; }
    if (idade <= 25) faixaEtariaCounts["18-25"]++;
    else if (idade <= 35) faixaEtariaCounts["26-35"]++;
    else if (idade <= 50) faixaEtariaCounts["36-50"]++;
    else faixaEtariaCounts["51+"]++;
  });

  // ── Por local visitado (Ficha A) — comparação entre pontos ────────────────
  const localStats: Record<string, { count: number; nivelMedio: number; inacessiveis: number }> = {};
  fichasA.forEach(f => {
    const local = f.pontoVisitado || "Sem nome";
    if (!localStats[local]) localStats[local] = { count: 0, nivelMedio: 0, inacessiveis: 0 };
    localStats[local].count++;
    if (f.nivelAcessibilidade === "Inacessível") localStats[local].inacessiveis++;
  });

  // ── RESUMO NARRATIVO AUTOMÁTICO ──────────────────────────────────────────
  function gerarResumo(): string {
    const partes: string[] = [];

    // Abertura — escopo da recolha
    if (fichasA.length === 0 && fichasB.length === 0 && fichasC.length === 0) {
      return "Ainda não há dados suficientes para gerar um resumo. Este texto será atualizado automaticamente à medida que as fichas forem submetidas no campo.";
    }

    partes.push(
      `Entre ${[...new Set([...fichasA.map(f=>f.data), ...fichasB.map(f=>f.data), ...fichasC.map(f=>f.data)])].filter(Boolean).sort()[0] || "—"} e ${[...new Set([...fichasA.map(f=>f.data), ...fichasB.map(f=>f.data), ...fichasC.map(f=>f.data)])].filter(Boolean).sort().slice(-1)[0] || "—"}, a equipa de avaliação do projecto Natureza Sem Barreiras realizou ${fichasA.length} levantamento(s) de acessibilidade no Parque Nacional da Gorongosa, ${fichasB.length} grupo(s) focal(is) e ${fichasC.length} entrevista(s) individual(is) nas comunidades, ouvindo no total ${totalPcDOuvidas} pessoas com deficiência.`
    );

    // Ficha A — síntese
    if (fichasA.length > 0) {
      const inacessiveis = fichasA.filter(f => f.nivelAcessibilidade === "Inacessível").length;
      const parcial = fichasA.filter(f => f.nivelAcessibilidade === "Parcialmente Acessível").length;
      const aptos = fichasA.filter(f => f.incluirRotaPiloto && f.incluirRotaPiloto !== "Não").length;
      const piorCategoria = radarData.reduce((min, r) => r.A < min.A ? r : min, radarData[0]);

      partes.push(
        `Dos locais avaliados no parque, ${inacessiveis} foram classificados como totalmente inacessíveis e ${parcial} como parcialmente acessíveis. A categoria com pior desempenho médio foi "${piorCategoria.subject}" (${piorCategoria.A.toFixed(1)}/5). ${aptos} de ${fichasA.length} locais avaliados foram considerados aptos, com ou sem adaptações, para integrar a rota turística piloto acessível.`
      );
    }

    // Ficha B + C — barreiras e vozes
    const todasBarreiras = [
      ...fichasB.flatMap(f => f.top3Barreiras.filter(Boolean)),
      ...fichasC.map(f => f.barreiraPrincipal).filter(Boolean),
    ];
    if (todasBarreiras.length > 0) {
      const counts = countBy(todasBarreiras.map(b => ({ b })), item => item.b);
      const top = sortedEntries(counts).slice(0, 3).map(([b]) => b);
      partes.push(
        `Nas comunidades, as barreiras mais frequentemente reportadas pelas próprias pessoas com deficiência foram: ${top.join("; ")}. Estas razões de exclusão antecedem, em muitos casos, qualquer barreira física dentro do parque — afectando a decisão de sequer tentar a visita.`
      );
    }

    // Disponibilidade para rota piloto
    const disponiveis = fichasC.filter(f => f.disponivelRota === "Sim, com certeza").length;
    if (fichasC.length > 0) {
      partes.push(
        `Das ${fichasC.length} pessoas entrevistadas individualmente, ${disponiveis} manifestaram disponibilidade total para participar na validação da rota piloto acessível, o que constitui uma base inicial de protagonistas para a fase de testagem do projecto.`
      );
    }

    // Citações
    const numCitacoes = fichasB.filter(f => f.citacaoPoderosa).length + fichasC.filter(f => f.citacaoPrincipal).length;
    if (numCitacoes > 0) {
      partes.push(
        `Foram registadas ${numCitacoes} citações directas que podem ser utilizadas no relatório de advocacia dirigido à Administração do Parque Nacional da Gorongosa e ao Governo do Distrito da Gorongosa.`
      );
    }

    return partes.join(" ");
  }

  const resumoTexto = gerarResumo();

  function copiarResumo() {
    navigator.clipboard.writeText(resumoTexto);
  }

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
            { id: "fichasC", label: `🎤 Fichas C (${fichasC.length})` },
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
                { label: "PcD Ouvidas", value: totalPcDOuvidas, icon: "🎤", color: "#1A6B3A" },
                { label: "Aptas para Rota Piloto", value: rotaPilotoSim, icon: "✅", color: "#0D4424" },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="text-2xl mb-1">{kpi.icon}</div>
                  <div className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* ── RESUMO AUTOMÁTICO PARA O RELATÓRIO ── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4" style={{ borderColor: "#1A6B3A" }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-bold text-gray-700 text-sm">📝 Resumo Automático — Rascunho para o Relatório</h3>
                  <p className="text-xs text-gray-400">Gerado a partir dos dados actuais · Reveja e ajuste antes de usar no relatório final</p>
                </div>
                <button onClick={copiarResumo}
                  className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all"
                  style={{ background: "#1A6B3A" }}>
                  📋 Copiar
                </button>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mt-3 whitespace-pre-line">{resumoTexto}</p>
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

            {/* ── COMPARAÇÃO ENTRE LOCAIS VISITADOS (FICHA A) ── */}
            {Object.keys(localStats).length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-1 text-sm">🗺️ Comparação Entre Locais Visitados no PNG</h3>
                <p className="text-xs text-gray-400 mb-4">Útil para identificar quais pontos do parque precisam de intervenção prioritária</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-gray-500 font-semibold">Local</th>
                        <th className="text-center py-2 px-2 text-gray-500 font-semibold">Nº Avaliações</th>
                        <th className="text-center py-2 px-2 text-red-500 font-semibold">Inacessível</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(localStats).sort((a, b) => b[1].count - a[1].count).map(([local, stats]) => (
                        <tr key={local} className="border-b border-gray-100">
                          <td className="py-2 px-2 text-gray-700 font-medium">{local}</td>
                          <td className="py-2 px-2 text-center text-gray-600">{stats.count}</td>
                          <td className="py-2 px-2 text-center font-bold" style={{ color: stats.inacessiveis > 0 ? "#dc2626" : "#9ca3af" }}>
                            {stats.inacessiveis > 0 ? stats.inacessiveis : "–"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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

            {/* ── DISTRIBUIÇÃO DEMOGRÁFICA E CRUZAMENTOS ── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-700 mb-1 text-sm">👥 Distribuição Demográfica das PcD Ouvidas</h3>
              <p className="text-xs text-gray-400 mb-4">Combina participantes dos grupos focais (Ficha B) e entrevistas individuais (Ficha C) · Total: <strong>{totalPcDOuvidas}</strong> pessoas</p>

              <div className="grid md:grid-cols-2 gap-5">
                {/* Por tipo de deficiência */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Por Tipo de Deficiência</p>
                  {sortedEntries(deficienciaCounts).length === 0 && <p className="text-xs text-gray-400">Sem dados ainda.</p>}
                  <div className="space-y-1.5">
                    {sortedEntries(deficienciaCounts).map(([tipo, count]) => {
                      const max = Math.max(...Object.values(deficienciaCounts), 1);
                      return (
                        <div key={tipo} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-32 flex-shrink-0 truncate" title={tipo}>{tipo}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: "#1A6B3A" }} />
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Por género */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Por Género</p>
                  {sortedEntries(generoCounts).length === 0 && <p className="text-xs text-gray-400">Sem dados ainda.</p>}
                  <div className="space-y-1.5">
                    {sortedEntries(generoCounts).map(([g, count]) => {
                      const max = Math.max(...Object.values(generoCounts), 1);
                      const cor = g === "Feminino" ? "#db2777" : g === "Masculino" ? "#2563eb" : "#9ca3af";
                      return (
                        <div key={g} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-24 flex-shrink-0">{g}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: cor }} />
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Por comunidade */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Por Comunidade Visitada</p>
                  {sortedEntries(comunidadeCounts).length === 0 && <p className="text-xs text-gray-400">Sem dados ainda.</p>}
                  <div className="space-y-1.5">
                    {sortedEntries(comunidadeCounts).map(([c, count]) => {
                      const max = Math.max(...Object.values(comunidadeCounts), 1);
                      return (
                        <div key={c} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-24 flex-shrink-0 truncate" title={c}>{c}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: "#0D4424" }} />
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Por faixa etária (Ficha C) */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Por Faixa Etária (Entrevistas Individuais)</p>
                  {fichasC.length === 0 && <p className="text-xs text-gray-400">Sem dados ainda.</p>}
                  <div className="space-y-1.5">
                    {Object.entries(faixaEtariaCounts).filter(([, v]) => v > 0).map(([faixa, count]) => {
                      const max = Math.max(...Object.values(faixaEtariaCounts), 1);
                      return (
                        <div key={faixa} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-24 flex-shrink-0">{faixa} anos</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: "#15803d" }} />
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ── CRUZAMENTO: DEFICIÊNCIA × DISPONIBILIDADE PARA ROTA PILOTO ── */}
            {Object.keys(crossDeficienciaRota).length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-1 text-sm">🔄 Cruzamento: Tipo de Deficiência × Disponibilidade para Rota Piloto</h3>
                <p className="text-xs text-gray-400 mb-4">Com base nas entrevistas individuais (Ficha C) — ajuda a planear quem convidar para testar a rota acessível</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-gray-500 font-semibold">Tipo de Deficiência</th>
                        <th className="text-center py-2 px-2 text-green-700 font-semibold">✅ Sim, com certeza</th>
                        <th className="text-center py-2 px-2 text-yellow-600 font-semibold">🤔 Talvez</th>
                        <th className="text-center py-2 px-2 text-red-500 font-semibold">❌ Não por agora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(crossDeficienciaRota).map(([tipo, vals]) => (
                        <tr key={tipo} className="border-b border-gray-100">
                          <td className="py-2 px-2 text-gray-700 font-medium">{tipo}</td>
                          <td className="py-2 px-2 text-center font-bold text-green-700">{vals.sim || "–"}</td>
                          <td className="py-2 px-2 text-center font-bold text-yellow-600">{vals.talvez || "–"}</td>
                          <td className="py-2 px-2 text-center font-bold text-red-500">{vals.nao || "–"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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

        {/* ── FICHAS C ── */}
        {tab === "fichasC" && (
          <div className="space-y-3">
            {fichasC.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Nenhuma entrevista individual submetida ainda.</div>}
            {fichasC.map(f => (
              <div key={f.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800">{f.nomeOuCodigoPseudo || "Entrevistado"}</h3>
                    <p className="text-xs text-gray-400">
                      {f.data} · {f.comunidade} · {f.entrevistador && `Entrevistador: ${f.entrevistador}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {f.idade && `${f.idade} anos`} {f.genero && `· ${f.genero}`} {f.tipoDeficiencia && `· ${f.tipoDeficiencia}`}
                    </p>
                  </div>
                  <button onClick={async () => { if(confirm("Eliminar este registo?")){ await deleteFichaC(f.id!); loadData(); } }}
                    className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                </div>

                {f.citacaoPrincipal && (
                  <div className="border-l-4 pl-3 py-1 mb-3" style={{ borderColor: "#1A6B3A" }}>
                    <p className="text-sm text-gray-700 italic">&ldquo;{f.citacaoPrincipal}&rdquo;</p>
                  </div>
                )}

                {f.barreiraPrincipal && (
                  <div className="bg-red-50 rounded-xl p-3 mb-2">
                    <p className="text-xs font-bold text-red-600 mb-1">Principal Barreira</p>
                    <p className="text-sm text-gray-700">{f.barreiraPrincipal}</p>
                  </div>
                )}
                {f.solucaoProposta && (
                  <div className="bg-green-50 rounded-xl p-3 mb-2">
                    <p className="text-xs font-bold text-green-700 mb-1">Solução Proposta</p>
                    <p className="text-sm text-gray-700">{f.solucaoProposta}</p>
                  </div>
                )}
                {f.disponivelRota && (
                  <p className="text-xs text-gray-500 mt-2">🗺️ Disponível para rota piloto: <strong>{f.disponivelRota}</strong></p>
                )}

                {f.respostas && Object.keys(f.respostas).length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs font-bold text-green-700 cursor-pointer">Ver respostas completas</summary>
                    <div className="mt-2 space-y-2">
                      {Object.entries(f.respostas).filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-bold text-gray-400 mb-1">Pergunta {k}</p>
                          <p className="text-sm text-gray-700">{v}</p>
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
              {fichasB.filter(f => f.citacaoPoderosa).length === 0 && fichasC.filter(f => f.citacaoPrincipal).length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Nenhuma citação registada ainda.</div>
              )}
              {fichasB.filter(f => f.citacaoPoderosa).map(f => (
                <div key={`b-${f.id}`} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="border-l-4 pl-4 py-2" style={{ borderColor: "#1A6B3A" }}>
                    <p className="text-base text-gray-800 italic leading-relaxed">&ldquo;{f.citacaoPoderosa}&rdquo;</p>
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
              {fichasC.filter(f => f.citacaoPrincipal).map(f => (
                <div key={`c-${f.id}`} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="border-l-4 pl-4 py-2" style={{ borderColor: "#0D4424" }}>
                    <p className="text-base text-gray-800 italic leading-relaxed">&ldquo;{f.citacaoPrincipal}&rdquo;</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    — Entrevista individual, <strong>{f.comunidade}</strong>, {f.data}
                    {f.idade && ` · ${f.idade} anos`} {f.tipoDeficiencia && `· ${f.tipoDeficiencia}`}
                  </p>
                  {f.barreiraPrincipal && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{f.barreiraPrincipal}</span>
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
