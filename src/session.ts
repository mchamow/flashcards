import type { Grade } from './srs'

/** One sitting with a deck: the cards still to show, in order, and a tally of the answers. */
export type Session = {
  queue: string[]
  flipped: boolean
  total: number
  reviewed: number
  again: number
}

export type SessionAction = { type: 'flip' } | { type: 'answer'; grade: Grade }

export const startSession = (cardIds: string[]): Session => ({
  queue: cardIds,
  flipped: false,
  total: cardIds.length,
  reviewed: 0,
  again: 0,
})

export const isFinished = (session: Session) => session.queue.length === 0

/** Cards answered "again" go to the back of the queue and come round once more before the session ends. */
export function sessionReducer(session: Session, action: SessionAction): Session {
  if (action.type === 'flip') return isFinished(session) ? session : { ...session, flipped: !session.flipped }
  if (!session.flipped || isFinished(session)) return session
  const [current, ...rest] = session.queue
  const again = action.grade === 'again'
  return {
    ...session,
    queue: again ? [...rest, current] : rest,
    flipped: false,
    reviewed: session.reviewed + 1,
    again: session.again + (again ? 1 : 0),
  }
}
