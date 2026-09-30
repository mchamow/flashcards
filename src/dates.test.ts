import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, formatShort, fromKey, isDayKey, toKey } from './dates'

describe('day keys', () => {
  it('round-trips local dates', () => {
    expect(toKey(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30')
    expect(toKey(fromKey('2026-01-05'))).toBe('2026-01-05')
  })

  it('rejects things that are not real days', () => {
    expect(isDayKey('2026-02-30')).toBe(false)
    expect(isDayKey('2026-9-1')).toBe(false)
    expect(isDayKey(20260901)).toBe(false)
    expect(isDayKey('2026-02-28')).toBe(true)
  })

  it('adds days across months, years and the DST change', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('counts whole days between keys, DST included', () => {
    expect(daysBetween('2026-09-30', '2026-10-06')).toBe(6)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-06', '2026-09-30')).toBe(-6)
  })

  it('formats short labels', () => {
    expect(formatShort('2026-10-06')).toBe('6 Oct')
  })
})
