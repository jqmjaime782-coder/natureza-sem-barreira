"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SectionHeader from "@/components/SectionHeader";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

// ── Perguntas por bloco ────────────────────────────────────────────────────
const BLOCOS = [
  {
    id: "B1",
    titulo: "Bloco 1 — Perfil e Contexto de Vida",
    cor: "#1A6B3A",
    intro: "Conhecer a pessoa antes de falar sobre turismo. Cria confiança e contexto.",
    perguntas: [
      {
        id: "1.1",
        pergunta: "Pode apresentar-se — o seu nome, onde mora, e o que faz no dia a dia?",
        nota: "Deixe a pessoa falar livremente. Não interrompa.",
        tipo: "texto",
      },
      {
        id: "1.2",
        pergunta: "Há quanto tempo vive nesta comunidade? A sua família também é daqui?",
        nota: "Objetivo: perceber o enraizamento na comunidade e possíveis redes de apoio.",
        tipo: "texto",
      },
      {
        id: "1.3",
        pergunta: "Como é a sua mobilidade no dia a dia — consegue deslocar-se sozinho/a ou precisa de apoio?",
        nota: "Não force detalhes. Se a pessoa quiser partilhar, ótimo. Se não, avance.",
        tipo: "texto",
      },
    ],
  },
  {
    id: "B2",
    titulo: "Bloco 2 — Relação com o Parque Nacional da Gorongosa",
    cor: "#0D4424",
    intro: "Perceber se a pessoa conhece o PNG e qual é a sua relação com ele.",
    perguntas: [
      {
        id: "2.1",
        pergunta: "Já foi alguma vez ao Parque Nacional da Gorongosa?",
        nota: "Se sim: avance para 2.2. Se não: avance para 2.3.",
        tipo: "escolha",
        opcoes: ["Sim, já fui", "Não, nunca fui", "Tentei mas não consegui"],
      },
      {
        id: "2.2",
        pergunta: "Como foi essa visita? Conseguiu aceder a tudo o que queria ver ou fazer?",
        nota: "Só responde quem já foi. Explorar experiências positivas E negativas.",
        tipo: "texto",
        condicional: "Sim, já fui",
        perguntaCondicional: "2.1",
      },
      {
        id: "2.3",
        pergunta: "O que sabe sobre o parque? O que já ouviu dizer?",
        nota: "Avaliar o nível de conhecimento e as percepções existentes.",
        tipo: "texto",
      },
      {
        id: "2.4",
        pergunta: "Tem interesse em visitar o parque? Porquê sim ou porquê não?",
        nota: "Importante: não julgue a resposta. 'Não tenho interesse' é também uma informação valiosa — explore o porquê.",
        tipo: "texto",
      },
    ],
  },
  {
    id: "B3",
    titulo: "Bloco 3 — Barreiras Específicas",
    cor: "#1A6B3A",
    intro: "O coração da entrevista. Explorar em detalhe o que impede esta pessoa concretamente.",
    perguntas: [
      {
        id: "3.1",
        pergunta: "Se tentasse visitar o parque amanhã, quais seriam os primeiros obstáculos que encontraria?",
        nota: "Deixe a pessoa listar. Depois aprofunde cada obstáculo mencionado com 'pode explicar mais?'",
        tipo: "texto",
      },
      {
        id: "3.2",
        pergunta: "O transporte é um problema? Como chegaria ao parque?",
        nota: "Explorar: distância de casa, custo, tipo de transporte disponível, adequação para a sua deficiência.",
        tipo: "texto",
      },
      {
        id: "3.3",
        pergunta: "O dinheiro é um obstáculo? Quanto poderia gastar numa visita?",
        nota: "Pergunta sensível — aborde com delicadeza. A informação é importante para advocacia sobre preços acessíveis.",
        tipo: "texto",
      },
      {
        id: "3.4",
        pergunta: "Acha que o parque tem condições físicas para receber pessoas com a sua deficiência?",
        nota: "Explorar percepção sobre rampas, trilhos, sanitários, transporte interno.",
        tipo: "escala",
        escalaLabels: ["Nenhumas condições", "Muito poucas", "Algumas", "Boas condições", "Excelentes condições"],
      },
      {
        id: "3.5",
        pergunta: "Já sentiu que algum lugar ou actividade 'não era para si' por causa da sua deficiência? Pode dar um exemplo?",
        nota: "Objetivo: identificar experiências de exclusão vividas. Podem não ser do PNG — qualquer exemplo é útil.",
        tipo: "texto",
      },
      {
        id: "3.6",
        pergunta: "A sua família ou comunidade apoia a ideia de ir ao parque ou cria dificuldades?",
        nota: "Explorar barreiras sociais e atitudinais do entorno da pessoa.",
        tipo: "escolha",
        opcoes: ["Apoia totalmente", "Apoia com reservas", "É indiferente", "Dificulta ou desencoraja"],
      },
      {
        id: "3.6b",
        pergunta: "Pode explicar melhor essa situação com a família/comunidade?",
        nota: "Aprofundar a resposta anterior.",
        tipo: "texto",
      },
    ],
  },
  {
    id: "B4",
    titulo: "Bloco 4 — Informação e Direitos",
    cor: "#0D4424",
    intro: "Avaliar o nível de conhecimento sobre direitos e acesso à informação.",
    perguntas: [
      {
        id: "4.1",
        pergunta: "Alguma vez recebeu informação sobre actividades turísticas ou culturais na Gorongosa?",
        nota: "Explorar: como, em que formato, em que língua, por que canal.",
        tipo: "escolha",
        opcoes: ["Sim, recebi informação", "Raramente", "Nunca recebi"],
      },
      {
        id: "4.1b",
        pergunta: "Que tipo de informação foi e como chegou até si?",
        nota: "Explorar o canal e o formato — rádio, pessoa, cartaz, telemóvel.",
        tipo: "texto",
      },
      {
        id: "4.2",
        pergunta: "Sabia que tem o direito legal de participar em actividades culturais e de lazer, incluindo turismo?",
        nota: "Após a resposta, informe brevemente sobre o Artigo 30 da CDPD ratificada por Moçambique.",
        tipo: "escolha",
        opcoes: ["Sim, sabia", "Ouvi falar mas não sei os detalhes", "Não sabia"],
      },
      {
        id: "4.3",
        pergunta: "Já tentou exigir algum direito ou reclamar por não ter acesso a algo? O que aconteceu?",
        nota: "Identificar experiências de auto-advocacia. Se nunca tentou, perguntar porquê.",
        tipo: "texto",
      },
    ],
  },
  {
    id: "B5",
    titulo: "Bloco 5 — Visão e Mensagem",
    cor: "#1A6B3A",
    intro: "Terminar com a voz da pessoa — o que deseja e o que quer dizer às autoridades.",
    perguntas: [
      {
        id: "5.1",
        pergunta: "Se o parque fosse totalmente acessível para si, o que gostaria de fazer lá?",
        nota: "Deixe a pessoa sonhar. Não limite. Estas respostas são poderosas para o relatório.",
        tipo: "texto",
      },
      {
        id: "5.2",
        pergunta: "O que precisaria de mudar — no parque, no transporte, na comunidade — para poder visitar?",
        nota: "Síntese das soluções na perspectiva da própria pessoa.",
        tipo: "texto",
      },
      {
        id: "5.3",
        pergunta: "Se pudesse falar directamente com o Administrador do Distrito ou com a direcção do parque, o que diria?",
        nota: "REGISTE ESTA RESPOSTA COM CUIDADO — é a citação mais poderosa para a advocacy. Peça para repetir se necessário.",
        tipo: "texto",
        destaque: true,
      },
      {
        id: "5.4",
        pergunta: "Gostaria de continuar envolvido/a neste processo — por exemplo, testar a rota piloto ou participar em reuniões com as autoridades?",
        nota: "Identificar potenciais activistas e monitores comunitários.",
        tipo: "escolha",
        opcoes: ["Sim, com certeza", "Talvez, dependendo", "Não por agora"],
      },
    ],
  },
];

