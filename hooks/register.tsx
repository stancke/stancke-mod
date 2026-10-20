import { atom, read, update } from 'claude-code'
import type { Engine, Register } from 'claude-code'

import type { Contexto, Janela, Theme } from '../types'
import { linhaDaChuva } from './chuva'
import { corDaBarra, dinheiro, esforcoVisual, mil, nomeModelo, resetCurto } from './barra'

const PALETTES = {
  claro: { purple: '#8b4fe0', amber: '#b8860b', gray: '#6b7280', panel: '#f6f7f9', ink: '#2b2b2b', green: '#2f855a', blue: '#3b6ea5', claude: '#d77757' },
  escuro: { purple: '#a78bfa', amber: '#e0a526', gray: '#9ca3af', panel: '#262a33', ink: '#e5e7eb', green: '#68d391', blue: '#7aa7e0', claude: '#d77757' },
} as const

const theme = atom({ plugin: 'stancke-mod', key: 'theme' } as const, 'claro' as Theme)
const turnTools = atom({ plugin: 'stancke-mod', key: 'tools' } as const, {} as Record<string, { n: number; model: string }>)

const word = atom({ plugin: 'stancke-mod', key: 'word' } as const, '')

const WORDS = [
  // padrão
  'Pensando', 'Processando', 'Analisando', 'Compilando', 'Refletindo', 'Calculando', 'Montando a resposta',
  // anos 80
  'Rebobinando a fita VHS', 'Soprando o cartucho', 'Carregando do disquete', 'Discando o modem 56k... ou 300 bps',
  'Ajustando o tracking do VHS', 'Aquecendo o Atari', 'Dando play no Walkman', 'Moonwalkando', 'Digitando no TK-85',
  'Voltando para o futuro', 'Procurando fliperama com ficha', 'Dando corda no Rubik\'s Cube', 'Ajustando a antena de TV',
  // Matrix
  'Escolhendo a pílula vermelha', 'Desviando das balas', 'Seguindo o coelho branco', 'Baixando kung fu no cérebro',
  'Hackeando a Matrix', 'Não existe colher', 'Déjà vu: o gato preto passou de novo', 'Ligando para o orelhão',
  // Ghost in the Shell
  'Fazendo ghost-dive', 'Hackeando o ghost', 'Sincronizando a prótese cibernética', 'Ativando camuflagem óptica',
  'Procurando o Puppet Master', 'Mergulhando no mar de informação', 'Consultando a Seção 9', 'Perseguindo um Tachikoma',
  // Akira
  'Gritando KANEDA!', 'Gritando TETSUOOO!', 'Despertando poderes psíquicos', 'Derrapando de moto vermelha em Neo-Tóquio',
  'Tomando as pílulas da gangue', 'Evitando o Acelerador de Partículas', 'Contando até 2019',
  // Blade Runner
  'Aplicando o teste Voight-Kampff', 'Vendo naves em chamas além de Órion', 'Aprimorando a imagem... aprimorando...',
  'Perdendo momentos como lágrimas na chuva', 'Caçando replicantes', 'Contando ovelhas elétricas',
  'Esperando a chuva ácida passar', 'Origami de unicórnio em andamento',
  // Tron
  'Entrando na Grade', 'Lançando o disco de identidade', 'Pilotando a moto de luz', 'Fugindo do MCP',
  'Derezzando bits', 'Jogando disco no fliperama', 'Os usuários acreditam em você',
  // De Volta para o Futuro
  'Acelerando a 88 milhas por hora', 'Abastecendo o capacitor de fluxo', 'Reunindo 1,21 gigawatts',
  'Consertando a torre do relógio', 'Procurando estradas... onde vamos não precisamos de estradas',
  'Evitando paradoxos temporais', 'Andando de hoverboard', 'Calibrando o DeLorean',
]

const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)] ?? 'Pensando'

