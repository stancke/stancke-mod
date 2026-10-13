export const corDaBarra = (pct: number) => (pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green')

export const barra = (pct: number, largura: number) => {
  const cheio = Math.round((Math.min(100, Math.max(0, pct)) / 100) * largura)
  return { cheio: '█'.repeat(cheio), vazio: '░'.repeat(largura - cheio) }
}

export const resetEm = (iso: string | undefined, agora: number) => {
  if (!iso) return ''
  const min = Math.max(0, Math.round((Date.parse(iso) - agora) / 60000))
  if (min >= 1440) return `reinicia em ${Math.floor(min / 1440)}d ${Math.floor((min % 1440) / 60)}h`
  if (min >= 60) return `reinicia em ${Math.floor(min / 60)}h ${min % 60}min`
  return `reinicia em ${min}min`
}

export const preencher = (texto: string, largura: number) => texto.padEnd(largura, ' ')

export const mil = (n: number | undefined) => (n === undefined ? '?' : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))

// reinício curto: "2h30", "3d 4h", "12min"
export const resetCurto = (iso: string | undefined, agora: number) => {
  if (!iso) return ''
  const min = Math.max(0, Math.round((Date.parse(iso) - agora) / 60000))
  if (min >= 1440) return `↻ ${Math.floor(min / 1440)}d ${Math.floor((min % 1440) / 60)}h`
  if (min >= 60) return `↻ ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
  return `↻ ${min}min`
}

export const dinheiro = (usd: number) => `$${usd.toFixed(2).replace('.', ',')}`

// "claude-sonnet-5-5" → "Sonnet 5.5"; "claude-opus-4-1-20250805" → "Opus 4.1"; "claude-3-5-haiku" → "Haiku 3.5"
export const nomeModelo = (id: string) => {
  if (!id) return ''
  const partes = id
    .replace(/\[.*?\]/g, '')
    .replace(/^claude-?/i, '')
    .replace(/-\d{8}$/, '')
    .split('-')
    .filter(Boolean)
  const nome = partes.filter(p => !/^\d+$/.test(p))
  const versao = partes.filter(p => /^\d+$/.test(p)).join('.')
  const rotulo = nome.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
  return versao ? `${rotulo} ${versao}`.trim() : rotulo || id
}

const NIVEIS: Record<string, [number, string]> = {
  low: [1, 'baixo'],
  medium: [2, 'médio'],
  high: [3, 'alto'],
  xhigh: [4, 'muito alto'],
  max: [4, 'máximo'],
}

// nível de esforço → barrinhas e rótulo em português
export const esforcoVisual = (nivel: string) => {
  if (!nivel) return { barras: '', rotulo: '' }
  const [n, rotulo] = NIVEIS[nivel] ?? [0, nivel]
  return { barras: '▮'.repeat(n) + '▯'.repeat(4 - n), rotulo }
}
