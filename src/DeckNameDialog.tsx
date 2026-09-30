import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type Deck, deckNameProblem, MAX_NAME } from './decks'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  decks: Deck[]
  /** The deck being renamed; a new deck when absent. */
  deck?: Deck
  onSave: (name: string) => void
}

export function DeckNameDialog({ open, onOpenChange, decks, deck, onSave }: Props) {
  const id = useId()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const change = (next: boolean) => {
    if (next) {
      setName(deck?.name ?? '')
      setError(null)
    }
    onOpenChange(next)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const problem = deckNameProblem(name, decks, deck?.id)
    if (problem) return setError(problem)
    onSave(name)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{deck ? 'Rename deck' : 'New deck'}</DialogTitle>
            <DialogDescription>{deck ? 'Cards and progress stay as they are.' : 'Give it a name, then add cards.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-name`}>Deck name</Label>
            <Input
              id={`${id}-name`}
              value={name}
              maxLength={MAX_NAME}
              placeholder="e.g. Spanish verbs"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
            />
            {error && (
              <p id={`${id}-error`} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit">{deck ? 'Save' : 'Create deck'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
