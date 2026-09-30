import { describe, expect, it } from 'vitest'
import {
  cardProblem,
  type Deck,
  deckNameProblem,
  decksReducer,
  dueCards,
  nextDue,
  parseDecks,
  sampleDecks,
} from './decks'

const today = '2026-09-30'
const empty: Deck[] = []

const withCards = () => {
  let decks = decksReducer(empty, { type: 'addDeck', id: 'd', name: '  Spanish ' })
  decks = decksReducer(decks, { type: 'addCard', deckId: 'd', id: 'a', front: ' hola ', back: 'hello', today })
  decks = decksReducer(decks, { type: 'addCard', deckId: 'd', id: 'b', front: 'gato', back: 'cat', today })
  return decks
}

describe('decks reducer', () => {
  it('adds decks and cards with trimmed text, cards new and due today', () => {
    const [deck] = withCards()
    expect(deck.name).toBe('Spanish')
    expect(deck.cards[0]).toEqual({ id: 'a', front: 'hola', back: 'hello', due: today, interval: 0, ease: 2.5, reps: 0, lapses: 0 })
  })

  it('renames and deletes decks', () => {
    const renamed = decksReducer(withCards(), { type: 'renameDeck', deckId: 'd', name: 'Español' })
    expect(renamed[0].name).toBe('Español')
    expect(decksReducer(renamed, { type: 'deleteDeck', deckId: 'd' })).toEqual([])
  })

  it('edits text without touching the schedule, and deletes cards', () => {
    let decks = decksReducer(withCards(), { type: 'review', deckId: 'd', cardId: 'a', grade: 'good', today })
    decks = decksReducer(decks, { type: 'editCard', deckId: 'd', cardId: 'a', front: '¡hola!', back: 'hi' })
    expect(decks[0].cards[0]).toMatchObject({ front: '¡hola!', back: 'hi', due: '2026-10-02', reps: 1 })
    decks = decksReducer(decks, { type: 'deleteCard', deckId: 'd', cardId: 'a' })
    expect(decks[0].cards.map((c) => c.id)).toEqual(['b'])
  })

  it('schedules reviewed cards and can reset a deck to new', () => {
    let decks = decksReducer(withCards(), { type: 'review', deckId: 'd', cardId: 'b', grade: 'easy', today })
    expect(decks[0].cards[1]).toMatchObject({ due: '2026-10-04', interval: 4 })
    decks = decksReducer(decks, { type: 'resetDeck', deckId: 'd', today: '2026-10-01' })
    expect(decks[0].cards[1]).toMatchObject({ due: '2026-10-01', interval: 0, reps: 0, ease: 2.5 })
  })

  it('appends imported decks', () => {
    const decks = decksReducer(withCards(), { type: 'import', decks: sampleDecks(today) })
    expect(decks.map((d) => d.name)).toEqual(['Spanish', 'World capitals'])
  })
})

describe('due cards', () => {
  it('lists cards due today or earlier, most overdue first', () => {
    const [deck] = withCards()
    deck.cards.push({ ...deck.cards[0], id: 'late', due: '2026-09-01' }, { ...deck.cards[0], id: 'later', due: '2026-10-09' })
    expect(dueCards(deck, today).map((c) => c.id)).toEqual(['late', 'a', 'b'])
    expect(nextDue(deck)).toBe('2026-09-01')
  })

  it('has no next day for an empty deck', () => {
    expect(nextDue({ id: 'x', name: 'x', cards: [] })).toBeUndefined()
  })
})

describe('validation', () => {
  it('wants a short, unique deck name', () => {
    const decks = withCards()
    expect(deckNameProblem('  ', decks)).toMatch(/name/)
    expect(deckNameProblem('x'.repeat(41), decks)).toMatch(/under 40/)
    expect(deckNameProblem('spanish', decks)).toMatch(/already/)
    expect(deckNameProblem('Spanish', decks, 'd')).toBeNull()
    expect(deckNameProblem('French', decks)).toBeNull()
  })

  it('wants text on both sides of a card', () => {
    expect(cardProblem('hola', ' ')).toMatch(/Both sides/)
    expect(cardProblem('hola', 'x'.repeat(501))).toMatch(/under 500/)
    expect(cardProblem('hola', 'hello')).toBeNull()
  })
})

describe('parsing untrusted decks', () => {
  it('round-trips saved decks', () => {
    const decks = withCards()
    expect(parseDecks(JSON.parse(JSON.stringify(decks)), today)).toEqual(decks)
  })

  it('rejects anything that is not a list of named decks', () => {
    expect(parseDecks({}, today)).toBeNull()
    expect(parseDecks([{ name: 'x' }], today)).toBeNull()
    expect(parseDecks([{ name: '', cards: [] }], today)).toBeNull()
  })

  it('drops cards without text and restarts cards with a broken schedule', () => {
    const decks = parseDecks(
      [{ id: 'd', name: 'D', cards: [{ front: 'q' }, { id: 'c', front: 'q', back: 'a', due: 'soon', interval: -1 }] }],
      today,
    )!
    expect(decks[0].cards).toEqual([{ id: 'c', front: 'q', back: 'a', due: today, interval: 0, ease: 2.5, reps: 0, lapses: 0 }])
  })

  it('gives ids to decks and cards that have none', () => {
    const [deck] = parseDecks([{ name: 'D', cards: [{ front: 'q', back: 'a' }] }], today)!
    expect(deck.id).toBeTruthy()
    expect(deck.cards[0].id).toBeTruthy()
  })
})
