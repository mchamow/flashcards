import { type DayKey, isDayKey } from './dates'
import { type Grade, MIN_EASE, newSchedule, review, type Schedule } from './srs'

export type Card = Schedule & { id: string; front: string; back: string }
export type Deck = { id: string; name: string; cards: Card[] }

export const MAX_NAME = 40
export const MAX_SIDE = 500

export const newId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

export type Action =
  | { type: 'addDeck'; id: string; name: string }
  | { type: 'renameDeck'; deckId: string; name: string }
  | { type: 'deleteDeck'; deckId: string }
  | { type: 'addCard'; deckId: string; id: string; front: string; back: string; today: DayKey }
  | { type: 'editCard'; deckId: string; cardId: string; front: string; back: string }
  | { type: 'deleteCard'; deckId: string; cardId: string }
  | { type: 'review'; deckId: string; cardId: string; grade: Grade; today: DayKey }
  | { type: 'resetDeck'; deckId: string; today: DayKey }
  | { type: 'import'; decks: Deck[] }

const mapDeck = (decks: Deck[], id: string, fn: (deck: Deck) => Deck) => decks.map((d) => (d.id === id ? fn(d) : d))
const mapCard = (deck: Deck, id: string, fn: (card: Card) => Card) => ({
  ...deck,
  cards: deck.cards.map((c) => (c.id === id ? fn(c) : c)),
})

export function decksReducer(decks: Deck[], action: Action): Deck[] {
  switch (action.type) {
    case 'addDeck':
      return [...decks, { id: action.id, name: action.name.trim(), cards: [] }]
    case 'renameDeck':
      return mapDeck(decks, action.deckId, (d) => ({ ...d, name: action.name.trim() }))
    case 'deleteDeck':
      return decks.filter((d) => d.id !== action.deckId)
    case 'addCard': {
      const card: Card = { id: action.id, front: action.front.trim(), back: action.back.trim(), ...newSchedule(action.today) }
      return mapDeck(decks, action.deckId, (d) => ({ ...d, cards: [...d.cards, card] }))
    }
    case 'editCard':
      return mapDeck(decks, action.deckId, (d) =>
        mapCard(d, action.cardId, (c) => ({ ...c, front: action.front.trim(), back: action.back.trim() })),
      )
    case 'deleteCard':
      return mapDeck(decks, action.deckId, (d) => ({ ...d, cards: d.cards.filter((c) => c.id !== action.cardId) }))
    case 'review':
      return mapDeck(decks, action.deckId, (d) =>
        mapCard(d, action.cardId, (c) => ({ ...c, ...review(c, action.grade, action.today) })),
      )
    case 'resetDeck':
      return mapDeck(decks, action.deckId, (d) => ({
        ...d,
        cards: d.cards.map((c) => ({ ...c, ...newSchedule(action.today) })),
      }))
    case 'import':
      return [...decks, ...action.decks]
  }
}

export const isDue = (card: Card, today: DayKey) => card.due <= today

/** Due cards, the most overdue first; the order is stable so a session is predictable. */
export const dueCards = (deck: Deck, today: DayKey) =>
  deck.cards.filter((c) => isDue(c, today)).sort((a, b) => a.due.localeCompare(b.due))

/** The day the next card becomes due, if none is due now. */
export const nextDue = (deck: Deck): DayKey | undefined =>
  deck.cards.reduce<DayKey | undefined>((min, c) => (min === undefined || c.due < min ? c.due : min), undefined)

export function deckNameProblem(name: string, decks: Deck[], ownId?: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Give the deck a name.'
  if (trimmed.length > MAX_NAME) return `Keep it under ${MAX_NAME} characters.`
  const clash = decks.some((d) => d.id !== ownId && d.name.toLowerCase() === trimmed.toLowerCase())
  return clash ? 'There is already a deck with that name.' : null
}

export function cardProblem(front: string, back: string): string | null {
  if (!front.trim() || !back.trim()) return 'Both sides need some text.'
  if (front.trim().length > MAX_SIDE || back.trim().length > MAX_SIDE) return `Keep each side under ${MAX_SIDE} characters.`
  return null
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim() !== '' && v.length <= max
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0

function parseCard(raw: unknown, today: DayKey): Card | null {
  if (!isObject(raw) || !isText(raw.front, MAX_SIDE) || !isText(raw.back, MAX_SIDE)) return null
  const id = typeof raw.id === 'string' && raw.id ? raw.id : newId()
  const scheduled =
    isDayKey(raw.due) &&
    isCount(raw.interval) &&
    typeof raw.ease === 'number' &&
    raw.ease >= MIN_EASE &&
    raw.ease <= 5 &&
    isCount(raw.reps) &&
    isCount(raw.lapses)
  const schedule: Schedule = scheduled
    ? { due: raw.due as DayKey, interval: raw.interval as number, ease: raw.ease as number, reps: raw.reps as number, lapses: raw.lapses as number }
    : newSchedule(today)
  return { id, front: raw.front, back: raw.back, ...schedule }
}

/**
 * Decks from untrusted JSON (storage or an imported file), or null when it isn't a list of decks.
 * Cards missing text are dropped; cards with a broken schedule start over as new.
 */
export function parseDecks(raw: unknown, today: DayKey): Deck[] | null {
  if (!Array.isArray(raw)) return null
  const decks: Deck[] = []
  for (const item of raw) {
    if (!isObject(item) || !isText(item.name, MAX_NAME) || !Array.isArray(item.cards)) return null
    const cards = item.cards.map((c) => parseCard(c, today)).filter((c): c is Card => c !== null)
    decks.push({ id: typeof item.id === 'string' && item.id ? item.id : newId(), name: item.name, cards })
  }
  return decks
}

const SAMPLE: [string, string][] = [
  ['Capital of Australia', 'Canberra'],
  ['Capital of Canada', 'Ottawa'],
  ['Capital of Japan', 'Tokyo'],
  ['Capital of Kenya', 'Nairobi'],
  ['Capital of Peru', 'Lima'],
  ['Capital of Poland', 'Warsaw'],
]

/** What a first visit starts with, so there is something to study right away. */
export const sampleDecks = (today: DayKey): Deck[] => [
  {
    id: 'sample-capitals',
    name: 'World capitals',
    cards: SAMPLE.map(([front, back], i) => ({ id: `sample-${i}`, front, back, ...newSchedule(today) })),
  },
]
