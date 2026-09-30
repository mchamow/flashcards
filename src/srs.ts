import { addDays, type DayKey } from './dates'

/** How well the answer was recalled, from forgotten to effortless. */
export type Grade = 'again' | 'hard' | 'good' | 'easy'

export const GRADES: readonly Grade[] = ['again', 'hard', 'good', 'easy']

/** The part of a card the scheduler owns. */
export type Schedule = {
  /** The day the card is next shown; it is due on and after this day. */
  due: DayKey
  /** Days between the last review and `due`; 0 for cards that are new or just forgotten. */
  interval: number
  /** SM-2 ease factor: how fast intervals grow after a good answer. */
  ease: number
  /** Successful reviews in a row; back to 0 when a card is forgotten. */
  reps: number
  /** Times the card was forgotten after being learned. */
  lapses: number
}

export const START_EASE = 2.5
export const MIN_EASE = 1.3
const EASE_CHANGE: Record<Grade, number> = { again: -0.2, hard: -0.15, good: 0, easy: 0.15 }

export const newSchedule = (today: DayKey): Schedule => ({ due: today, interval: 0, ease: START_EASE, reps: 0, lapses: 0 })

/** Days until the card comes back after this grade (0: again, in this session). */
export function nextInterval(card: Schedule, grade: Grade): number {
  if (grade === 'again') return 0
  const { interval, ease, reps } = card
  if (reps === 0) return { hard: 1, good: 2, easy: 4 }[grade]
  const hard = Math.max(interval + 1, Math.round(interval * 1.2))
  const good = Math.max(hard + 1, Math.round(interval * ease))
  if (grade === 'hard') return hard
  if (grade === 'good') return good
  return Math.max(good + 1, Math.round(interval * ease * 1.3))
}

/** An SM-2 style review: intervals grow by the ease factor, which the grade nudges up or down. */
export function review(card: Schedule, grade: Grade, today: DayKey): Schedule {
  const interval = nextInterval(card, grade)
  const ease = Math.max(MIN_EASE, Math.round((card.ease + EASE_CHANGE[grade]) * 100) / 100)
  if (grade === 'again') {
    return { due: today, interval: 0, ease, reps: 0, lapses: card.reps > 0 ? card.lapses + 1 : card.lapses }
  }
  return { due: addDays(today, interval), interval, ease, reps: card.reps + 1, lapses: card.lapses }
}

/** Short interval labels for the grade buttons: "now", "3d", "2mo", "1.5y". */
export function formatInterval(days: number): string {
  if (days <= 0) return 'now'
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${Math.round((days / 365) * 10) / 10}y`
}