export default function FichaCPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Identificação
  const [numeroEntrevista, setNumeroEntrevista] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [comunidade, setComunidade] = useState("");
  const [hora, setHora] = useState("");
  const [entrevistador, setEntrevistador] = useState("");
  const [consentimento, setConsentimento] = useState(false);

  // Perfil do entrevistado
  const [nomeOuCodigoPseudo, setNomeOuCodigoPseudo] = useState("");
  const [idade, setIdade] = useState("");
  const [genero, setGenero] = useState("");
  const [tipoDeficiencia, setTipoDeficiencia] = useState("");
  const [tempoDeficiencia, setTempoDeficiencia] = useState("");
  const [nivelEducacao, setNivelEducacao] = useState("");
  const [situacaoEmprego, setSituacaoEmprego] = useState("");

  // Respostas
  const [respostas, setRespostas] = useState<Record<string, string>>({});

  // Síntese
  const [citacaoPrincipal, setCitacaoPrincipal] = useState("");
  const [barreiraPrincipal, setBarreiraPrincipal] = useState("");
  const [solucaoProposta, setSolucaoProposta] = useState("");
  const [disponivelRota, setDisponivelRota] = useState("");
  const [observacoesEntrevistador, setObservacoesEntrevistador] = useState("");

  function setResposta(id: string, val: string) {
    setRespostas(r => ({ ...r, [id]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consentimento) {
      setError("É necessário confirmar o consentimento do entrevistado antes de submeter.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addDoc(collection(db, "fichas_c"), {
        numeroEntrevista, data, comunidade, hora, entrevistador,
        nomeOuCodigoPseudo, idade, genero, tipoDeficiencia,
        tempoDeficiencia, nivelEducacao, situacaoEmprego,
        respostas,
        citacaoPrincipal, barreiraPrincipal, solucaoProposta,
        disponivelRota, observacoesEntrevistador,
        criadoEm: Timestamp.now(),
      });
      setSaved(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
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
          <h2 className="text-2xl font-bold text-green-700">Entrevista guardada!</h2>
          <p className="text-gray-500 mt-2">Os dados foram enviados para a coordenação.</p>
        </div>
      </div>
    );
  }

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white";
  const textareaClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white min-h-[90px] resize-y";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 shadow-sm" style={{ background: "#2d6a4f" }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-green-200 text-xs">ADEMO-Sofala · Natureza Sem Barreiras</p>
            <h1 className="text-white font-bold text-base">Ficha C — Entrevista Individual</h1>
          </div>
          <span className="text-2xl">🎤</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* CONSENTIMENTO */}
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
          <p className="text-sm font-bold text-amber-800 mb-2">⚠️ Consentimento Informado</p>
          <p className="text-sm text-amber-700 mb-3">
            Antes de iniciar, explique ao entrevistado: esta entrevista é voluntária, os dados são confidenciais e usados apenas para advocacia pela acessibilidade no PNG. Pode parar a qualquer momento.
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={consentimento} onChange={e => setConsentimento(e.target.checked)}
              className="w-5 h-5 rounded accent-green-600" />
            <span className="text-sm font-semibold text-amber-800">O entrevistado deu consentimento verbal para participar</span>
          </label>
        </div>

        {/* SECÇÃO I — IDENTIFICAÇÃO */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <SectionHeader icon="📋" title="Secção I — Identificação" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nº da Entrevista</label>
              <input className={inputClass} value={numeroEntrevista} onChange={e => setNumeroEntrevista(e.target.value)} placeholder="ex: NSB-C-001" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Data</label>
              <input type="date" className={inputClass} value={data} onChange={e => setData(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Comunidade</label>
              <input className={inputClass} value={comunidade} onChange={e => setComunidade(e.target.value)} placeholder="ex: Nhambita" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hora</label>
              <input type="time" className={inputClass} value={hora} onChange={e => setHora(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Entrevistador</label>
              <input className={inputClass} value={entrevistador} onChange={e => setEntrevistador(e.target.value)} />
            </div>
          </div>
        </div>

        {/* SECÇÃO II — PERFIL */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <SectionHeader icon="👤" title="Secção II — Perfil do Entrevistado" subtitle="Use um código ou pseudónimo para proteger a identidade" />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nome / Código / Pseudónimo</label>
              <input className={inputClass} value={nomeOuCodigoPseudo} onChange={e => setNomeOuCodigoPseudo(e.target.value)} placeholder="ex: Participante C-001 ou nome próprio" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Idade</label>
              <input type="number" className={inputClass} value={idade} onChange={e => setIdade(e.target.value)} min="1" max="120" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Género</label>
              <select className={inputClass} value={genero} onChange={e => setGenero(e.target.value)}>
                <option value="">Selecionar...</option>
                <option>Masculino</option>
                <option>Feminino</option>
                <option>Outro</option>
                <option>Prefere não dizer</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Deficiência</label>
              <input className={inputClass} value={tipoDeficiencia} onChange={e => setTipoDeficiencia(e.target.value)} placeholder="ex: Motora, Visual, Auditiva, Intelectual, Múltipla..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Desde quando tem esta deficiência?</label>
              <select className={inputClass} value={tempoDeficiencia} onChange={e => setTempoDeficiencia(e.target.value)}>
                <option value="">Selecionar...</option>
                <option>Desde o nascimento</option>
                <option>Desde a infância</option>
                <option>Na idade adulta</option>
                <option>Prefere não dizer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nível de Educação</label>
              <select className={inputClass} value={nivelEducacao} onChange={e => setNivelEducacao(e.target.value)}>
                <option value="">Selecionar...</option>
                <option>Sem escolaridade</option>
                <option>Ensino primário</option>
                <option>Ensino secundário</option>
                <option>Ensino técnico</option>
                <option>Ensino superior</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Situação de Emprego</label>
              <select className={inputClass} value={situacaoEmprego} onChange={e => setSituacaoEmprego(e.target.value)}>
                <option value="">Selecionar...</option>
                <option>Empregado/a (formal)</option>
                <option>Trabalho informal / agricultura</option>
                <option>Desempregado/a</option>
                <option>Estudante</option>
                <option>Reformado/a</option>
                <option>Dependente de família</option>
              </select>
            </div>
          </div>
        </div>

        {/* BLOCOS DE PERGUNTAS */}
        {BLOCOS.map(bloco => (
          <div key={bloco.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4" style={{ background: bloco.cor }}>
              <h2 className="text-white font-bold text-sm">{bloco.titulo}</h2>
              <p className="text-green-200 text-xs mt-1">{bloco.intro}</p>
            </div>
            <div className="p-5 space-y-6">
              {bloco.perguntas.map(p => (
                <div key={p.id}>
                  <div className="flex gap-3 mb-2">
                    <span className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: bloco.cor }}>{p.id}</span>
                    <p className={`text-sm font-semibold pt-1 ${(p as any).destaque ? "text-green-800" : "text-gray-800"}`}>
                      {(p as any).destaque && "⭐ "}{p.pergunta}
                    </p>
                  </div>

                  <div className="ml-11">
                    {/* Nota para entrevistador */}
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                      <p className="text-xs text-green-700">💡 {p.nota}</p>
                    </div>

                    {/* Campo de resposta */}
                    {p.tipo === "texto" && (
                      <textarea
                        className={`${textareaClass} ${(p as any).destaque ? "border-green-400 bg-green-50" : ""}`}
                        value={respostas[p.id] ?? ""}
                        onChange={e => setResposta(p.id, e.target.value)}
                        placeholder="Registe a resposta aqui..."
                      />
                    )}

                    {p.tipo === "escolha" && (p as any).opcoes && (
                      <div className="space-y-2">
                        {(p as any).opcoes.map((op: string) => (
                          <label key={op} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-sm transition-all ${respostas[p.id] === op ? "border-transparent text-white font-semibold" : "border-gray-200 text-gray-700 bg-gray-50"}`}
                            style={respostas[p.id] === op ? { background: bloco.cor } : {}}>
                            <input type="radio" className="hidden" name={`r-${p.id}`} value={op}
                              checked={respostas[p.id] === op} onChange={() => setResposta(p.id, op)} />
                            <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${respostas[p.id] === op ? "border-white bg-white" : "border-gray-400"}`} />
                            {op}
                          </label>
                        ))}
                        <textarea
                          className={textareaClass}
                          value={respostas[`${p.id}_obs`] ?? ""}
                          onChange={e => setResposta(`${p.id}_obs`, e.target.value)}
                          placeholder="Observações / explicação adicional..."
                        />
                      </div>
                    )}

                    {p.tipo === "escala" && (p as any).escalaLabels && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-2">
                          {(p as any).escalaLabels.map((label: string, idx: number) => (
                            <label key={idx} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-sm transition-all ${respostas[p.id] === String(idx + 1) ? "border-transparent text-white font-semibold" : "border-gray-200 text-gray-700"}`}
                              style={respostas[p.id] === String(idx + 1) ? { background: ["#dc2626","#f97316","#eab308","#22c55e","#16a34a"][idx] } : {}}>
                              <input type="radio" className="hidden" name={`r-${p.id}`} value={String(idx + 1)}
                                checked={respostas[p.id] === String(idx + 1)} onChange={() => setResposta(p.id, String(idx + 1))} />
                              <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={respostas[p.id] === String(idx + 1) ? { borderColor: "white", color: "white" } : { borderColor: "#9ca3af", color: "#9ca3af" }}>
                                {idx + 1}
                              </span>
                              {label}
                            </label>
                          ))}
                        </div>
                        <textarea
                          className={textareaClass}
                          value={respostas[`${p.id}_obs`] ?? ""}
                          onChange={e => setResposta(`${p.id}_obs`, e.target.value)}
                          placeholder="Observações adicionais..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* SÍNTESE */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <SectionHeader icon="📊" title="Síntese da Entrevista" subtitle="Preencher imediatamente após a entrevista" />

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                ⭐ Citação Principal para Advocacy
              </label>
              <p className="text-xs text-gray-400 mb-2">A frase mais poderosa dita pelo entrevistado — use as palavras exactas</p>
              <textarea className="w-full border-2 border-green-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50 min-h-[80px] resize-y"
                value={citacaoPrincipal} onChange={e => setCitacaoPrincipal(e.target.value)}
                placeholder='"Escreva aqui a citação mais impactante..."' />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Principal Barreira Identificada</label>
              <input className={inputClass} value={barreiraPrincipal} onChange={e => setBarreiraPrincipal(e.target.value)}
                placeholder="A barreira mais relevante desta entrevista..." />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Solução Proposta pelo Entrevistado</label>
              <input className={inputClass} value={solucaoProposta} onChange={e => setSolucaoProposta(e.target.value)}
                placeholder="O que o entrevistado sugeriu como solução..." />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Disponível para participar na rota piloto?</label>
              <div className="flex gap-2 flex-wrap">
                {["Sim, com certeza", "Talvez", "Não por agora"].map(op => (
                  <label key={op} className={`px-4 py-2 rounded-xl border cursor-pointer text-sm transition-all ${disponivelRota === op ? "text-white border-transparent" : "border-gray-300 text-gray-600"}`}
                    style={disponivelRota === op ? { background: "#1A6B3A" } : {}}>
                    <input type="radio" className="hidden" name="rota" value={op}
                      checked={disponivelRota === op} onChange={() => setDisponivelRota(op)} />
                    {op}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Observações do Entrevistador</label>
              <textarea className={textareaClass} value={observacoesEntrevistador}
                onChange={e => setObservacoesEntrevistador(e.target.value)}
                placeholder="Contexto da entrevista, linguagem corporal, pontos sensíveis, ambiente..." />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-all disabled:opacity-60"
          style={{ background: saving ? "#6b7280" : "linear-gradient(135deg, #0D4424, #2d6a4f)" }}>
          {saving ? "A guardar..." : "✅ Submeter Entrevista"}
        </button>
        <div className="h-8" />
      </form>
    </div>
  );
}
