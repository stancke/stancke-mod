import { expect, test } from 'claude-code/testing'

import { barra, corDaBarra, dinheiro, mil, resetCurto, resetEm } from './barra'

test('barra e cores por faixa', () => {
  expect(barra(50, 10)).toEqual({ cheio: '█████', vazio: '░░░░░' })
  expect(barra(120, 4).vazio).toBe('')
  expect(corDaBarra(42)).toBe('green')
  expect(corDaBarra(75)).toBe('yellow')
  expect(corDaBarra(95)).toBe('red')
})

test('tempo até o reinício', () => {
  const agora = Date.parse('2026-10-08T00:00:00Z')
  expect(resetEm('2026-10-08T02:30:00Z', agora)).toBe('reinicia em 2h 30min')
  expect(resetEm('2026-10-10T03:00:00Z', agora)).toBe('reinicia em 2d 3h')
  expect(resetEm(undefined, agora)).toBe('')
})

test('formatos curtos', () => {
  const agora = Date.parse('2026-10-08T00:00:00Z')
  expect(resetCurto('2026-10-08T02:05:00Z', agora)).toBe('↻ 2h05')
  expect(resetCurto('2026-10-10T03:00:00Z', agora)).toBe('↻ 2d 3h')
  expect(mil(68400)).toBe('68k')
  expect(mil(undefined)).toBe('?')
  expect(dinheiro(1.4)).toBe('$1,40')
})

import { esforcoVisual, nomeModelo } from './barra'

test('nome do modelo', () => {
  expect(nomeModelo('claude-sonnet-5-5')).toBe('Sonnet 5.5')
  expect(nomeModelo('claude-opus-5-5')).toBe('Opus 5.5')
  expect(nomeModelo('claude-opus-4-1-20250805')).toBe('Opus 4.1')
  expect(nomeModelo('claude-haiku-5-5[1m]')).toBe('Haiku 5.5')
  expect(nomeModelo('')).toBe('')
})

test('esforço em português', () => {
  expect(esforcoVisual('medium')).toEqual({ barras: '▮▮▯▯', rotulo: 'médio' })
  expect(esforcoVisual('')).toEqual({ barras: '', rotulo: '' })
})

import { linhaDaChuva } from './chuva'

test('chuva: largura fixa, determinística e com cabeça', () => {
  const l = linhaDaChuva(3, 36, 8, 10)
  expect(l.map(t => t.texto).join('').length).toBe(36)
  expect(linhaDaChuva(3, 36, 8, 10)).toEqual(l)
  const todas = Array.from({ length: 8 }, (_, i) => linhaDaChuva(i, 36, 8, 10)).flat()
  expect(todas.some(t => t.cor === 'head')).toBe(true)
})
