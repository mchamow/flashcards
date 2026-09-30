import { GraduationCap, Layers, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { type DayKey, formatShort } from './dates'
import { type Deck, dueCards, nextDue } from './decks'

type Props = {
  decks: Deck[]
  today: DayKey
  onNew: () => void
  onOpen: (id: string) => void
  onStudy: (id: string) => void
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function DeckList({ decks, today, onNew, onOpen, onStudy }: Props) {
  if (decks.length === 0) {
    return (
      <Card className="items-center py-10 text-center">
        <Layers className="size-8 text-muted-foreground" aria-hidden />
        <CardHeader className="w-full">
          <CardTitle>No decks yet</CardTitle>
          <CardDescription>Make a deck, add a few cards, and come back each day to review.</CardDescription>
        </CardHeader>
        <Button onClick={onNew}>
          <Plus /> New deck
        </Button>
      </Card>
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2" aria-label="Decks">
      {decks.map((deck) => {
        const due = dueCards(deck, today).length
        const learned = deck.cards.filter((c) => c.reps > 0).length
        const next = nextDue(deck)
        return (
          <li key={deck.id}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="truncate">
                  <h2 className="truncate">{deck.name}</h2>
                </CardTitle>
                <CardDescription>
                  {plural(deck.cards.length, 'card')}
                  {due === 0 && next && ` · next review ${next <= today ? 'today' : formatShort(next)}`}
                </CardDescription>
                <CardAction>
                  <Badge
                    variant={due > 0 ? 'default' : 'secondary'}
                    className={due > 0 ? 'bg-amber-500 text-amber-950 dark:bg-amber-400' : undefined}
                  >
                    {due} due
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="mt-auto">
                <Progress value={deck.cards.length ? (learned / deck.cards.length) * 100 : 0} className="gap-1.5">
                  <ProgressLabel className="text-xs font-normal text-muted-foreground">Learned</ProgressLabel>
                  <ProgressValue className="text-xs">{() => `${learned} of ${deck.cards.length}`}</ProgressValue>
                </Progress>
              </CardContent>
              <CardFooter className="gap-2">
                <Button className="flex-1" disabled={due === 0} aria-label={`Study ${deck.name}`} onClick={() => onStudy(deck.id)}>
                  <GraduationCap /> Study
                </Button>
                <Button variant="outline" className="flex-1" aria-label={`Cards in ${deck.name}`} onClick={() => onOpen(deck.id)}>
                  <Layers /> Cards
                </Button>
              </CardFooter>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
