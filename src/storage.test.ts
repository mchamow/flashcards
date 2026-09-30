import { describe, expect, it } from 'vitest'
import { sampleDecks } from './decks'
import { exportJson, importJson, loadDecks, saveDecks, STORAGE_KEY, uniqueName } from './storage'

const today = '2026-09-30'
const store = (value: string | null) => ({ getItem: (key: string) => (key === STORAGE_KEY ? value : null) })

describe('loading', () => {
  it('starts with the sample deck on a first visit', () => {
    expect(loadDecks(today, store(null))).toEqual(sampleDecks(today))
  })

  it('falls back to the sample deck on corrupt data', () => {
    expect(loadDecks(today, store('{nope'))).toEqual(sampleDecks(today))
    expect(loadDecks(today, store('{"decks":1}'))).toEqual(sampleDecks(today))
  })

  it('keeps an empty list the user chose', () => {
    expect(loadDecks(today, store('[]'))).toEqual([])
  })

  it('survives storage that throws', () => {
    const broken = { getItem: () => { throw new Error('denied') } }
    expect(loadDecks(today, broken)).toEqual(sampleDecks(today))
    expect(() => saveDecks([], { setItem: () => { throw new Error('quota') } })).not.toThrow()
  })

  it('round-trips through save', () => {
    let saved = ''
    const decks = sampleDecks('2026-09-01')
    saveDecks(decks, { setItem: (_, value) => (saved = value) })
    expect(loadDecks(today, store(saved))).toEqual(decks)
  })
})

describe('import and export', () => {
  it('imports an export as copies with fresh ids and progress kept', () => {
    const decks = sampleDecks(today)
    decks[0].cards[0].due = '2026-10-10'
    const imported = importJson(exportJson(decks), today, decks)
    expect(imported[0].name).toBe('World capitals 2')
    expect(imported[0].id).not.toBe(decks[0].id)
    expect(imported[0].cards[0]).toMatchObject({ front: 'Capital of Australia', due: '2026-10-10' })
    expect(imported[0].cards[0].id).not.toBe(decks[0].cards[0].id)
  })

  it('accepts a bare list of decks', () => {
    expect(importJson('[{"name":"Mini","cards":[{"front":"1+1","back":"2"}]}]', today)[0].cards).toHaveLength(1)
  })

  it('explains files it cannot use', () => {
    expect(() => importJson('nope', today)).toThrow('not valid JSON')
    expect(() => importJson('{"decks":{}}', today)).toThrow('does not look like')
    expect(() => importJson('[]', today)).toThrow('no decks')
  })

  it('numbers clashing names', () => {
    expect(uniqueName('Deck', ['deck', 'Deck 2'])).toBe('Deck 3')
    expect(uniqueName('New', ['Old'])).toBe('New')
    expect(uniqueName('x'.repeat(40), ['x'.repeat(40)])).toBe(`${'x'.repeat(38)} 2`)
  })
})
