import { describe, expect, it } from 'vitest'
import { isFinished, sessionReducer, startSession } from './session'

describe('study session', () => {
  it('starts face down with every due card queued', () => {
    expect(startSession(['a', 'b'])).toEqual({ queue: ['a', 'b'], flipped: false, total: 2, reviewed: 0, again: 0 })
  })

  it('only takes an answer once the card is flipped', () => {
    const s = startSession(['a', 'b'])
    expect(sessionReducer(s, { type: 'answer', grade: 'good' })).toBe(s)
    const flipped = sessionReducer(s, { type: 'flip' })
    expect(flipped.flipped).toBe(true)
    expect(sessionReducer(flipped, { type: 'flip' }).flipped).toBe(false)
    expect(sessionReducer(flipped, { type: 'answer', grade: 'good' })).toMatchObject({ queue: ['b'], flipped: false, reviewed: 1 })
  })

  it('sends forgotten cards to the back of the queue', () => {
    let s = sessionReducer(startSession(['a', 'b']), { type: 'flip' })
    s = sessionReducer(s, { type: 'answer', grade: 'again' })
    expect(s).toMatchObject({ queue: ['b', 'a'], reviewed: 1, again: 1 })
    for (const grade of ['good', 'hard'] as const) {
      s = sessionReducer(sessionReducer(s, { type: 'flip' }), { type: 'answer', grade })
    }
    expect(isFinished(s)).toBe(true)
    expect(s).toMatchObject({ total: 2, reviewed: 3, again: 1 })
  })

  it('ignores input once finished', () => {
    const done = startSession([])
    expect(isFinished(done)).toBe(true)
    expect(sessionReducer(done, { type: 'flip' })).toBe(done)
  })
})
