// Chuva de caracteres estilo Matrix: tudo determinístico em (coluna, quadro), sem estado.

const GLIFOS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:=*+<>'

export type Trecho = { texto: string; cor: 'head' | 'forte' | 'media' | 'fraca' | 'vazio' }

// hash inteiro simples e estável
const mistura = (a: number, b: number) => {
  let h = (a * 374761393 + b * 668265263) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  return (h ^ (h >>> 16)) >>> 0
}

const glifo = (col: number, linha: number, quadro: number) =>
  GLIFOS.charAt(mistura(col * 131 + linha, Math.floor(quadro / 3)) % GLIFOS.length)

// uma linha da chuva como trechos de mesma cor (poucos nós por quadro)
export const linhaDaChuva = (linha: number, largura: number, altura: number, quadro: number): Trecho[] => {
  const trechos: Trecho[] = []
  for (let col = 0; col < largura; col++) {
    const semente = mistura(col, 7)
    const tamanho = 4 + (semente % 6)
    const velocidade = 1 + (semente % 3) // quadros por linha: 1 rápido, 3 lento
    const ciclo = altura + tamanho + (semente % 5)
    const cabeca = (Math.floor(quadro / velocidade) + (semente >>> 8)) % ciclo
    const dist = cabeca - linha
    let cor: Trecho['cor'] = 'vazio'
    if (dist === 0) cor = 'head'
    else if (dist > 0 && dist < tamanho) cor = dist < 2 ? 'forte' : dist < tamanho - 2 ? 'media' : 'fraca'
    const texto = cor === 'vazio' ? ' ' : glifo(col, linha, quadro)
    const ultimo = trechos[trechos.length - 1]
    if (ultimo && ultimo.cor === cor) ultimo.texto += texto
    else trechos.push({ texto, cor })
  }
  return trechos
}
