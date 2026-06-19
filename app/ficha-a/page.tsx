"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ScaleInput from "@/components/ScaleInput";
import SectionHeader from "@/components/SectionHeader";
import { saveFichaA } from "@/lib/db";
import { FichaA, TipoPonto } from "@/lib/types";

const TIPOS_PONTO: TipoPonto[] = [
  "Portão / Entrada Principal","Bilheteira / Posto de Informação","Lodge / Alojamento",
  "Casa de Banho / Sanitários","Trilho / Percurso de Observação","Posto de Observação / Miradouro",
  "Veículo de Transporte Interno","Área de Refeições / Restaurante","Loja / Espaço Comercial","Outro",
];

const ACESSO_ITEMS = [
  "Existência de rampas de acesso","Inclinação adequada das rampas",
  "Superfície do piso (firme e antiderrapante)","Largura dos corredores e passagens (≥ 90 cm)",
  "Ausência de obstáculos no percurso","Uso de cadeira de rodas em todo o espaço",
  "Sinalização no chão para deficiência visual","Acesso desde o estacionamento / zona de chegada",
];
const SANITARIOS_ITEMS = [
  "Existência de sanitários adaptados","Espaço interior suficiente (rotação 360°)",
  "Barras de apoio instaladas","Lavatório acessível (altura adequada)",
  "Porta com largura adequada (≥ 80 cm) e abertura para fora",
];
const TRANSPORTE_ITEMS = [
  "Veículo de safári / transporte interno acessível","Possibilidade de embarque sem apoio",
  "Espaço para cadeira de rodas ou equipamento de mobilidade","Cintos de segurança e apoios disponíveis",
];
const COMUNICACIONAL_ITEMS = [
  "Sinalização em formatos alternativos (Braille, pictogramas, áudio)",
  "Informação em Língua de Sinais Moçambicana (LSM)",
  "Materiais em formatos acessíveis (áudio, vídeo legendado)",
  "Website / app do parque com acessibilidade digital",
  "Guias com formação em comunicação acessível",
  "Mapas e plantas em formato tátil ou alto contraste",
  "Menus e listas em formatos alternativos",
];
const ATITUDINAL_ITEMS = [
  "Atitude dos funcionários / guias perante as PcD",
  "Disponibilidade para prestar apoio quando solicitado",
  "Ausência de paternalismo ou discriminação",
  "Capacidade de comunicação com pessoas com deficiência sensorial",
  "Políticas ou procedimentos visíveis de inclusão",
  "PcD consideradas nos planos e roteiros turísticos",
];

function makeScaleState(items: string[]): Record<string, number | null> {
  return Object.fromEntries(items.map((i) => [i, null]));
}

const emptyFotos = Array.from({ length: 6 }, (_, i) => ({
  numero: i + 1, descricao: "", tipo: "" as "", recomendacao: "",
}));

