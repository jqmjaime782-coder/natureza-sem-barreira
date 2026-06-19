"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import SectionHeader from "@/components/SectionHeader";
import { saveFichaB } from "@/lib/db";
import { adicionarFila } from "@/lib/offlineQueue";
import { SyncBanner } from "@/lib/sync";
import { FichaB, Participante } from "@/lib/types";

const BLOCOS = [
  {
    id: "B1",
    titulo: "Bloco 1 — Aquecimento (10–15 min)",
    cor: "#1A6B3A",
    perguntas: [
      { id: "1.1", pergunta: "Quem aqui já ouviu falar do Parque Nacional da Gorongosa? O que sabem sobre ele?", nota: "Activar conhecimento prévio. Não corrigir nem completar." },
      { id: "1.2", pergunta: "Algum de vós já visitou o parque, mesmo que uma vez?", nota: "Se sim: 'Como foi?' | Se não: 'O que vos impediu?' (não aprofundar ainda)" },
      { id: "1.3", pergunta: "O turismo e a natureza fazem parte das vossas vidas de alguma forma?", nota: "Situar o grupo no tema sem pressão." },
    ],
  },
  {
    id: "B2",
    titulo: "Bloco 2 — Barreiras e Exclusão (30–40 min)",
    cor: "#0D4424",
    perguntas: [
      { id: "2.1", pergunta: "O que vos impede de visitar o PNG? Pensem em todos os obstáculos que consigam imaginar.", nota: "Não interromper. Deixar listar livremente. Depois aprofundar cada barreira." },
      { id: "2.2", pergunta: "O transporte até ao parque é um problema para vocês? Porquê?", nota: "Explorar: custo, distância, adequação dos veículos, horários." },
      { id: "2.3", pergunta: "Já sentiram que não seriam bem-vindos ou que o parque 'não é para vocês'? Porquê?", nota: "Explorar atitudes de funcionários, da família, da comunidade." },
      { id: "2.4", pergunta: "Tiveram acesso a informação sobre o que o parque oferece e como chegar lá? Em que formato?", nota: "Explorar: língua, formato, canal (rádio, telemóvel, cartaz, pessoa)." },
      { id: "2.5", pergunta: "O custo das visitas é um obstáculo? O que seria um preço acessível para vocês?", nota: "Identificar barreira económica e possíveis soluções." },
      { id: "2.6", pergunta: "A vossa deficiência cria desafios específicos para visitar um parque natural? Quais?", nota: "Respeitar silêncios. Diferentes tipos de deficiência trarão respostas muito diferentes." },
    ],
  },
  {
    id: "B3",
    titulo: "Bloco 3 — Direitos e Consciência (15–20 min)",
    cor: "#1A6B3A",
    perguntas: [
      { id: "3.1", pergunta: "Sabiam que a CDPD garante o direito de participar em actividades culturais, de lazer e turismo?", nota: "Informar brevemente após as respostas." },
      { id: "3.2", pergunta: "Alguém já reclamou ou exigiu alguma adaptação para poder participar numa actividade?", nota: "Identificar práticas de auto-advocacia existentes." },
      { id: "3.3", pergunta: "O Estado ou as autoridades locais têm alguma responsabilidade nisto? O que deveriam fazer?", nota: "Activar pensamento sobre responsabilização — essencial para a advocacy." },
    ],
  },
  {
    id: "B4",
    titulo: "Bloco 4 — Visão e Soluções (20–25 min)",
    cor: "#0D4424",
    perguntas: [
      { id: "4.1", pergunta: "Se o parque fosse completamente acessível, o que precisaria ter para que viessem visitar?", nota: "Explorar: actividades, serviços, informação, transporte, custo." },
      { id: "4.2", pergunta: "Quem devia ser responsável — o parque, o governo distrital, as operadoras? Ou todos?", nota: "Distribuição de responsabilidades para informar a advocacy." },
      { id: "4.3", pergunta: "Se pudessem mandar uma mensagem ao Administrador do Distrito ou à direcção do parque, o que diriam?", nota: "Gravar ou registar textualmente — são citações poderosas para o relatório de advocacy." },
      { id: "4.4", pergunta: "Gostariam de participar activamente em monitorar as melhorias que forem feitas no parque?", nota: "Identificar potenciais monitores comunitários e reforçar protagonismo das PcD." },
    ],
  },
];

