export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      // Fase C1 (2026-07-26): as 6 colunas de score ideológico (score_geral,
      // score_direitos_civis, score_lib_imprensa, score_seg_publica,
      // score_economico, score_democracia) existem no banco mas foram
      // deliberadamente REMOVIDAS desta tipagem de cliente: são dados internos
      // suspensos, sem grant público após a migration 0003_contencao_scores.sql.
      // Não as reintroduza aqui — este tipo alimenta o client anon do bundle.
      //
      // Onda 1 (2026-08-17): `data_nascimento` (migration 0004) também fica de
      // fora por decisão explícita — é insumo interno do cálculo de
      // aposentadoria_comp e não recebeu grant público.
      stf_ministros: {
        Row: {
          id:                   string;
          nome:                 string;
          iniciais:             string;
          data_posse:           string;
          data_saida:           string | null;
          indicado_por:         string;      // nome do presidente
          partido_indicante:    string;
          cargo_anterior:       string | null;
          formacao:             string | null;
          aposentadoria_comp:   string | null;  // derivada de data_nascimento (trigger, migration 0004)
          ativo:                boolean;
          indicado_por_curto:   string | null;  // rótulo compacto — não fatiar indicado_por
          iniciais_exibicao:    string | null;  // `iniciais` é UNIQUE e pode ter sufixo (AM2)
          created_at:           string;
          updated_at:           string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_ministros"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["stf_ministros"]["Insert"]>;
      };
      stf_votacoes: {
        Row: {
          id:            string;
          ministro_id:   string;
          processo:      string;  // ex: "RE 635.659"
          classe:        string;
          data:          string;
          ementa:        string;
          voto:          "favor" | "contra" | "abstencao" | "ausente";
          resultado:     "procedente" | "improcedente" | "parcial" | null;
          tema_id:       string | null;
          created_at:    string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_votacoes"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["stf_votacoes"]["Insert"]>;
      };
      stf_processos_politicos: {
        Row: {
          id:            string;
          numero:        string;
          classe:        string;
          relator_id:    string;
          partes:        string[];
          assunto:       string;
          status:        "em_andamento" | "julgado" | "prescrito" | "suspenso";
          data_dist:     string;
          data_julg:     string | null;
          resultado:     string | null;
          created_at:    string;
          updated_at:    string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_processos_politicos"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["stf_processos_politicos"]["Insert"]>;
      };
      stf_repercussao_geral: {
        Row: {
          id:            string;
          tema:          number;  // número do tema RG
          titulo:        string;
          tese:          string | null;
          status:        "pendente" | "julgado" | "sobrestado";
          data_reconh:   string | null;
          data_julg:     string | null;
          processos_imp: number | null;  // estimativa de processos impactados
          relator_id:    string | null;
          created_at:    string;
          updated_at:    string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_repercussao_geral"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["stf_repercussao_geral"]["Insert"]>;
      };
      stf_gastos: {
        Row: {
          id:          string;
          ministro_id: string;
          ano:         number;
          mes:         number;
          categoria:   string;  // "diaria" | "passagem" | "hospedagem" | "outros"
          descricao:   string | null;
          valor:       number;
          created_at:  string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_gastos"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["stf_gastos"]["Insert"]>;
      };
      // Achado D1 (2026-08-18): decisões do STF, modelo bruto-primeiro.
      // Substitui stf_votacoes, que normalizava na escrita e perdia o original.
      // `sentido` existe mas fica NULO até haver taxonomia publicada — não
      // preencha a partir de andamento_bruto sem metodologia.
      stf_decisoes: {
        Row: {
          id:                  string;
          id_fato_decisao:     number;
          processo:            string;
          relator_bruto:       string;
          relator_atual_bruto: string | null;
          tipo_origem:         "MONOCRÁTICA" | "COLEGIADA";
          tipo_decisao:        string | null;
          andamento_bruto:     string;
          observacao:          string | null;
          data_decisao:        string;
          ano_decisao:         number;
          orgao_julgador:      string | null;
          origem_decisao:      string | null;
          ambiente_julgamento: string | null;
          meio_processo:       string | null;
          assunto:             string | null;
          data_autuacao:       string | null;
          data_baixa:          string | null;
          em_tramitacao:       boolean | null;
          orgao_origem:        string | null;
          procedencia:         string | null;
          ministro_id:         string | null;
          // COMO a atribuição foi feita. Ver o comentário em useDecisoes.ts:
          // somar 'nome' com 'presidencia' num número só distorce a ficha do
          // ministro presidente (Fachin, 2026: 35 contra 28.115).
          ministro_resolucao:  "nome" | "presidencia" | "nao_aplicavel" | "desconhecido" | null;
          sentido:             string | null;
          ingerido_em:         string;
          fonte:               string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_decisoes"]["Row"], "id" | "ingerido_em" | "fonte">;
        Update: Partial<Database["public"]["Tables"]["stf_decisoes"]["Insert"]>;
      };
      // Achado A6 (2026-08-17): períodos de presidência/vice do STF. Existe
      // para contextualizar o custo de gabinete do presidente, que não é
      // comparável ao dos demais. Períodos com início e fim, não flag — a
      // pergunta é "quem presidia no mês do gasto".
      stf_presidencias: {
        Row: {
          id:          string;
          ministro_id: string;
          cargo:       "presidente" | "vice_presidente";
          inicio:      string;
          fim:         string | null;   // null = em exercício
          fonte:       string | null;
          created_at:  string;
          updated_at:  string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_presidencias"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["stf_presidencias"]["Insert"]>;
      };
      // Fase C1 (2026-07-26): esta tabela NÃO existe no banco de produção
      // (confirmado por inspeção read-only). O script de ingestão
      // correspondente já foi deletado do working tree. A tipagem permanece
      // apenas enquanto a decisão formal sobre o eixo doadores/indicantes
      // está pendente — ver docs/decisao-doadores-indicantes.md. Não construa
      // nada novo sobre este tipo.
      stf_doadores_indicante: {
        Row: {
          id:               string;
          ministro_id:      string;
          presidente_cpf:   string;
          doador_cnpj:      string | null;
          doador_cpf:       string | null;
          doador_nome:      string;
          valor:            number;
          ano_eleicao:      number;
          fonte:            string;  // "tse"
          created_at:       string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_doadores_indicante"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["stf_doadores_indicante"]["Insert"]>;
      };
    };
    Views: {
      // Fase C1 (2026-07-26): a tipagem da view stf_v_ministros_scores foi
      // removida do cliente. A view continua existindo no banco (dados
      // preservados), mas expõe scores ideológicos suspensos — a migration
      // 0003_contencao_scores.sql revoga o acesso de anon/authenticated a ela.
      // A view pública substituta é stf_ministros_publicos (sem scores).
      stf_ministros_publicos: {
        Row: {
          id:                 string;
          nome:               string;
          iniciais:           string;
          data_posse:         string;
          data_saida:         string | null;
          indicado_por:       string;
          partido_indicante:  string;
          cargo_anterior:     string | null;
          formacao:           string | null;
          aposentadoria_comp: string | null;
          ativo:              boolean;
        };
      };
    };
  };
}
