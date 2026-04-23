export type TribunalId = string

export interface TribunalConfig {
  id: TribunalId
  nome: string
  nomeCompleto: string
  cor: string
  corLight: string
  path: string
  categoria: 'superior' | 'federal' | 'estadual' | 'trabalho' | 'outro'
}

export const TRIBUNAIS: Record<string, TribunalConfig> = {
  // Tribunais Superiores
  STF: { id: 'STF', nome: 'STF', nomeCompleto: 'Supremo Tribunal Federal', cor: '#881337', corLight: '#FFF1F2', path: '/stf', categoria: 'superior' },
  STJ: { id: 'STJ', nome: 'STJ', nomeCompleto: 'Superior Tribunal de Justiça', cor: '#1e3a5f', corLight: '#EFF6FF', path: '/stj', categoria: 'superior' },
  TST: { id: 'TST', nome: 'TST', nomeCompleto: 'Tribunal Superior do Trabalho', cor: '#0f766e', corLight: '#F0FDFA', path: '/tst', categoria: 'superior' },
  TCU: { id: 'TCU', nome: 'TCU', nomeCompleto: 'Tribunal de Contas da União', cor: '#92400e', corLight: '#FFFBEB', path: '/tcu', categoria: 'superior' },

  // Justiça Federal
  TRF1: { id: 'TRF1', nome: 'TRF1', nomeCompleto: 'Tribunal Regional Federal da 1ª Região', cor: '#1d4ed8', corLight: '#EFF6FF', path: '/trf1', categoria: 'federal' },
  TRF2: { id: 'TRF2', nome: 'TRF2', nomeCompleto: 'Tribunal Regional Federal da 2ª Região', cor: '#1d4ed8', corLight: '#EFF6FF', path: '/trf2', categoria: 'federal' },
  TRF3: { id: 'TRF3', nome: 'TRF3', nomeCompleto: 'Tribunal Regional Federal da 3ª Região', cor: '#1d4ed8', corLight: '#EFF6FF', path: '/trf3', categoria: 'federal' },
  TRF4: { id: 'TRF4', nome: 'TRF4', nomeCompleto: 'Tribunal Regional Federal da 4ª Região', cor: '#1d4ed8', corLight: '#EFF6FF', path: '/trf4', categoria: 'federal' },
  TRF5: { id: 'TRF5', nome: 'TRF5', nomeCompleto: 'Tribunal Regional Federal da 5ª Região', cor: '#1d4ed8', corLight: '#EFF6FF', path: '/trf5', categoria: 'federal' },
  TRF6: { id: 'TRF6', nome: 'TRF6', nomeCompleto: 'Tribunal Regional Federal da 6ª Região', cor: '#1d4ed8', corLight: '#EFF6FF', path: '/trf6', categoria: 'federal' },

  // Justiça Estadual
  TJSP: { id: 'TJSP', nome: 'TJSP', nomeCompleto: 'Tribunal de Justiça de São Paulo', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjsp', categoria: 'estadual' },
  TJRJ: { id: 'TJRJ', nome: 'TJRJ', nomeCompleto: 'Tribunal de Justiça do Rio de Janeiro', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjrj', categoria: 'estadual' },
  TJMG: { id: 'TJMG', nome: 'TJMG', nomeCompleto: 'Tribunal de Justiça de Minas Gerais', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjmg', categoria: 'estadual' },
  TJRS: { id: 'TJRS', nome: 'TJRS', nomeCompleto: 'Tribunal de Justiça do Rio Grande do Sul', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjrs', categoria: 'estadual' },
  TJPR: { id: 'TJPR', nome: 'TJPR', nomeCompleto: 'Tribunal de Justiça do Paraná', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjpr', categoria: 'estadual' },
  TJSC: { id: 'TJSC', nome: 'TJSC', nomeCompleto: 'Tribunal de Justiça de Santa Catarina', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjsc', categoria: 'estadual' },
  TJBA: { id: 'TJBA', nome: 'TJBA', nomeCompleto: 'Tribunal de Justiça da Bahia', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjba', categoria: 'estadual' },
  TJPE: { id: 'TJPE', nome: 'TJPE', nomeCompleto: 'Tribunal de Justiça de Pernambuco', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjpe', categoria: 'estadual' },
  TJCE: { id: 'TJCE', nome: 'TJCE', nomeCompleto: 'Tribunal de Justiça do Ceará', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjce', categoria: 'estadual' },
  TJGO: { id: 'TJGO', nome: 'TJGO', nomeCompleto: 'Tribunal de Justiça de Goiás', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjgo', categoria: 'estadual' },
  TJDFT: { id: 'TJDFT', nome: 'TJDFT', nomeCompleto: 'Tribunal de Justiça do Distrito Federal e Territórios', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjdft', categoria: 'estadual' },
  TJES: { id: 'TJES', nome: 'TJES', nomeCompleto: 'Tribunal de Justiça do Espírito Santo', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjes', categoria: 'estadual' },
  TJAC: { id: 'TJAC', nome: 'TJAC', nomeCompleto: 'Tribunal de Justiça do Acre', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjac', categoria: 'estadual' },
  TJAL: { id: 'TJAL', nome: 'TJAL', nomeCompleto: 'Tribunal de Justiça de Alagoas', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjal', categoria: 'estadual' },
  TJAM: { id: 'TJAM', nome: 'TJAM', nomeCompleto: 'Tribunal de Justiça do Amazonas', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjam', categoria: 'estadual' },
  TJAP: { id: 'TJAP', nome: 'TJAP', nomeCompleto: 'Tribunal de Justiça do Amapá', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjap', categoria: 'estadual' },
  TJMA: { id: 'TJMA', nome: 'TJMA', nomeCompleto: 'Tribunal de Justiça do Maranhão', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjma', categoria: 'estadual' },
  TJMS: { id: 'TJMS', nome: 'TJMS', nomeCompleto: 'Tribunal de Justiça de Mato Grosso do Sul', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjms', categoria: 'estadual' },
  TJMT: { id: 'TJMT', nome: 'TJMT', nomeCompleto: 'Tribunal de Justiça de Mato Grosso', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjmt', categoria: 'estadual' },
  TJPA: { id: 'TJPA', nome: 'TJPA', nomeCompleto: 'Tribunal de Justiça do Pará', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjpa', categoria: 'estadual' },
  TJPB: { id: 'TJPB', nome: 'TJPB', nomeCompleto: 'Tribunal de Justiça da Paraíba', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjpb', categoria: 'estadual' },
  TJPI: { id: 'TJPI', nome: 'TJPI', nomeCompleto: 'Tribunal de Justiça do Piauí', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjpi', categoria: 'estadual' },
  TJRN: { id: 'TJRN', nome: 'TJRN', nomeCompleto: 'Tribunal de Justiça do Rio Grande do Norte', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjrn', categoria: 'estadual' },
  TJRO: { id: 'TJRO', nome: 'TJRO', nomeCompleto: 'Tribunal de Justiça de Rondônia', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjro', categoria: 'estadual' },
  TJRR: { id: 'TJRR', nome: 'TJRR', nomeCompleto: 'Tribunal de Justiça de Roraima', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjrr', categoria: 'estadual' },
  TJSE: { id: 'TJSE', nome: 'TJSE', nomeCompleto: 'Tribunal de Justiça de Sergipe', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjse', categoria: 'estadual' },
  TJTO: { id: 'TJTO', nome: 'TJTO', nomeCompleto: 'Tribunal de Justiça do Tocantins', cor: '#6d28d9', corLight: '#F5F3FF', path: '/tjto', categoria: 'estadual' },
}

export const TRIBUNAL_LIST = Object.values(TRIBUNAIS)
export const TRIBUNAIS_SUPERIORES = TRIBUNAL_LIST.filter((t) => t.categoria === 'superior')
export const TRIBUNAIS_FEDERAIS = TRIBUNAL_LIST.filter((t) => t.categoria === 'federal')
export const TRIBUNAIS_ESTADUAIS = TRIBUNAL_LIST.filter((t) => t.categoria === 'estadual')

export function getTribunal(id: string): TribunalConfig | undefined {
  return TRIBUNAIS[id] || TRIBUNAL_LIST.find((t) => t.path === `/${id.toLowerCase()}`)
}
