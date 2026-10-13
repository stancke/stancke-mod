export type Theme = 'claro' | 'escuro'
export type Janela = { kind: string; percentUsed: number; resetsAt?: string }
export type Contexto = { tokens?: number; window: number; percent?: number }

declare module 'claude-code' {
  interface PluginState {
    'stancke-mod': {
      // visual do chat
      theme: Theme
      tools: Record<string, { n: number; model: string }>
      word: string
      // faixa de limites de uso
      janelas: Janela[]
      modelo: string
      branch: string
      contexto: Contexto | null
      custo: number | null
      alertados: string[]
      ocupado: boolean
      esforco: string
      frase: string
      quadro: number
      // boas-vindas já mostradas nesta sessão
      boot: boolean
    }
  }
}