export default function FichaAPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<Omit<FichaA, "id" | "criadoEm">>({
    numeroRegisto: "", data: new Date().toISOString().slice(0, 10),
    pontoVisitado: "", horaInicio: "", horaFim: "",
    nomeAvaliador: "", tipoDeficienciaAvaliador: "",
    tiposPonto: [], outroTipoPonto: "",
    fisicaAcesso: makeScaleState(ACESSO_ITEMS),
    fisicaSanitarios: makeScaleState(SANITARIOS_ITEMS),
    fisicaTransporte: makeScaleState(TRANSPORTE_ITEMS),
    observacoesFisicas: "",
    comunicacional: makeScaleState(COMUNICACIONAL_ITEMS),
    observacoesComunicacional: "",
    atitudinal: makeScaleState(ATITUDINAL_ITEMS),
    incidentesAtitudinais: "",
    fotos: emptyFotos,
    nivelAcessibilidade: "",
    principalBarreira: "", recomendacaoPrioritaria: "", incluirRotaPiloto: "",
  });

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setScale(section: "fisicaAcesso" | "fisicaSanitarios" | "fisicaTransporte" | "comunicacional" | "atitudinal", key: string, val: number) {
    setForm((f) => ({ ...f, [section]: { ...f[section], [key]: val } }));
  }

  function toggleTipo(t: TipoPonto) {
    setForm((f) => ({
      ...f,
      tiposPonto: f.tiposPonto.includes(t) ? f.tiposPonto.filter((x) => x !== t) : [...f.tiposPonto, t],
    }));
  }

  function setFoto(idx: number, field: string, val: string) {
    setForm((f) => {
      const fotos = [...f.fotos];
      fotos[idx] = { ...fotos[idx], [field]: val };
      return { ...f, fotos };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await saveFichaA(form);
      setSaved(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err: unknown) {
      setError("Erro ao guardar. Verifique a ligação à internet.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0faf4" }}>
        <div className="text-center p-8">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-700">Ficha guardada!</h2>
          <p className="text-gray-500 mt-2">Os dados foram enviados para a coordenação.</p>
        </div>
      </div>
    );
  }

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white";
  const textareaClass = inputClass + " min-h-[80px] resize-y";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 shadow-sm" style={{ background: "#1A6B3A" }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-green-200 text-xs">ADEMO-Sofala · Natureza Sem Barreiras</p>
            <h1 className="text-white font-bold text-base">Ficha A — Levantamento no PNG</h1>
          </div>
          <span className="text-2xl">🏕️</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* SECÇÃO I */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <SectionHeader icon="📋" title="Secção I — Identificação" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nº do Registo</label>
              <input className={inputClass} value={form.numeroRegisto} onChange={e => setField("numeroRegisto", e.target.value)} placeholder="ex: NSB-A-001" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Data</label>
              <input type="date" className={inputClass} value={form.data} onChange={e => setField("data", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Ponto / Local Visitado</label>
              <input className={inputClass} value={form.pontoVisitado} onChange={e => setField("pontoVisitado", e.target.value)} placeholder="ex: Portão Principal do PNG" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hora de Início</label>
              <input type="time" className={inputClass} value={form.horaInicio} onChange={e => setField("horaInicio", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hora de Fim</label>
              <input type="time" className={inputClass} value={form.horaFim} onChange={e => setField("horaFim", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Avaliador</label>
              <input className={inputClass} value={form.nomeAvaliador} onChange={e => setField("nomeAvaliador", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Deficiência do Avaliador</label>
              <select className={inputClass} value={form.tipoDeficienciaAvaliador} onChange={e => setField("tipoDeficienciaAvaliador", e.target.value)}>
                <option value="">Selecionar...</option>
                <option>Deficiência Física/Motora</option>
                <option>Deficiência Visual</option>
                <option>Deficiência Auditiva</option>
                <option>Deficiência Intelectual</option>
                <option>Deficiência Psicossocial</option>
                <option>Albinismo</option>
                <option>Deficiência Múltipla</option>
                <option>Surdocegueira</option>
                <option>Deficiência de Fala/Comunicação</option>
                <option>Outra</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-600 mb-2">Tipo de Ponto Visitado</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_PONTO.map((t) => (
                <label key={t} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-all ${form.tiposPonto.includes(t) ? "border-green-500 bg-green-50 text-green-800 font-medium" : "border-gray-200 text-gray-600"}`}>
                  <input type="checkbox" className="hidden" checked={form.tiposPonto.includes(t)} onChange={() => toggleTipo(t)} />
                  <span className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center text-xs ${form.tiposPonto.includes(t) ? "bg-green-500 border-green-500 text-white" : "border-gray-300"}`}>
                    {form.tiposPonto.includes(t) && "✓"}
                  </span>
                  {t}
                </label>
              ))}
            </div>
            {form.tiposPonto.includes("Outro") && (
              <input className={inputClass + " mt-2"} value={form.outroTipoPonto} onChange={e => setField("outroTipoPonto", e.target.value)} placeholder="Especifique..." />
            )}
          </div>
        </div>

        {/* SECÇÃO II */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <SectionHeader icon="🏗️" title="Secção II — Barreiras Físicas" />

          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">2.1 Acesso e Circulação</p>
          <div className="space-y-3">
            {ACESSO_ITEMS.map((item) => (
              <div key={item} className="border rounded-xl p-3 bg-gray-50">
                <p className="text-sm text-gray-700 mb-2">{item}</p>
                <ScaleInput value={form.fisicaAcesso[item] as number | null} onChange={(v) => setScale("fisicaAcesso", item, v)} />
              </div>
            ))}
          </div>

          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-5 mb-3">2.2 Sanitários e Instalações</p>
          <div className="space-y-3">
            {SANITARIOS_ITEMS.map((item) => (
              <div key={item} className="border rounded-xl p-3 bg-gray-50">
                <p className="text-sm text-gray-700 mb-2">{item}</p>
                <ScaleInput value={form.fisicaSanitarios[item] as number | null} onChange={(v) => setScale("fisicaSanitarios", item, v)} />
              </div>
            ))}
          </div>

          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-5 mb-3">2.3 Transporte e Veículos</p>
          <div className="space-y-3">
            {TRANSPORTE_ITEMS.map((item) => (
              <div key={item} className="border rounded-xl p-3 bg-gray-50">
                <p className="text-sm text-gray-700 mb-2">{item}</p>
                <ScaleInput value={form.fisicaTransporte[item] as number | null} onChange={(v) => setScale("fisicaTransporte", item, v)} />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Observações adicionais sobre barreiras físicas</label>
            <textarea className={textareaClass} value={form.observacoesFisicas} onChange={e => setField("observacoesFisicas", e.target.value)} />
          </div>
        </div>

        {/* SECÇÃO III */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <SectionHeader icon="📢" title="Secção III — Barreiras Comunicacionais" />
          <div className="space-y-3">
            {COMUNICACIONAL_ITEMS.map((item) => (
              <div key={item} className="border rounded-xl p-3 bg-gray-50">
                <p className="text-sm text-gray-700 mb-2">{item}</p>
                <ScaleInput value={form.comunicacional[item] as number | null} onChange={(v) => setScale("comunicacional", item, v)} />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Observações</label>
            <textarea className={textareaClass} value={form.observacoesComunicacional} onChange={e => setField("observacoesComunicacional", e.target.value)} />
          </div>
        </div>

        {/* SECÇÃO IV */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <SectionHeader icon="🤝" title="Secção IV — Barreiras Atitudinais / Sociais" />
          <div className="space-y-3">
            {ATITUDINAL_ITEMS.map((item) => (
              <div key={item} className="border rounded-xl p-3 bg-gray-50">
                <p className="text-sm text-gray-700 mb-2">{item}</p>
                <ScaleInput value={form.atitudinal[item] as number | null} onChange={(v) => setScale("atitudinal", item, v)} />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Incidentes ou situações atitudinais observadas</label>
            <textarea className={textareaClass} value={form.incidentesAtitudinais} onChange={e => setField("incidentesAtitudinais", e.target.value)} />
          </div>
        </div>

        {/* SECÇÃO V — FOTOS */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <SectionHeader icon="📷" title="Secção V — Registo de Evidências" subtitle="Descreva as fotos tiradas e identifique o tipo de barreira" />
          <div className="space-y-3">
            {form.fotos.map((foto, idx) => (
              <div key={idx} className="border rounded-xl p-3 bg-gray-50">
                <p className="text-xs font-bold text-gray-400 mb-2">Foto {foto.numero}</p>
                <input className={inputClass + " mb-2"} value={foto.descricao} onChange={e => setFoto(idx, "descricao", e.target.value)} placeholder="Descreva a barreira / evidência..." />
                <div className="flex gap-2 flex-wrap mb-2">
                  {["Física", "Comunicacional", "Atitudinal"].map(t => (
                    <label key={t} className={`px-3 py-1 rounded-full text-xs cursor-pointer border transition-all ${foto.tipo === t ? "border-transparent text-white" : "border-gray-300 text-gray-600"}`}
                      style={foto.tipo === t ? { background: "#1A6B3A" } : {}}>
                      <input type="radio" className="hidden" name={`foto-tipo-${idx}`} value={t} checked={foto.tipo === t} onChange={() => setFoto(idx, "tipo", t)} />
                      {t}
                    </label>
                  ))}
                </div>
                <input className={inputClass} value={foto.recomendacao} onChange={e => setFoto(idx, "recomendacao", e.target.value)} placeholder="Recomendação imediata..." />
              </div>
            ))}
          </div>
        </div>

        {/* SECÇÃO VI */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <SectionHeader icon="🎯" title="Secção VI — Avaliação Global" />

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-2">Nível de Acessibilidade Global</label>
            <div className="grid grid-cols-2 gap-2">
              {["Inacessível","Parcialmente Acessível","Acessível com Apoio","Totalmente Acessível"].map(n => (
                <label key={n} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-sm transition-all ${form.nivelAcessibilidade === n ? "border-green-500 bg-green-50 font-semibold text-green-800" : "border-gray-200 text-gray-600"}`}>
                  <input type="radio" className="hidden" name="nivel" value={n} checked={form.nivelAcessibilidade === n} onChange={() => setField("nivelAcessibilidade", n as FichaA["nivelAcessibilidade"])} />
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${form.nivelAcessibilidade === n ? "border-green-500 bg-green-500" : "border-gray-300"}`} />
                  {n}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Principal Barreira Identificada</label>
            <textarea className={textareaClass} value={form.principalBarreira} onChange={e => setField("principalBarreira", e.target.value)} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Recomendação Prioritária</label>
            <textarea className={textareaClass} value={form.recomendacaoPrioritaria} onChange={e => setField("recomendacaoPrioritaria", e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Este espaço pode ser incluído na rota piloto acessível?</label>
            <div className="flex gap-2 flex-wrap">
              {["Sim, sem condições","Sim, com adaptações","Não"].map(op => (
                <label key={op} className={`px-4 py-2 rounded-xl border cursor-pointer text-sm transition-all ${form.incluirRotaPiloto === op ? "border-transparent text-white font-semibold" : "border-gray-300 text-gray-600"}`}
                  style={form.incluirRotaPiloto === op ? { background: "#1A6B3A" } : {}}>
                  <input type="radio" className="hidden" name="rota" value={op} checked={form.incluirRotaPiloto === op} onChange={() => setField("incluirRotaPiloto", op as FichaA["incluirRotaPiloto"])} />
                  {op}
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>}

        <button type="submit" disabled={saving}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-all disabled:opacity-60"
          style={{ background: saving ? "#6b7280" : "linear-gradient(135deg, #0D4424, #1A6B3A)" }}>
          {saving ? "A guardar..." : "✅ Submeter Ficha A"}
        </button>
        <div className="h-8" />
      </form>
    </div>
  );
}
