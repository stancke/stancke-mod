import { test, expect } from 'claude-code/testing'

test('turn footer draws the duration', async $ => {
  const ui = await $.ui.mount({
    plugin: 'stancke-mod',
    surface: 'terminal',
    component: 'TurnDuration',
    props: { word: 'Baked', durationMs: 2300 },
  })
  expect(await ui.find({ type: 'Text', text: /2\.3s/ })).toBeDefined()
  await ui.unmount()
})