const KIND: Record<string, 'amber' | 'green' | 'blue'> = {
  Bash: 'amber',
  Edit: 'green',
  Write: 'green',
  NotebookEdit: 'green',
  Read: 'blue',
  Grep: 'blue',
  Glob: 'blue',
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

const summarize = (input: unknown): string => {
  if (typeof input !== 'object' || input === null) return ''
  const o = input as Record<string, unknown>
  for (const k of ['command', 'file_path', 'path', 'pattern', 'url', 'query', 'description']) {
    const v = o[k]
    if (typeof v === 'string' && v !== '') return clip(v.replace(/\s+/g, ' '), 90)
  }
  return clip(JSON.stringify(input) ?? '', 90)
}

// "claude-sonnet-5-5" -> "Sonnet 5.5"; outros ids ficam como vieram.
const modelName = (id: string): string => {
  if (!id.startsWith('claude-')) return id
  const parts = id.slice(7).replace(/-\d{8}$/, '').replace(/\[.*\]$/, '').split('-')
  const nums = parts.filter(x => /^\d+$/.test(x)).join('.')
  const names = parts.filter(x => !/^\d+$/.test(x)).map(x => x.charAt(0).toUpperCase() + x.slice(1))
  return [...names, nums].filter(Boolean).join(' ')
}

const seconds = (ms: number) =>
  ms < 60000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`

const LABEL = 'Claude Code - Stancke Mod'

const janelas = atom({ plugin: 'stancke-mod', key: 'janelas' } as const, [])
const modelo = atom({ plugin: 'stancke-mod', key: 'modelo' } as const, '')
const branch = atom({ plugin: 'stancke-mod', key: 'branch' } as const, '')
const contexto = atom({ plugin: 'stancke-mod', key: 'contexto' } as const, null)
const custo = atom({ plugin: 'stancke-mod', key: 'custo' } as const, null)
const alertados = atom({ plugin: 'stancke-mod', key: 'alertados' } as const, [])
const ocupado = atom({ plugin: 'stancke-mod', key: 'ocupado' } as const, false)
const esforco = atom({ plugin: 'stancke-mod', key: 'esforco' } as const, '')
const frase = atom({ plugin: 'stancke-mod', key: 'frase' } as const, '')
const quadro = atom({ plugin: 'stancke-mod', key: 'quadro' } as const, 0)

// cada frase termina com a referência do filme
const FRASES = [
  // Matrix
  'Siga o coelho branco. — Matrix',
  'Não existe colher. — Matrix',
  'Bem-vindo ao deserto do real. — Matrix',
  'Eu sei kung fu. — Matrix',
  'Acorde, Neo... — Matrix',
  'A Matrix tem você. — Matrix',
  'Livre sua mente. — Matrix',
  'Pílula azul ou pílula vermelha? — Matrix',
  'Há diferença entre conhecer o caminho e percorrê-lo. — Matrix',
  'Você é o escolhido. — Matrix',
  'Tudo que tem começo tem fim. — Matrix',
  'Eu só posso lhe mostrar a porta. — Matrix',
  'Desvie da realidade. — Matrix',
  'O que é real? — Matrix',
  // Blade Runner
  'Todos esses momentos se perderão no tempo, como lágrimas na chuva. — Blade Runner',
  'Eu vi coisas em que vocês não acreditariam. — Blade Runner',
  'Mais humano que o humano. — Blade Runner',
  'É uma pena que ela não vá viver. Mas, também, quem vive? — Blade Runner',
  'Quero mais vida. — Blade Runner',
  // Mad Max
  'Testemunhe-me! — Mad Max',
  'Que dia lindo e glorioso! — Mad Max',
  'Eu vivo, eu morro, eu vivo de novo! — Mad Max',
  'Quem matou o mundo? — Mad Max',
  'Onde devemos buscar a nossa salvação? — Mad Max',
  // De Volta para o Futuro
  'Estradas? Para onde vamos, não precisamos de estradas. — De Volta para o Futuro',
  'Grande Scott! — De Volta para o Futuro',
  'Seu futuro ainda não foi escrito. O de ninguém foi. — De Volta para o Futuro',
  'Se você se esforçar, pode conseguir qualquer coisa. — De Volta para o Futuro',
  // Tron
  'Saudações, programa! — Tron',
  'Eu lutei pelos usuários. — Tron',
  'Fim da linha. — Tron',
  // RoboCop
  'Morto ou vivo, você vem comigo. — RoboCop',
  'Você tem vinte segundos para obedecer. — RoboCop',
  // O Exterminador do Futuro
  'Eu voltarei. — O Exterminador do Futuro',
  'Venha comigo se quiser viver. — O Exterminador do Futuro',
  'Hasta la vista, baby. — O Exterminador do Futuro',
  'Não há destino além do que nós mesmos criamos. — O Exterminador do Futuro',
  // Akira
  'Tetsuo! — Akira',
  'Kaneda! — Akira',
  // Ghost in the Shell
  'A rede é vasta e infinita. — Ghost in the Shell',
  'Sou uma entidade viva e pensante, nascida no mar de informação. — Ghost in the Shell',
]

// sorteia uma frase nova (usa o relógio da engine como semente)
async function sortearFrase($: Engine) {
  const agora = await $.clock.now()
  const atual = await read($, frase)
  const opcoes = FRASES.filter(f => f !== atual)
  await update($, frase, () => opcoes[Math.floor(agora / 7) % opcoes.length] ?? FRASES[0])
}

const GIRO = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const COR_PRINCIPAL = 'claude'
const LARGURA_PAINEL = 54
const LARGURA_GAUGE = 10
// mais larga que qualquer terminal: a caixa corta o excedente e a chuva ocupa todo o espaço livre
const LARGURA_CHUVA = 300
// quadro congelado mostrado enquanto o modelo está parado
const QUADRO_PARADO = 37
const CORES_CHUVA = {
  head: 'whiteBright',
  forte: 'greenBright',
  media: 'green',
  fraca: 'green',
  vazio: undefined,
} as const

// ▰ cheio, ▱ vazio (mesmo medidor do flightdeck)
const gauge = (pct: number, largura: number) => {
  const cheio = Math.max(0, Math.min(largura, Math.round((pct / 100) * largura)))
  return { on: '▰'.repeat(cheio), off: '▱'.repeat(largura - cheio) }
}

let giro: { cancel: () => void } | undefined

// liga/desliga a animação de "working" enquanto o modelo trabalha
async function definirOcupado($: Engine, valor: boolean) {
  giro?.cancel()
  giro = undefined
  await update($, ocupado, () => valor)
  if (valor) {
    giro = $.clock.every(120, () => {
      void update($, quadro, n => n + 1).catch(() => undefined)
    })
  }
}

const ROTULOS: Record<string, string> = {
  five_hour: '5 horas',
  seven_day: '7 dias',
  spend_limit: 'gasto',
}
const LARGURA_ROTULO = 9
const LIMITE_ALERTA = 90

async function guardar($: Engine, lista: Janela[], ctx: Contexto | null, usd: number | null) {
  await update($, janelas, () => lista)
  await update($, contexto, () => ctx)
  await update($, custo, () => usd)

  // toast único por janela ao passar de 90%; reabilita quando volta abaixo
  const ja = await read($, alertados)
  const acima = lista.filter(j => j.percentUsed >= LIMITE_ALERTA).map(j => j.kind)
  const novos = acima.filter(k => !ja.includes(k))
  if (novos.length > 0) {
    $.ui.toast(`⚠ Limite quase no fim: ${novos.map(k => ROTULOS[k] ?? k).join(', ')}`)
  }
  await update($, alertados, () => acima)
}

let vigia: { cancel: () => void } | undefined

// lê o branch a cada chamada, sem cache, no cwd atual da sessão (checkout pode ser em outro repo/worktree)
async function lerBranch($: Engine): Promise<string> {
  try {
    const cwd = await $.session.cwd()
    const r = await $.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd,
      timeoutMs: 3000,
    })
    if (r.exitCode !== 0) return ''
    const nome = r.stdout.trim()
    if (nome !== 'HEAD') return nome
    // HEAD solto: mostra o hash curto
    const h = await $.process.run(['git', 'rev-parse', '--short', 'HEAD'], { cwd, timeoutMs: 3000 })
    return h.exitCode === 0 ? h.stdout.trim() : ''
  } catch {
    return ''
  }
}

async function atualizarBranch($: Engine) {
  const valor = await lerBranch($)
  // só grava quando muda, para não redesenhar a faixa a cada verificação
  if ((await read($, branch)) !== valor) await update($, branch, () => valor)
}

// (re)arma a verificação periódica; se o intervalo morreu, volta a funcionar
function armarVigia($: Engine) {
  vigia?.cancel()
  vigia = $.clock.every(2000, () => {
    void atualizarBranch($).catch(() => undefined)
    void atualizarModelo($).catch(() => undefined)
  })
}

async function atualizarModelo($: Engine) {
  const atual = await $.session.model()
  if ((await read($, modelo)) !== atual) await update($, modelo, () => atual)
}

// notificação do desktop (notify-send) só para turnos de pelo menos este tamanho
const NOTIFICAR_APOS_MS = 8000

const boot = atom({ plugin: 'stancke-mod', key: 'boot' } as const, false)

const BOAS_VINDAS = [
  'Acorde, Neo... a Matrix tem você.',
  'Siga o coelho branco.',
  'SHALL WE PLAY A GAME? — WarGames',
  'Saudações, programa! — Tron',
  'Estradas? Para onde vamos, não precisamos de estradas. — De Volta para o Futuro',
  'A rede é vasta e infinita. — Ghost in the Shell',
  'Neo-Tóquio, 2019. KANEDA! — Akira',
  'Mais humano que o humano. — Blade Runner',
  'Testemunhe-me! — Mad Max',
  'Venha comigo se quiser viver. — O Exterminador do Futuro',
  'Você tem vinte segundos para obedecer. — RoboCop',
  'Grande Scott! — De Volta para o Futuro',
]

export const register: Register = on => {
  let tools = 0

  on('tool.call', async ($, e, next) => {
    tools += 1
    await update($, word, () => pick())
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    // alerta do desktop Linux (canto superior direito) quando o Claude termina;
    // vem primeiro para que uma falha nas outras etapas não o impeça
    if (e.agentId === undefined && !e.isAborted && e.durationMs >= NOTIFICAR_APOS_MS) {
      try {
        const model = e.usage?.model ?? (await $.session.model())
        const n = tools
        const resumo = `${seconds(e.durationMs)} · ${n} ${n === 1 ? 'ferramenta' : 'ferramentas'} · ${modelName(model)}`
        const resposta = clip((e.answer ?? '').replace(/\s+/g, ' ').trim(), 140)
        const r = await $.process.run(
          ['notify-send', '-a', 'Claude Code', '-i', 'utilities-terminal', '-t', '10000', '--', 'Claude Code terminou', resposta === '' ? resumo : `${resumo}\n${resposta}`],
          { timeoutMs: 5000 },
        )
        if (r.exitCode !== 0) $.ui.log(`stancke-mod: notify-send saiu com código ${r.exitCode}: ${r.stderr.trim()}`)
      } catch (erro) {
        $.ui.log(`stancke-mod: falha na notificação: ${String(erro)}`)
      }
    }

    try {
      if (e.agentId === undefined) {
        const key = String(e.durationMs)
        const n = tools
        const model = e.usage?.model ?? (await $.session.model())
        await update($, turnTools, m => ({ ...m, [key]: { n, model } }))
      }
      await definirOcupado($, false)
      await sortearFrase($).catch(() => undefined)
      await atualizarModelo($)
      await atualizarBranch($)
      armarVigia($)
    } catch (erro) {
      $.ui.log(`stancke-mod: falha ao fechar o turno: ${String(erro)}`, { to: 'debug' })
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'tema-stancke-mod' }, async ($, e, next) => {
    const arg = e.args.trim().toLowerCase()
    const current = await read($, theme)
    const wanted: Theme = arg === 'claro' || arg === 'escuro' ? arg : current === 'claro' ? 'escuro' : 'claro'
    await update($, theme, () => wanted)
    return { text: `Tema do Stancke Mod: ${wanted}.` }
  }).catch(($, e, next) => ({ text: 'Uso: /tema-stancke-mod claro|escuro' }))

  // Rodapé: diretório atual + label do mod, presos sob o prompt.
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'tema-stancke-mod', description: 'Alterna o tema do Stancke Mod: /tema-stancke-mod claro|escuro' })
    $.ui.status(`${e.cwd}  ·  ${LABEL}`)
    // fecha o painel lateral da versão anterior do mod, que ficaria em branco
    await $.ui.close({ id: 'limites-uso' })
    const uso = await $.session.usage()
    await guardar($, uso.rateLimits as Janela[], uso.context, uso.cost?.usd ?? null)
    await atualizarModelo($)
    await atualizarBranch($)
    armarVigia($)
    await sortearFrase($)

    // boas-vindas retrô, uma vez por sessão (um reload não repete)
    if (e.isInteractive && !(await read($, boot))) {
      await update($, boot, () => true)
      const ola = BOAS_VINDAS[Math.floor(Math.random() * BOAS_VINDAS.length)] ?? BOAS_VINDAS[0]
      // uma única chamada: cada $.ui.log vira uma linha própria no transcript, com espaço entre elas
      $.ui.log(
        [
          'STANCKE-OS v1.985 (C) 1985  ·  64K RAM SYSTEM  ·  38911 BASIC BYTES FREE',
          'LOAD "CLAUDE CODE",8,1  ...  READY.',
          `> ${ola}`,
        ].join('\n'),
      )
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    tools = 0
    await update($, word, () => pick())
    $.ui.status(`${await $.session.cwd()}  ·  ${LABEL}`)
    await atualizarModelo($)
    await atualizarBranch($)
    armarVigia($)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.PostModelSwitch', async ($, e, next) => {
    await atualizarModelo($)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.CwdChanged', async ($, e, next) => {
    await atualizarBranch($)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.step', async function* ($, e, next) {
    try {
      if (e.agentId === undefined && e.effort !== undefined) {
        const nivel = String(e.effort)
        if ((await read($, esforco)) !== nivel) await update($, esforco, () => nivel)
      }
    } catch {
      // o esforço é só informativo: nunca atrapalha a requisição
    }

    return yield* next(e)
  })

  on('turn.start', async ($, e, next) => {
    await definirOcupado($, true)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.measure', async ($, e, next) => {
    await guardar($, e.rateLimits as Janela[], e.context, e.cost?.usd ?? null)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const lista = await read($, janelas)
    const atual = await read($, modelo)
    const ramo = await read($, branch)
    const ctx = await read($, contexto)
    const usd = await read($, custo)

    if (e.props.hasSurvey || (lista.length === 0 && !atual)) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const agora = await $.clock.now()

    const ativo = await read($, ocupado)
    const fraseAtual = (await read($, frase)) || FRASES[0]
    const nivel = esforcoVisual(await read($, esforco))
    const q = await read($, quadro)
    const Linha = ({ rotulo, pct, extra }: { rotulo: string; pct: number; extra: string }) => {
      const g = gauge(pct, LARGURA_GAUGE)
      const alerta = pct >= LIMITE_ALERTA
      return (
        <Text wrap="truncate">
          <Text dimColor>{rotulo.padEnd(LARGURA_ROTULO, ' ')}</Text>
          <Text color={alerta ? 'red' : corDaBarra(pct)}>{g.on}</Text>
          <Text dimColor>{g.off}</Text>
          <Text bold>{` ${String(Math.round(pct)).padStart(3, ' ')}%`}</Text>
          <Text dimColor>{`  ${extra}`}</Text>
          {alerta ? <Text color="red">{' ⚠'}</Text> : null}
        </Text>
      )
    }

    // card no estilo do flightdeck: borda colorida, título + estado, linhas com rótulo
    // altura do conteúdo do card (título, linhas, rodapé): a chuva acompanha
    const alturaConteudo = 2 + (ctx?.percent !== undefined ? 1 : 0) + lista.length
    const linhasChuva = Array.from({ length: alturaConteudo }, (_, i) => i)

    return (
      <Box justifyContent="flex-end" width="100%">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={ativo ? 'green' : undefined}
          borderDimColor={!ativo}
          paddingX={1}
          flexGrow={1}
          overflow="hidden"
          height={alturaConteudo + 2}
          marginRight={1}
        >
          {linhasChuva.map(i => (
            <Box height={1} overflow="hidden" justifyContent={!ativo && i === Math.floor(alturaConteudo / 2) ? 'center' : undefined}>
              {!ativo && i === Math.floor(alturaConteudo / 2) ? (
                <Text color="greenBright" bold wrap="truncate">
                  {` ${fraseAtual} `}
                </Text>
              ) : (
              <Text wrap="wrap">
                {linhaDaChuva(i, LARGURA_CHUVA, alturaConteudo, ativo ? q : QUADRO_PARADO).map(t => (
                  // parado: o mesmo quadro congelado, tudo apagado e sem a cabeça clara
                  <Text
                    color={ativo ? CORES_CHUVA[t.cor] : t.cor === 'vazio' ? undefined : 'green'}
                    dimColor={ativo ? t.cor === 'fraca' : true}
                  >
                    {t.texto}
                  </Text>
                ))}
              </Text>
              )}
            </Box>
          ))}
        </Box>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={COR_PRINCIPAL}
          paddingX={2}
          width={LARGURA_PAINEL}
          flexShrink={0}
        >
          <Box justifyContent="space-between">
            <Text wrap="truncate">
              <Text color={COR_PRINCIPAL} bold>
                {nomeModelo(atual)}
              </Text>
              {nivel.rotulo !== '' && (
                <Text>
                  <Text dimColor>{'  esforço '}</Text>
                  <Text color={COR_PRINCIPAL}>{nivel.barras} </Text>
                  <Text color={COR_PRINCIPAL} bold>
                    {nivel.rotulo}
                  </Text>
                </Text>
              )}
            </Text>
            <Text color={ativo ? COR_PRINCIPAL : undefined} dimColor={!ativo}>
              {ativo ? `${GIRO[q % GIRO.length]} trabalhando` : '○ ocioso'}
            </Text>
          </Box>
          {ctx?.percent !== undefined && (
            <Linha
              rotulo="contexto"
              pct={ctx.percent}
              extra={`${mil(ctx.tokens)}/${mil(ctx.window)}`}
            />
          )}
          {lista.map(j => (
            <Linha
              rotulo={ROTULOS[j.kind] ?? j.kind}
              pct={j.percentUsed}
              extra={resetCurto(j.resetsAt, agora)}
            />
          ))}
          <Box justifyContent="space-between">
            {usd !== null ? <Text bold>{dinheiro(usd)}</Text> : <Text> </Text>}
            {ramo !== '' && <Text color="cyan">⎇ {ramo}</Text>}
          </Box>
        </Box>
      </Box>
    )
  })

  // Mensagem do usuário: bloco com barra laranja Claude à esquerda.
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (e.props.origin.kind !== 'composer' || e.props.from || e.props.task) return next(e)
    const c = PALETTES[await read($, theme)]
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" marginY={1}>
        <Box width={1} backgroundColor={c.claude} />
        <Box flexGrow={1} backgroundColor={c.panel} paddingX={2} paddingY={1}>
          <Text color={c.ink}>{e.props.text}</Text>
        </Box>
      </Box>
    )
  })

  // Resposta do assistente: markdown limpo, recuado, sem o marcador padrão.
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    if (e.props.isSummary) return next(e)
    const { Box, Markdown } = $.ui.resolve(e)
    return (
      <Box paddingLeft={2} marginY={1}>
        <Markdown text={e.props.text} />
      </Box>
    )
  })

  // Chamada de ferramenta: "▸ Nome  resumo", com a cor da seta pelo tipo da ferramenta.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const c = PALETTES[await read($, theme)]
    const { Box, Text } = $.ui.resolve(e)
    const p = e.props
    const failed = p.isErrored || p.isInterrupted
    const mark = failed ? '✗' : p.isRunning ? '…' : '▸'
    const color = failed ? 'error' : c[KIND[p.tool] ?? 'purple' as 'purple']
    return (
      <Box paddingLeft={2} flexDirection="row" gap={1}>
        <Text color={color}>{mark}</Text>
        <Text bold color={color}>{p.tool}</Text>
        <Text color={c.gray}>{summarize(p.input)}</Text>
      </Box>
    )
  })

  // Spinner: "+ Thinking…" em âmbar.
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const c = PALETTES[await read($, theme)]
    const { Box, Text } = $.ui.resolve(e)
    const chosen = await read($, word)
    const label = e.props.message ?? (chosen !== '' ? chosen : e.props.word)
    return (
      <Box paddingLeft={2}>
        <Text color={c.amber}>+ {label}…</Text>
      </Box>
    )
  })

  // Fim do turno: "▣ Build · 2.3s · 4 ferramentas".
  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const c = PALETTES[await read($, theme)]
    const turn = (await read($, turnTools))[String(e.props.durationMs)]
    const n = turn?.n
    const { Box, Text } = $.ui.resolve(e)
    const extra = n === undefined ? '' : ` · ${n} ${n === 1 ? 'ferramenta' : 'ferramentas'}`
    return (
      <Box paddingLeft={2} flexDirection="row" gap={1}>
        <Text color={c.purple}>▣</Text>
        <Text bold color={c.ink}>{turn === undefined ? 'Claude' : modelName(turn.model)}</Text>
        <Text color={c.gray}>· {seconds(e.props.durationMs)}{extra}</Text>
      </Box>
    )
  })
}
