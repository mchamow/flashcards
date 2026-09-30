import { type DayKey, toKey } from './dates'
import { type Deck, MAX_NAME, newId, parseDecks, sampleDecks } from './decks'

export const STORAGE_KEY = 'flashcards:v1'

/** Missing or unreadable data gives the sample deck; an empty list is kept (the user deleted everything). */
export function loadDecks(today: DayKey = toKey(new Date()), storage: Pick<Storage, 'getItem'> = localStorage): Deck[] {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return sampleDecks(today)
    return parseDecks(JSON.parse(raw), today) ?? sampleDecks(today)
  } catch {
    return sampleDecks(today)
  }
}

/** Storage can be unavailable (private mode, quota): then the app works, it just forgets. */
export function saveDecks(decks: Deck[], storage: Pick<Storage, 'setItem'> = localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(decks))
  } catch {
    // Nothing to do.
  }
}

export const EXPORT_FORMAT = 'flashcards'

export const exportJson = (decks: Deck[]) => JSON.stringify({ format: EXPORT_FORMAT, version: 1, decks }, null, 2)

/** `name`, or "name 2", "name 3"… when a deck already has it. */
export function uniqueName(name: string, taken: string[]): string {
  const lower = new Set(taken.map((t) => t.toLowerCase()))
  if (!lower.has(name.toLowerCase())) return name
  for (let n = 2; ; n++) {
    const suffix = ` ${n}`
    const candidate = name.slice(0, MAX_NAME - suffix.length) + suffix
    if (!lower.has(candidate.toLowerCase())) return candidate
  }
}

/**
 * Decks from an exported file (or a bare list of decks), with fresh ids and names that don't clash
 * with `existing`, so importing the same file twice gives two copies. Throws a message for the user
 * when the file won't do.
 */
export function importJson(text: string, today: DayKey, existing: Deck[] = []): Deck[] {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const list = typeof raw === 'object' && raw !== null && 'decks' in raw ? (raw as { decks: unknown }).decks : raw
  const decks = parseDecks(list, today)
  if (!decks) throw new Error('That file does not look like exported flashcards.')
  if (decks.length === 0) throw new Error('That file has no decks in it.')
  const taken = existing.map((d) => d.name)
  return decks.map((d) => {
    const name = uniqueName(d.name, taken)
    taken.push(name)
    return { id: newId(), name, cards: d.cards.map((c) => ({ ...c, id: newId() })) }
  })
}
