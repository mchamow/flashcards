import { ArrowLeft, PartyPopper } from 'lucide-react'
import { useEffect, useReducer, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { type DayKey, formatShort } from './dates'
import { type Deck, dueCards, nextDue } from './decks'
import { IconButton } from './IconButton'
import { ignoreShortcut } from './keys'
import { isFinished, sessionReducer, startSession } from './session'
import { formatInterval, type Grade, GRADES, nextInterval } from './srs'

type Props = {
  deck: Deck
  today: DayKey
  onGrade: (cardId: string, grade: Grade) => void
  onExit: () => void
}

const GRADE_STYLE: Record<Grade, { label: string; className: string }> = {
  again: { label: 'Again', className: 'text-rose-700 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-300 border-rose-500/40 dark:border-rose-400/30 hover:bg-rose-500/10 dark:hover:bg-rose-500/15' },
  hard: { label: 'Hard', className: 'text-amber-700 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-300 border-amber-500/40 dark:border-amber-400/30 hover:bg-amber-500/10 dark:hover:bg-amber-500/15' },
  good: { label: 'Good', className: 'text-emerald-700 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-300 border-emerald-500/40 dark:border-emerald-400/30 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15' },
  easy: { label: 'Easy', className: 'text-sky-700 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-300 border-sky-500/40 dark:border-sky-400/30 hover:bg-sky-500/10 dark:hover:bg-sky-500/15' },
}

const Kbd = ({ children }: { children: string }) => (
  <kbd aria-hidden className="hidden rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground sm:inline">
    {children}
  </kbd>
)

export function Study({ deck, today, onGrade, onExit }: Props) {
  // The queue is fixed when the session starts; cards answered "again" are due today and come round again.
  const [session, send] = useReducer(sessionReducer, undefined, () => startSession(dueCards(deck, today).map((c) => c.id)))
  const done = isFinished(session)
  const card = done ? undefined : deck.cards.find((c) => c.id === session.queue[0])
  const backButton = useRef<HTMLButtonElement>(null)

  const answer = (grade: Grade) => {
    if (!card || !session.flipped) return
    onGrade(card.id, grade)
    send({ type: 'answer', grade })
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (ignoreShortcut(event)) return
      if (event.key === 'Escape') return onExit()
      if (done) return
      const onButton = event.target instanceof HTMLButtonElement
      if ((event.key === ' ' || event.key === 'Enter') && !onButton) {
        event.preventDefault()
        send({ type: 'flip' })
      } else if (/^[1-4]$/.test(event.key)) {
        answer(GRADES[Number(event.key) - 1])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => {
    if (done) backButton.current?.focus()
  }, [done])

  const remaining = session.queue.length
  const next = nextDue(deck)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <IconButton label="End session" onClick={onExit}>
          <ArrowLeft />
        </IconButton>
        <h2 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">{deck.name}</h2>
        <p className="text-sm text-muted-foreground tabular-nums" data-testid="remaining">
          {remaining} left
        </p>
      </div>
      <Progress value={session.total ? ((session.total - remaining) / session.total) * 100 : 100} aria-label="Session progress" />

      {done ? (
        <Card className="items-center gap-3 py-10 text-center" role="status">
          <PartyPopper className="size-10 text-amber-500" aria-hidden />
          <h3 className="text-lg font-semibold">Session complete</h3>
          <p className="max-w-xs text-muted-foreground">
            You reviewed {session.reviewed} {session.reviewed === 1 ? 'card' : 'cards'}
            {session.again > 0 && `, ${session.again} needed another go`}.
            {next && next > today && ` Next review ${formatShort(next)}.`}
          </p>
          <Button ref={backButton} onClick={onExit} className="mt-2">
            Back to decks
          </Button>
        </Card>
      ) : card ? (
        <>
          <Card className="min-h-64 justify-center" aria-label="Flashcard" role="region">
            <CardContent className="flex flex-col items-center gap-5 text-center">
              <p className="text-2xl font-medium break-words text-balance" data-testid="front">
                {card.front}
              </p>
              {session.flipped && (
                <>
                  <Separator className="max-w-48" />
                  <p
                    className="text-xl break-words text-balance text-emerald-700 duration-200 animate-in fade-in slide-in-from-bottom-1 dark:text-emerald-300"
                    data-testid="back"
                  >
                    {card.back}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {session.flipped ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="How well did you know it?">
              {GRADES.map((grade, i) => {
                const { label, className } = GRADE_STYLE[grade]
                const interval = formatInterval(nextInterval(card, grade))
                return (
                  <Button
                    key={grade}
                    variant="outline"
                    aria-label={`${label}, next in ${interval}`}
                    onClick={() => answer(grade)}
                    className={cn('h-auto flex-col gap-0.5 py-2', className)}
                  >
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Kbd>{String(i + 1)}</Kbd> {label}
                    </span>
                    <span className="text-xs opacity-80">{interval}</span>
                  </Button>
                )
              })}
            </div>
          ) : (
            <Button size="lg" className="h-11" onClick={() => send({ type: 'flip' })}>
              Show answer <Kbd>Space</Kbd>
            </Button>
          )}
        </>
      ) : null}
    </div>
  )
}