const emptyParticipantes: Participante[] = Array.from({ length: 10 }, () => ({
  nome: "", idade: "", tipoDeficiencia: "", genero: "",
}));

export default function FichaBPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<Omit<FichaB, "id" | "criadoEm">>({
    numeroSessao: "", data: new Date().toISOString().slice(0, 10),
    comunidade: "", hora: "", moderador: "", observador: "",
    numParticipantes: "", numMulheres: "",
    participantes: emptyParticipantes,
    respostas: BLOCOS.flatMap(b => b.perguntas.map(p => ({ pergunta: p.id, bloco: b.id, resposta: "" }))),
    top3Barreiras: ["", "", ""],
    citacaoPoderosa: "",
    solucoesProposta: ["", "", ""],
    monitoresComunitarios: null,
    observacoesGerais: "",
  });

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function setParticipante(idx: number, field: keyof Participante, val: string) {
    setForm(f => {
      const p = [...f.participantes];
      p[idx] = { ...p[idx], [field]: val };
      return { ...f, participantes: p };
    });
  }

  function setResposta(pergId: string, val: string) {
    setForm(f => ({
      ...f,
      respostas: f.respostas.map(r => r.pergunta === pergId ? { ...r, resposta: val } : r),
    }));
  }

  function getResposta(pergId: string) {
    return form.respostas.find(r => r.pergunta === pergId)?.resposta ?? "";
  }

  const [savedOffline, setSavedOffline] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!navigator.onLine) {
      await adicionarFila("fichas_b", form as unknown as Record<string, unknown>);
      setSavedOffline(true);
      setSaving(false);
      setTimeout(() => router.push("/"), 2500);
      return;
    }

    try {
      await saveFichaB(form);
      setSaved(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err: unknown) {
      await adicionarFila("fichas_b", form as unknown as Record<string, unknown>);
      setSavedOffline(true);
      console.error(err);
      setTimeout(() => router.push("/"), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (savedOffline) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fffbeb" }}>
        <div className="text-center p-8 max-w-sm">
          <div className="text-6xl mb-4">📲</div>
          <h2 className="text-2xl font-bold text-amber-700">Sessão guardada no telemóvel!</h2>
          <p className="text-gray-600 mt-2">Não há internet neste momento. Assim que houver ligação, esta sessão será enviada automaticamente para a coordenação.</p>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0faf4" }}>
        <div className="text-center p-8">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-700">Sessão guardada!</h2>
          <p className="text-gray-500 mt-2">Os dados foram enviados para a coordenação.</p>
        </div>
      </div>
    );
  }

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white";
  const textareaClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white min-h-[90px] resize-y";

  return (
    <div className="min-h-screen bg-gray-50">
      <SyncBanner />
      <div className="sticky top-0 z-10 shadow-sm" style={{ background: "#0D4424" }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-green-200 text-xs">ADEMO-Sofala · Natureza Sem Barreiras</p>
            <h1 className="text-white font-bold text-base">Ficha B — Grupo Focal Comunitário</h1>
          </div>
          <span className="text-2xl">👥</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* SECÇÃO I */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <SectionHeader icon="📋" title="Secção I — Identificação da Sessão" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nº da Sessão</label>
              <input className={inputClass} value={form.numeroSessao} onChange={e => setField("numeroSessao", e.target.value)} placeholder="ex: NSB-B-001" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Data</label>
              <input type="date" className={inputClass} value={form.data} onChange={e => setField("data", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Comunidade / Local</label>
              <input className={inputClass} value={form.comunidade} onChange={e => setField("comunidade", e.target.value)} placeholder="ex: Nhambita" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hora</label>
              <input type="time" className={inputClass} value={form.hora} onChange={e => setField("hora", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Moderador</label>
              <input className={inputClass} value={form.moderador} onChange={e => setField("moderador", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Observador</label>
              <input className={inputClass} value={form.observador} onChange={e => setField("observador", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nº de Participantes</label>
              <input type="number" className={inputClass} value={form.numParticipantes} onChange={e => setField("numParticipantes", e.target.value)} min="1" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nº de Mulheres</label>
              <input type="number" className={inputClass} value={form.numMulheres} onChange={e => setField("numMulheres", e.target.value)} min="0" />
            </div>
          </div>

          {/* Participantes */}
          <div className="mt-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Perfil dos Participantes</p>
            <div className="space-y-2">
              {form.participantes.map((p, idx) => (
                <div key={idx} className="border rounded-xl p-3 bg-gray-50">
                  <p className="text-xs font-bold text-gray-400 mb-2">Participante {idx + 1}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputClass} value={p.nome} onChange={e => setParticipante(idx, "nome", e.target.value)} placeholder="Nome / pseudónimo" />
                    <input className={inputClass} value={p.idade} onChange={e => setParticipante(idx, "idade", e.target.value)} placeholder="Idade" type="number" min="1" max="120" />
                    <select className={inputClass} value={p.tipoDeficiencia} onChange={e => setParticipante(idx, "tipoDeficiencia", e.target.value)}>
                      <option value="">Tipo de deficiência...</option>
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
                    <select className={inputClass} value={p.genero} onChange={e => setParticipante(idx, "genero", e.target.value as Participante["genero"])}>
                      <option value="">Género...</option>
                      <option>Masculino</option>
                      <option>Feminino</option>
                      <option>Outro</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BLOCOS DE PERGUNTAS */}
        {BLOCOS.map(bloco => (
          <div key={bloco.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4" style={{ background: bloco.cor }}>
              <h2 className="text-white font-bold text-sm">{bloco.titulo}</h2>
            </div>
            <div className="p-5 space-y-5">
              {bloco.perguntas.map(p => (
                <div key={p.id}>
                  <div className="flex gap-3 mb-2">
                    <span className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: bloco.cor }}>{p.id}</span>
                    <p className="text-sm font-semibold text-gray-800 pt-1">{p.pergunta}</p>
                  </div>
                  <div className="ml-11">
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-2">
                      <p className="text-xs text-green-700">💡 {p.nota}</p>
                    </div>
                    <textarea
                      className={textareaClass}
                      value={getResposta(p.id)}
                      onChange={e => setResposta(p.id, e.target.value)}
                      placeholder="Escreva as respostas e observações aqui..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* SÍNTESE */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <SectionHeader icon="📊" title="Síntese da Sessão" subtitle="Preencher no final, após a sessão" />

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-600 mb-2">Top 3 Barreiras Mais Mencionadas</label>
            {[0,1,2].map(i => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "#1A6B3A" }}>{i+1}</span>
                <input className={inputClass} value={form.top3Barreiras[i]} onChange={e => {
                  const arr = [...form.top3Barreiras]; arr[i] = e.target.value; setField("top3Barreiras", arr);
                }} placeholder={`Barreira ${i+1}...`} />
              </div>
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-600 mb-1">Citação Mais Poderosa para Advocacy</label>
            <textarea className={textareaClass} value={form.citacaoPoderosa}
              onChange={e => setField("citacaoPoderosa", e.target.value)}
              placeholder='"Escreva aqui a citação mais impactante dita por um participante..."' />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-600 mb-2">Principais Soluções Propostas</label>
            {[0,1,2].map(i => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "#0D4424" }}>{i+1}</span>
                <input className={inputClass} value={form.solucoesProposta[i]} onChange={e => {
                  const arr = [...form.solucoesProposta]; arr[i] = e.target.value; setField("solucoesProposta", arr);
                }} placeholder={`Solução ${i+1}...`} />
              </div>
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-600 mb-2">Participantes dispostos a ser monitores comunitários?</label>
            <div className="flex gap-3">
              {[{ label: "Sim", val: true }, { label: "Não", val: false }].map(opt => (
                <label key={opt.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer text-sm transition-all ${form.monitoresComunitarios === opt.val ? "border-transparent text-white font-semibold" : "border-gray-300 text-gray-600"}`}
                  style={form.monitoresComunitarios === opt.val ? { background: "#1A6B3A" } : {}}>
                  <input type="radio" className="hidden" checked={form.monitoresComunitarios === opt.val} onChange={() => setField("monitoresComunitarios", opt.val)} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Observações Gerais da Sessão</label>
            <textarea className={textareaClass} value={form.observacoesGerais}
              onChange={e => setField("observacoesGerais", e.target.value)}
              placeholder="Dinâmica do grupo, pontos sensíveis, contexto local..." />
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>}

        <button type="submit" disabled={saving}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-all disabled:opacity-60"
          style={{ background: saving ? "#6b7280" : "linear-gradient(135deg, #0D4424, #1A6B3A)" }}>
          {saving ? "A guardar..." : "✅ Submeter Ficha B"}
        </button>
        <div className="h-8" />
      </form>
    </div>
  );
}
