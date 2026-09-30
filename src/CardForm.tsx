import { useId, useState, type FormEvent, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cardProblem, MAX_SIDE } from './decks'

type Props = {
  initial?: { front: string; back: string }
  frontRef?: Ref<HTMLTextAreaElement>
  /** Called with valid text; return true to clear the form for the next card. */
  onSubmit: (front: string, back: string) => boolean
  children: ReactNode
}

/** Front and back fields; Ctrl/⌘+Enter submits from either. The buttons come in as children. */
export function CardForm({ initial, frontRef, onSubmit, children }: Props) {
  const id = useId()
  const [front, setFront] = useState(initial?.front ?? '')
  const [back, setBack] = useState(initial?.back ?? '')
  const [error, setError] = useState<string | null>(null)

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const problem = cardProblem(front, back)
    if (problem) return setError(problem)
    if (onSubmit(front, back)) {
      setFront('')
      setBack('')
      if (frontRef && 'current' in frontRef) frontRef.current?.focus()
    }
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit()
  }

  const field = (name: 'Front' | 'Back', value: string, set: (v: string) => void, ref?: Ref<HTMLTextAreaElement>) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`${id}-${name}`}>{name}</Label>
      <Textarea
        id={`${id}-${name}`}
        ref={ref}
        value={value}
        rows={2}
        maxLength={MAX_SIDE}
        placeholder={name === 'Front' ? 'Question, word or prompt' : 'Answer'}
        aria-invalid={error && !value.trim() ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          set(e.target.value)
          setError(null)
        }}
        className="min-h-16 resize-y"
      />
    </div>
  )

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {field('Front', front, setFront, frontRef)}
        {field('Back', back, setBack)}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {children}
    </form>
  )
}
