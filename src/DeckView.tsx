import { ArrowLeft, GraduationCap, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CardForm } from './CardForm'
import { type DayKey, formatShort } from './dates'
import { type Card as FlashCard, type Deck, dueCards, isDue, newId, type Action } from './decks'
import { DeckNameDialog } from './DeckNameDialog'
import { IconButton } from './IconButton'
import { ignoreShortcut } from './keys'

type Props = {
  deck: Deck
  decks: Deck[]
  today: DayKey
  dispatch: (action: Action) => void
  onBack: () => void
  onStudy: () => void
}

function dueLabel(card: FlashCard, today: DayKey) {
  if (card.reps === 0 && card.lapses === 0 && card.interval === 0) return 'New'
  return isDue(card, today) ? 'Due today' : `Due ${formatShort(card.due)}`
}

export function DeckView({ deck, decks, today, dispatch, onBack, onStudy }: Props) {
  const front = useRef<HTMLTextAreaElement>(null)
  const [renaming, setRenaming] = useState(false)
  const [confirm, setConfirm] = useState<'reset' | 'delete' | null>(null)
  const [editing, setEditing] = useState<FlashCard | null>(null)
  const due = dueCards(deck, today).length

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (ignoreShortcut(event)) return
      if (event.key === 'n') {
        event.preventDefault()
        front.current?.focus()
      } else if (event.key === 's' && due > 0) {
        onStudy()
      } else if (event.key === 'Escape') {
        onBack()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [due, onBack, onStudy])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <IconButton label="Back to decks" onClick={onBack}>
          <ArrowLeft />
        </IconButton>
        <h2 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">{deck.name}</h2>
        <div className="flex gap-1">
          <IconButton label="Rename deck" onClick={() => setRenaming(true)}>
            <Pencil />
          </IconButton>
          <IconButton label="Reset progress" disabled={deck.cards.length === 0} onClick={() => setConfirm('reset')}>
            <RotateCcw />
          </IconButton>
          <IconButton label="Delete deck" onClick={() => setConfirm('delete')}>
            <Trash2 />
          </IconButton>
        </div>
        <Button disabled={due === 0} onClick={onStudy} className="w-full sm:w-auto">
          <GraduationCap /> Study {due > 0 && `(${due})`}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a card</CardTitle>
        </CardHeader>
        <CardContent>
          <CardForm
            frontRef={front}
            onSubmit={(f, b) => {
              dispatch({ type: 'addCard', deckId: deck.id, id: newId(), front: f, back: b, today })
              return true
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="hidden text-xs text-muted-foreground sm:block">
                <kbd className="rounded border bg-muted px-1 font-mono">Ctrl</kbd> +{' '}
                <kbd className="rounded border bg-muted px-1 font-mono">Enter</kbd> to add
              </p>
              <Button type="submit" className="ml-auto">
                <Plus /> Add card
              </Button>
            </div>
          </CardForm>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          {deck.cards.length} {deck.cards.length === 1 ? 'card' : 'cards'}
        </h3>
        {deck.cards.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No cards yet. Add the first one above.
          </p>
        ) : (
          <ul aria-label="Cards" className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
            {deck.cards.map((card) => (
              <li key={card.id} className="flex items-start gap-3 px-4 py-3">
                <div className="grid min-w-0 flex-1 gap-0.5 sm:grid-cols-2 sm:gap-4">
                  <p className="font-medium break-words">{card.front}</p>
                  <p className="break-words text-muted-foreground">{card.back}</p>
                </div>
                <Badge variant="outline" className="mt-0.5 hidden shrink-0 sm:inline-flex">
                  {dueLabel(card, today)}
                </Badge>
                <div className="-my-1 flex shrink-0">
                  <IconButton label={`Edit card ${card.front}`} size="icon-sm" onClick={() => setEditing(card)}>
                    <Pencil />
                  </IconButton>
                  <IconButton
                    label={`Delete card ${card.front}`}
                    size="icon-sm"
                    onClick={() => dispatch({ type: 'deleteCard', deckId: deck.id, cardId: card.id })}
                  >
                    <Trash2 />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DeckNameDialog
        open={renaming}
        onOpenChange={setRenaming}
        decks={decks}
        deck={deck}
        onSave={(name) => dispatch({ type: 'renameDeck', deckId: deck.id, name })}
      />

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit card</DialogTitle>
            <DialogDescription>Its review schedule stays as it is.</DialogDescription>
          </DialogHeader>
          {editing && (
            <CardForm
              initial={editing}
              onSubmit={(f, b) => {
                dispatch({ type: 'editCard', deckId: deck.id, cardId: editing.id, front: f, back: b })
                setEditing(null)
                return false
              }}
            >
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </CardForm>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === 'reset' ? 'Reset progress?' : `Delete “${deck.name}”?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'reset'
                ? 'Every card becomes new and due today. The cards themselves stay.'
                : `The deck and its ${deck.cards.length} cards are removed for good.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirm === 'reset') dispatch({ type: 'resetDeck', deckId: deck.id, today })
                else {
                  onBack()
                  dispatch({ type: 'deleteDeck', deckId: deck.id })
                }
                setConfirm(null)
              }}
            >
              {confirm === 'reset' ? 'Reset' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
