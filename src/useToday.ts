import { useEffect, useState } from 'react'
import { type DayKey, toKey } from './dates'

/** Today's key, moving on at midnight while the page stays open. */
export function useToday(): DayKey {
  const [today, setToday] = useState(() => toKey(new Date()))
  useEffect(() => {
    const id = setInterval(() => setToday(toKey(new Date())), 30_000)
    return () => clearInterval(id)
  }, [])
  return today
}
