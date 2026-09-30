import { Download, Plus, Upload } from 'lucide-react'
import { useCallback, useEffect, useReducer, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DeckList } from './DeckList'
import { DeckNameDialog } from './DeckNameDialog'
import { DeckView } from './DeckView'
import { decksReducer, dueCards, newId } from './decks'
import { IconButton } from './IconButton'
import { ignoreShortcut } from './keys'
import { exportJson, importJson, loadDecks, saveDecks } from './storage'
import { Study } from './Study'
import { useToday } from './useToday'

type View = { name: 'home' } | { name: 'deck' | 'study'; deckId: string }
type Notice = { kind: 'ok' | 'error'; text: string }

export default function App() {
  const today = useToday()
  const [decks, dispatch] = useReducer(decksReducer, undefined, () => loadDecks(today))
  const [view, setView] = useState<View>({ name: 'home' })
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => saveDecks(decks), [decks])

  const deck = view.name === 'home' ? undefined : decks.find((d) => d.id === view.deckId)
  const go = useCallback((next: View) => {
    setView(next)
    setNotice(null)
  }, [])
  const home = useCallback(() => go({ name: 'home' }), [go])
  const totalDue = decks.reduce((n, d) => n + dueCards(d, today).length, 0)

  useEffect(() => {
    if (view.name !== 'home') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (ignoreShortcut(event) || event.key !== 'n') return
      event.preventDefault()
      setCreating(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [view.name])

  const exportDecks = () => {
    const url = URL.createObjectURL(new Blob([exportJson(decks)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `flashcards-${today}.json`
    link.click()
    URL.revokeObjectURL(url)
    setNotice({ kind: 'ok', text: `Exported ${decks.length} ${decks.length === 1 ? 'deck' : 'decks'}.` })
  }

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const imported = importJson(await file.text(), today, decks)
      dispatch({ type: 'import', decks: imported })
      go({ name: 'home' })
      const cards = imported.reduce((n, d) => n + d.cards.length, 0)
      setNotice({
        kind: 'ok',
        text: `Imported ${imported.length} ${imported.length === 1 ? 'deck' : 'decks'} with ${cards} ${cards === 1 ? 'card' : 'cards'}.`,
      })
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not import that file.' })
    }
  }

  return (
    <TooltipProvider>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Flashcards</h1>
            <p className="text-sm text-muted-foreground" data-testid="total-due">
              {totalDue === 0 ? 'All caught up for today' : `${totalDue} ${totalDue === 1 ? 'card' : 'cards'} due today`}
            </p>
          </div>
          {view.name === 'home' && (
            <div className="flex items-center gap-1">
              <IconButton label="Import decks" onClick={() => fileInput.current?.click()}>
                <Upload />
              </IconButton>
              <IconButton label="Export decks" disabled={decks.length === 0} onClick={exportDecks}>
                <Download />
              </IconButton>
              <Button onClick={() => setCreating(true)} className="ml-1">
                <Plus /> New deck
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                aria-label="Import file"
                className="hidden"
                onChange={importFile}
              />
            </div>
          )}
        </header>

        {notice && view.name === 'home' && (
          <p
            role={notice.kind === 'error' ? 'alert' : 'status'}
            className={
              notice.kind === 'error'
                ? 'rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive'
                : 'rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300'
            }
          >
            {notice.text}
          </p>
        )}

        {view.name === 'study' && deck ? (
          <Study
            key={deck.id}
            deck={deck}
            today={today}
            onGrade={(cardId, grade) => dispatch({ type: 'review', deckId: deck.id, cardId, grade, today })}
            onExit={home}
          />
        ) : view.name === 'deck' && deck ? (
          <DeckView
            deck={deck}
            decks={decks}
            today={today}
            dispatch={dispatch}
            onBack={home}
            onStudy={() => go({ name: 'study', deckId: deck.id })}
          />
        ) : (
          <DeckList
            decks={decks}
            today={today}
            onNew={() => setCreating(true)}
            onOpen={(deckId) => go({ name: 'deck', deckId })}
            onStudy={(deckId) => go({ name: 'study', deckId })}
          />
        )}

        {view.name === 'home' && decks.length > 0 && (
          <p className="hidden text-center text-xs text-muted-foreground sm:block">
            Press <kbd className="rounded border bg-muted px-1 font-mono">N</kbd> for a new deck. While studying:{' '}
            <kbd className="rounded border bg-muted px-1 font-mono">Space</kbd> flips,{' '}
            <kbd className="rounded border bg-muted px-1 font-mono">1</kbd>–<kbd className="rounded border bg-muted px-1 font-mono">4</kbd> grade.
          </p>
        )}

        <DeckNameDialog
          open={creating}
          onOpenChange={setCreating}
          decks={decks}
          onSave={(name) => {
            const id = newId()
            dispatch({ type: 'addDeck', id, name })
            go({ name: 'deck', deckId: id })
          }}
        />
      </main>
    </TooltipProvider>
  )
}
