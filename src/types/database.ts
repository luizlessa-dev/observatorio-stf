export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
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
          aposentadoria_comp:   string | null;
          ativo:                boolean;
          score_geral:          number | null;
          score_direitos_civis: number | null;
          score_lib_imprensa:   number | null;
          score_seg_publica:    number | null;
          score_economico:      number | null;
          score_democracia:     number | null;
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
      stf_v_ministros_scores: {
        Row: {
          id:           string;
          nome:         string;
          iniciais:     string;
          indicado_por: string;
          ativo:        boolean;
          score_geral:  number;
          total_votos:  number;
          votos_favor:  number;
          votos_contra: number;
        };
      };
    };
  };
}
