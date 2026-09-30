/** A calendar day in local time, written `YYYY-MM-DD` so keys sort and compare as strings. */
export type DayKey = string

const pad = (n: number) => String(n).padStart(2, '0')

export const toKey = (date: Date): DayKey => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export function fromKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const isDayKey = (value: unknown): value is DayKey =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && toKey(fromKey(value)) === value

/** Calendar arithmetic through Date's day overflow, so DST changes never skip or repeat a day. */
export function addDays(key: DayKey, days: number): DayKey {
  const date = fromKey(key)
  date.setDate(date.getDate() + days)
  return toKey(date)
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: DayKey, to: DayKey) =>
  Math.round((fromKey(to).getTime() - fromKey(from).getTime()) / 86_400_000)

export const formatShort = (key: DayKey) => fromKey(key).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
