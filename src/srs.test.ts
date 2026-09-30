import { describe, expect, it } from 'vitest'
import { formatInterval, MIN_EASE, newSchedule, nextInterval, review, type Grade, type Schedule } from './srs'

const today = '2026-09-30'
const card = (s: Partial<Schedule> = {}): Schedule => ({ ...newSchedule(today), ...s })

describe('new cards', () => {
  it('start due today with the default ease', () => {
    expect(newSchedule(today)).toEqual({ due: today, interval: 0, ease: 2.5, reps: 0, lapses: 0 })
  })

  it('come back after 1, 2 or 4 days, or stay in the session on again', () => {
    const next = (g: Grade) => nextInterval(card(), g)
    expect([next('again'), next('hard'), next('good'), next('easy')]).toEqual([0, 1, 2, 4])
  })

  it('are scheduled from the grade', () => {
    expect(review(card(), 'good', today)).toEqual({ due: '2026-10-02', interval: 2, ease: 2.5, reps: 1, lapses: 0 })
    expect(review(card(), 'easy', today)).toMatchObject({ due: '2026-10-04', ease: 2.65 })
    expect(review(card(), 'hard', today)).toMatchObject({ due: '2026-10-01', ease: 2.35 })
  })

  it('do not count a lapse when forgotten before being learned', () => {
    expect(review(card(), 'again', today)).toEqual({ due: today, interval: 0, ease: 2.3, reps: 0, lapses: 0 })
  })
})

describe('learned cards', () => {
  const learned = card({ interval: 10, reps: 3, ease: 2.5 })

  it('grow the interval by the ease factor', () => {
    expect(nextInterval(learned, 'hard')).toBe(12)
    expect(nextInterval(learned, 'good')).toBe(25)
    expect(nextInterval(learned, 'easy')).toBe(33)
    expect(review(learned, 'good', today)).toMatchObject({ due: '2026-10-25', interval: 25, reps: 4 })
  })

  it('always grow a little, even at the lowest ease', () => {
    const low = card({ interval: 1, reps: 1, ease: MIN_EASE })
    expect(nextInterval(low, 'hard')).toBe(2)
    expect(nextInterval(low, 'good')).toBe(3)
    expect(nextInterval(low, 'easy')).toBe(4)
  })

  it('reset and count a lapse when forgotten', () => {
    expect(review(learned, 'again', today)).toEqual({ due: today, interval: 0, ease: 2.3, reps: 0, lapses: 1 })
  })

  it('never drop below the minimum ease', () => {
    let s = learned
    for (let i = 0; i < 10; i++) s = review(s, 'again', today)
    expect(s.ease).toBe(MIN_EASE)
  })
})

describe('interval labels', () => {
  it('read as now, days, months and years', () => {
    expect([0, 1, 29, 30, 75, 364, 365, 548].map(formatInterval)).toEqual(['now', '1d', '29d', '1mo', '3mo', '12mo', '1y', '1.5y'])
  })
})
