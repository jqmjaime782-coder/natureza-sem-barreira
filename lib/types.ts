export type TipoPonto =
  | "Portão / Entrada Principal"
  | "Bilheteira / Posto de Informação"
  | "Lodge / Alojamento"
  | "Casa de Banho / Sanitários"
  | "Trilho / Percurso de Observação"
  | "Posto de Observação / Miradouro"
  | "Veículo de Transporte Interno"
  | "Área de Refeições / Restaurante"
  | "Loja / Espaço Comercial"
  | "Outro";

export type Escala = number;

export type NivelAcessibilidade =
  | "Inacessível"
  | "Parcialmente Acessível"
  | "Acessível com Apoio"
  | "Totalmente Acessível";

export interface RegistoFoto {
  numero: number;
  descricao: string;
  tipo: "Física" | "Comunicacional" | "Atitudinal" | "";
  recomendacao: string;
}

export interface FichaA {
  id?: string;
  criadoEm?: string;
  // Identificação
  numeroRegisto: string;
  data: string;
  pontoVisitado: string;
  horaInicio: string;
  horaFim: string;
  nomeAvaliador: string;
  tipoDeficienciaAvaliador: string;
  tiposPonto: TipoPonto[];
  outroTipoPonto: string;
  // Secção II – Físicas
  fisicaAcesso: Record<string, Escala | null>;
  fisicaSanitarios: Record<string, Escala | null>;
  fisicaTransporte: Record<string, Escala | null>;
  observacoesFisicas: string;
  // Secção III – Comunicacionais
  comunicacional: Record<string, Escala | null>;
  observacoesComunicacional: string;
  // Secção IV – Atitudinais
  atitudinal: Record<string, Escala | null>;
  incidentesAtitudinais: string;
  // Secção V – Fotos
  fotos: RegistoFoto[];
  // Secção VI – Global
  nivelAcessibilidade: NivelAcessibilidade | "";
  principalBarreira: string;
  recomendacaoPrioritaria: string;
  incluirRotaPiloto: "Sim, sem condições" | "Sim, com adaptações" | "Não" | "";
}

export interface Participante {
  nome: string;
  idade: string;
  tipoDeficiencia: string;
  genero: "Masculino" | "Feminino" | "Outro" | "";
}

export interface RespostaGrupoFocal {
  pergunta: string;
  bloco: string;
  resposta: string;
}

export interface FichaB {
  id?: string;
  criadoEm?: string;
  // Identificação
  numeroSessao: string;
  data: string;
  comunidade: string;
  hora: string;
  moderador: string;
  observador: string;
  numParticipantes: string;
  numMulheres: string;
  participantes: Participante[];
  // Respostas por bloco
  respostas: RespostaGrupoFocal[];
  // Síntese
  top3Barreiras: string[];
  citacaoPoderosa: string;
  solucoesProposta: string[];
  monitoresComunitarios: boolean | null;
  observacoesGerais: string;
}
