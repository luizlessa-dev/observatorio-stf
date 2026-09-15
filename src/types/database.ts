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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
          leading_case:  string | null;  // migration 0002 — processo paradigma do tema
          destaque:      boolean;        // migration 0002 — flag editorial, default false
          incidente_id:  string | null;  // migration 0002
          created_at:    string;
          updated_at:    string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_repercussao_geral"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["stf_repercussao_geral"]["Insert"]>;
        Relationships: [];
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
          // migration 0002 — 5 colunas presentes em produção, ausentes na 0001
          fonte:       string | null;
          data_inicio: string | null;
          data_fim:    string | null;
          destino:     string | null;
          num_diarias: number | null;
          created_at:  string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_gastos"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["stf_gastos"]["Insert"]>;
        Relationships: [];
      };
      // Migration 0021 (2026-09): detalhamento por servidor do custo de
      // gabinete — mesma fonte de stf_gastos.custo_gabinete, mas sem
      // agregar. Nome e remuneração são dado de servidor público, já
      // publicado sob nome real pelo próprio STF (LAI) — ver comentário na
      // migration.
      stf_gastos_servidores: {
        Row: {
          id:                  string;
          ministro_id:         string;
          ano:                 number;
          mes:                 number;
          matricula:           string;
          nome:                string;
          cargo_efetivo:       string | null;
          cargo_comissionado:  string | null;
          funcao:              string | null;
          situacao_funcional:  string | null;
          remuneracao_bruta:   number;
          remuneracao_liquida: number | null;
          fonte:               string;
          created_at:          string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_gastos_servidores"]["Row"], "id" | "created_at" | "fonte"> & { fonte?: string };
        Update: Partial<Database["public"]["Tables"]["stf_gastos_servidores"]["Insert"]>;
        Relationships: [];
      };
      // Migration 0022 (2026-09): passagens aéreas e diárias do gabinete de
      // cada ministro. Fonte: painéis Qlik de transparencia.stf.jus.br, sem
      // URL estática de export — ingestão via Playwright (ver
      // ingestao/stf/fetch_passagens_diarias.py).
      stf_passagens: {
        Row: {
          id:               string;
          ministro_id:      string;
          passagem_id:      string;
          nome:             string | null;
          cargo:            string | null;
          lotacao:          string | null;
          motivo:           string | null;
          ano:              number;
          mes:              number | null;
          data_ida:         string | null;
          data_volta:       string | null;
          tipo_passagem:    string | null;
          trecho:           string | null;
          valor_bilhete:    number | null;
          valor_reembolso:  number | null;
          custo_efetivo:    number | null;
          fonte:            string;
          created_at:       string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_passagens"]["Row"], "id" | "created_at" | "fonte"> & { fonte?: string };
        Update: Partial<Database["public"]["Tables"]["stf_passagens"]["Insert"]>;
        Relationships: [];
      };
      stf_diarias: {
        Row: {
          id:          string;
          ministro_id: string;
          diaria_id:   string;
          nome:        string | null;
          cargo:       string | null;
          lotacao:     string | null;
          tipo_diaria: string | null;
          motivo:      string | null;
          moeda:       string | null;
          quantidade:  number | null;
          valor_total: number | null;
          ano:         number;
          mes:         number | null;
          fonte:       string;
          created_at:  string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_diarias"]["Row"], "id" | "created_at" | "fonte"> & { fonte?: string };
        Update: Partial<Database["public"]["Tables"]["stf_diarias"]["Insert"]>;
        Relationships: [];
      };
      // Migration 0023 (2026-09): ações de controle concentrado (ADI/ADC/
      // ADPF/ADO), painel Corte Aberta. Bruto-primeiro como stf_decisoes —
      // ministro_id é a única resolução própria, e fica auditável (null se
      // o relator não bater com nenhum ministro cadastrado).
      stf_controle_concentrado: {
        Row: {
          id:                                           string;
          processo:                                     string;
          link_processo:                                string | null;
          ministro_id:                                  string | null;
          relator_atual_bruto:                          string | null;
          ramo_direito:                                 string | null;
          assunto:                                      string | null;
          meio_processo:                                string | null;
          data_autuacao:                                string | null;
          data_transito_julgado:                        string | null;
          data_baixa:                                   string | null;
          em_tramitacao:                                boolean | null;
          situacao_processual:                          string | null;
          tem_decisao_liminar:                          boolean | null;
          tem_decisao_final:                            boolean | null;
          tem_rito_art12:                                boolean | null;
          legislacao:                                   string | null;
          preferencia_ods:                              string | null;
          data_publicacao_pauta:                        string | null;
          data_publicacao_pauta_primeira:                string | null;
          data_publicacao_pauta_ultima:                  string | null;
          conta_publicacao_pauta:                        number | null;
          data_publicacao_decisao_colegiada:             string | null;
          data_publicacao_decisao_colegiada_primeira:    string | null;
          data_publicacao_decisao_colegiada_ultima:      string | null;
          conta_publicacao_decisao_colegiada:            number | null;
          data_decisao_final:                            string | null;
          data_decisao_final_primeira:                   string | null;
          data_decisao_final_ultima:                     string | null;
          conta_decisao_final:                           number | null;
          data_publicacao_decisao_monocratica:           string | null;
          data_publicacao_decisao_monocratica_primeira:  string | null;
          data_publicacao_decisao_monocratica_ultima:    string | null;
          conta_publicacao_decisao_monocratica:          number | null;
          fonte:                                         string;
          created_at:                                    string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_controle_concentrado"]["Row"], "id" | "created_at" | "fonte"> & { fonte?: string };
        Update: Partial<Database["public"]["Tables"]["stf_controle_concentrado"]["Insert"]>;
        Relationships: [];
      };
      // Migration 0024 (2026-09): reclamações constitucionais, mesma
      // família de painéis Corte Aberta e mesma lógica de resolução de
      // ministro_id que stf_controle_concentrado.
      stf_reclamacoes: {
        Row: {
          id:                     string;
          processo:               string;
          numero_unico:           string | null;
          num_processos_origens:  string | null;
          data_autuacao:          string | null;
          ministro_id:            string | null;
          relator_atual_bruto:    string | null;
          procedencia:            string | null;
          preferencia_criminal:   boolean | null;
          ramo_direito:           string | null;
          em_tramitacao:          boolean | null;
          liminar_pendente:       boolean | null;
          fonte:                  string;
          created_at:             string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_reclamacoes"]["Row"], "id" | "created_at" | "fonte"> & { fonte?: string };
        Update: Partial<Database["public"]["Tables"]["stf_reclamacoes"]["Insert"]>;
        Relationships: [];
      };
      // Migration 0025 (2026-09): pauta do Plenário e das Turmas — única
      // fonte prospectiva do site (processos liberados para julgamento,
      // ainda não decididos). Duas tabelas porque as colunas disponíveis
      // diferem entre os dois painéis de origem.
      stf_pauta_plenario: {
        Row: {
          id:                    string;
          classe:                string | null;
          numero:                number | null;
          ministro_id:           string | null;
          relator_atual_bruto:   string | null;
          data_autuacao:         string | null;
          ramo_direito:          string | null;
          criminal:              boolean | null;
          sessao:                string | null;
          rg_reconhecida:        boolean | null;
          pedido_vista:          boolean | null;
          ministro_vista_id:     string | null;
          ministro_vista_bruto:  string | null;
          data_vista:            string | null;
          suspenso:              boolean | null;
          data_pauta:            string | null;
          fonte:                 string;
          created_at:            string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_pauta_plenario"]["Row"], "id" | "created_at" | "fonte"> & { fonte?: string };
        Update: Partial<Database["public"]["Tables"]["stf_pauta_plenario"]["Insert"]>;
        Relationships: [];
      };
      stf_pauta_turmas: {
        Row: {
          id:                    string;
          classe:                string | null;
          numero:                number | null;
          orgao_julgador:        string | null;
          ministro_id:           string | null;
          relator_atual_bruto:   string | null;
          data_autuacao:         string | null;
          ramo_direito:          string | null;
          sessao:                string | null;
          pedido_vista:          boolean | null;
          ministro_vista_id:     string | null;
          ministro_vista_bruto:  string | null;
          data_vista:            string | null;
          suspenso:              boolean | null;
          data_pauta:            string | null;
          fonte:                 string;
          created_at:            string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_pauta_turmas"]["Row"], "id" | "created_at" | "fonte"> & { fonte?: string };
        Update: Partial<Database["public"]["Tables"]["stf_pauta_turmas"]["Insert"]>;
        Relationships: [];
      };
      // Migration 0026 (2026-09): casos de omissão inconstitucional —
      // lista curada (171 julgados), não um recorte de milhares como os
      // outros painéis Corte Aberta. tipo_omissao/ramo_direito já vêm
      // limpos do encoding multivalorado do Qlik na ingestão.
      stf_omissao_inconstitucional: {
        Row: {
          id:                    string;
          materia:               string | null;
          processo:              string;
          ministro_id:           string | null;
          relator_bruto:         string | null;
          redator_acordao_bruto: string | null;
          tipo_classe:           string | null;
          classe_processo:       string | null;
          incidente:             string | null;
          numero_processo:       number | null;
          data_julgamento:       string | null;
          ementa:                string | null;
          orgao_julgador:        string | null;
          tipo_omissao:          string | null;
          ramo_direito:          string | null;
          link_processo:         string | null;
          link_inteiro_teor:     string | null;
          link_jurisprudencia:   string | null;
          fonte:                 string;
          created_at:            string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_omissao_inconstitucional"]["Row"], "id" | "created_at" | "fonte"> & { fonte?: string };
        Update: Partial<Database["public"]["Tables"]["stf_omissao_inconstitucional"]["Insert"]>;
        Relationships: [];
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
        Relationships: [];
      };
      // Migration 0012 (2026-09-06): cache dos números do resumo (home,
      // JSON-LD, /metodologia). Uma linha só (id=1), recalculada pelo
      // pipeline de ingestão — o build só lê por chave primária. Ver o
      // comentário longo em carregarResumo() (src/lib/dados.ts).
      stf_estatisticas: {
        Row: {
          id:             number;
          total_decisoes: number;
          total_temas_rg: number;
          sem_ministro:   number;
          dados_ate:      string | null;
          atualizado_em:  string;
        };
        Insert: Database["public"]["Tables"]["stf_estatisticas"]["Row"];
        Update: Partial<Database["public"]["Tables"]["stf_estatisticas"]["Insert"]>;
        Relationships: [];
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
        Relationships: [];
      };
      // Removida em 2026-09 — decisão final da nota de 2026-07-26
      // (docs/decisao-doadores-indicantes.md): tabela nunca existiu em
      // produção, script de ingestão já deletado, e o desenho (doador →
      // presidente → ministro por adjacência de chave) foi rejeitado por
      // risco de inferência causal indevida e exposição de terceiros. Ver
      // supabase/migrations/0020_remove_stf_doadores_indicante_schema.sql.
      // Se o tema voltar, é como apuração editorial caso a caso em /casos —
      // nunca como tabela relacional. Não recriar este tipo.
      // Criada fora do sistema de migrations (antes da migration 0001), por
      // isso não tem `create table` rastreável no histórico. Colunas abaixo
      // conferidas contra o uso real em api/webhook.ts e src/lib/auth.ts —
      // não existe outra fonte de verdade para o schema desta tabela.
      stf_assinaturas: {
        Row: {
          id:                  string;
          email:               string;
          user_id:             string | null;
          stripe_customer_id:  string;
          stripe_sub_id:       string;
          plano:               "mensal" | "anual";
          status:              "ativa" | "cancelada" | "pausada";
          vigente_ate:         string | null;
          created_at:          string;
          updated_at:          string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_assinaturas"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["stf_assinaturas"]["Insert"]>;
        Relationships: [];
      };
      // Migration 0016 (2026-09-10): dicionário andamento_bruto -> natureza do
      // ato, classificado por regra (sem LLM, sem eixo ideológico). Substitui
      // a tentativa de reconstruir o "termômetro" via classificação por IA
      // (0014, revertida em 0015 — custo de API descartado pelo usuário).
      stf_natureza_ato_mapa: {
        Row: {
          andamento_bruto: string;
          natureza_ato:    "merito" | "admissibilidade" | "cautelar" | "processual" | "devolucao";
          sentido_merito:  "favoravel" | "contrario" | "parcial" | null;
          notas:           string | null;
          criado_em:       string;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_natureza_ato_mapa"]["Row"], "criado_em">;
        Update: Partial<Database["public"]["Tables"]["stf_natureza_ato_mapa"]["Insert"]>;
        Relationships: [];
      };
      // AUD-11 (2026-09-15): histórico público de quando cada fonte foi
      // ingerida pela última vez, com contagem de linhas e hash do
      // conteúdo — não substitui uma auditoria completa de proveniência
      // (isso pede modelo de dados/pipeline bem maiores), mas dá um
      // changelog verificável que não existia antes. Escrita só via
      // service_role (ingestao/stf/_snapshot.py); leitura pública. Ver
      // /metodologia#historico-de-dados.
      stf_snapshots: {
        Row: {
          id:        number;
          tabela:    string;
          linhas:    number;
          hash:      string;
          fonte:     string | null;
          criado_em: string;
          metadata:  Json | null;
        };
        Insert: Omit<Database["public"]["Tables"]["stf_snapshots"]["Row"], "id" | "criado_em">;
        Update: Partial<Database["public"]["Tables"]["stf_snapshots"]["Insert"]>;
        Relationships: [];
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
        Relationships: [];
      };
      // Migration 0017 (2026-09-10): perfil decisório por ministro — natureza
      // do ato e, dentro de mérito, taxa de favorável/contrário/parcial. Sem
      // eixo ideológico. Ver src/lib/dados.ts::carregarPerfilDecisorio e
      // /metodologia#perfil-decisorio. Percentuais são `number | null` —
      // null quando o denominador é zero, nunca um valor fabricado.
      stf_ministros_perfil_decisorio: {
        Row: {
          ministro_id:           string;
          total_decisoes:        number;
          total_classificadas:   number;
          pct_classificadas:     number | null;
          n_merito:               number;
          n_admissibilidade:      number;
          n_cautelar:             number;
          n_processual:           number;
          n_devolucao:            number;
          pct_merito:             number | null;
          pct_admissibilidade:    number | null;
          pct_cautelar:           number | null;
          pct_processual:         number | null;
          pct_devolucao:          number | null;
          n_merito_com_sentido:   number;
          n_favoravel:            number;
          n_contrario:            number;
          n_parcial:              number;
          pct_favoravel:          number | null;
          pct_contrario:          number | null;
          pct_parcial:            number | null;
          tempo_medio_dias:       number | null;
        };
        Relationships: [];
      };
      stf_ministros_mix_atuacao: {
        Row: {
          ministro_id:      string;
          total_nome:       number;
          n_monocratica:    number;
          n_colegiada:      number;
          pct_monocratica:  number | null;
          pct_colegiada:    number | null;
        };
        Relationships: [];
      };
      // AUD-13 (2026-09-15): expõe to_tsvector(assunto+andamento_bruto+
      // processo) como coluna `busca_texto` — é só através de uma view
      // (ou coluna real) que o PostgREST aceita `.textSearch()`, já que ele
      // não filtra em expressões arbitrárias. O índice GIN funcional
      // correspondente vive em stf_decisoes (stf_decisoes_busca_texto_idx);
      // o Postgres expande a view e usa esse índice normalmente — conferido
      // via EXPLAIN antes de escrever esta tipagem. Ver
      // src/hooks/useBuscaTextoDecisoes.ts.
      stf_decisoes_busca: {
        Row: {
          id:              string;
          processo:        string;
          assunto:         string | null;
          andamento_bruto: string;
          relator_bruto:   string;
          tipo_origem:     "MONOCRÁTICA" | "COLEGIADA";
          data_decisao:    string;
          ano_decisao:     number;
          orgao_julgador:  string | null;
          ministro_id:     string | null;
          sentido:         string | null;
          busca_texto:     unknown; // tsvector — nunca lido diretamente, só usado como alvo de .textSearch()
        };
        Relationships: [];
      };
    };
    // `GenericSchema` do postgrest-js exige Tables, Views E Functions — sem
    // esta chave o schema não bate na constraint e o client cai pra `never`
    // silenciosamente, e todo `.select()` some dentro de "Property does not
    // exist on type 'never'" em vez de checar as colunas de verdade.
    Functions: {
      stf_resolver_user_id: {
        Args: { p_email: string };
        Returns: string | null;
      };
    };
  };
}
