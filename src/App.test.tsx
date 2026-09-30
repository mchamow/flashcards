import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEY } from './storage'

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 8, 30, 12))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const click = (name: string | RegExp) => fireEvent.click(button(name))
const key = (k: string, opts: KeyboardEventInit = {}) => fireEvent.keyDown(window, { key: k, ...opts })
const totalDue = () => screen.getByTestId('total-due').textContent
const remaining = () => screen.getByTestId('remaining').textContent
const front = () => screen.getByTestId('front').textContent
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!)
const deckCard = (name: string) => screen.getByRole('heading', { name }).closest('li')!
const cardRows = () => within(screen.getByRole('list', { name: 'Cards' })).queryAllByRole('listitem')

function createDeck(name: string) {
  click('New deck')
  fireEvent.change(screen.getByRole('textbox', { name: 'Deck name' }), { target: { value: name } })
  click('Create deck')
}

function addCard(f: string, b: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Front' }), { target: { value: f } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Back' }), { target: { value: b } })
  click('Add card')
}

describe('first visit', () => {
  it('starts with a sample deck that is due today', () => {
    render(<App />)
    expect(totalDue()).toBe('6 cards due today')
    expect(within(deckCard('World capitals')).getByText('6 due')).toBeTruthy()
    expect(within(deckCard('World capitals')).getByText('6 cards')).toBeTruthy()
    expect(within(deckCard('World capitals')).getByText('0 of 6')).toBeTruthy()
  })

  it('falls back to the sample deck when saved data is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{"oops"')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'World capitals' })).toBeTruthy()
  })
})

describe('studying', () => {
  it('shows the front, reveals the back, and schedules by grade', () => {
    render(<App />)
    click('Study World capitals')
    expect(front()).toBe('Capital of Australia')
    expect(screen.queryByTestId('back')).toBeNull()
    expect(remaining()).toBe('6 left')

    click(/Show answer/)
    expect(screen.getByTestId('back').textContent).toBe('Canberra')
    const grades = within(screen.getByRole('group', { name: 'How well did you know it?' })).getAllByRole('button')
    expect(grades.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Again, next in now',
      'Hard, next in 1d',
      'Good, next in 2d',
      'Easy, next in 4d',
    ])

    click('Good, next in 2d')
    expect(front()).toBe('Capital of Canada')
    expect(remaining()).toBe('5 left')
    expect(saved()[0].cards[0]).toMatchObject({ due: '2026-10-02', interval: 2, reps: 1 })
  })

  it('works from the keyboard and brings forgotten cards back', () => {
    render(<App />)
    click('Study World capitals')
    key('1') // not flipped yet: ignored
    expect(remaining()).toBe('6 left')
    key(' ')
    expect(screen.getByTestId('back')).toBeTruthy()
    key('1') // again
    expect(remaining()).toBe('6 left')
    expect(front()).toBe('Capital of Canada')
    for (let i = 0; i < 5; i++) {
      key(' ')
      key('3')
    }
    expect(front()).toBe('Capital of Australia')
    key('Enter')
    key('4')
    expect(screen.getByRole('status').textContent).toMatch(/Session complete.*reviewed 7 cards, 1 needed another go\. Next review 2 Oct\./)
    expect(button('Back to decks')).toBe(document.activeElement)
    click('Back to decks')
    expect(totalDue()).toBe('All caught up for today')
    expect(within(deckCard('World capitals')).getByText('6 cards · next review 2 Oct')).toBeTruthy()
    expect(within(deckCard('World capitals')).getByText('6 of 6')).toBeTruthy()
    expect(button('Study World capitals')).toHaveProperty('disabled', true)
  })

  it('leaves the session with Escape, keeping answers so far', () => {
    render(<App />)
    click('Study World capitals')
    key(' ')
    key('4')
    key('Escape')
    expect(totalDue()).toBe('5 cards due today')
  })

  it('remembers progress across reloads', () => {
    const { unmount } = render(<App />)
    click('Study World capitals')
    key(' ')
    key('3')
    unmount()
    render(<App />)
    expect(totalDue()).toBe('5 cards due today')
  })

  it('makes cards due again as the days pass', () => {
    const { unmount } = render(<App />)
    click('Study World capitals')
    for (let i = 0; i < 6; i++) {
      key(' ')
      key('3')
    }
    unmount()
    vi.setSystemTime(new Date(2026, 9, 2, 9))
    render(<App />)
    expect(totalDue()).toBe('6 cards due today')
  })
})

describe('decks and cards', () => {
  it('creates a deck, refusing a duplicate name', () => {
    render(<App />)
    createDeck('world CAPITALS')
    expect(screen.getByText('There is already a deck with that name.')).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: 'Deck name' }), { target: { value: 'Spanish' } })
    click('Create deck')
    expect(screen.getByRole('heading', { name: 'Spanish', level: 2 })).toBeTruthy()
    expect(screen.getByText('No cards yet. Add the first one above.')).toBeTruthy()
  })

  it('opens the new deck dialog with N', () => {
    render(<App />)
    key('n')
    expect(screen.getByRole('dialog', { name: 'New deck' })).toBeTruthy()
  })

  it('adds cards, needing both sides, and with Ctrl+Enter', () => {
    render(<App />)
    createDeck('Spanish')
    addCard('gato', ' ')
    expect(screen.getByRole('alert').textContent).toBe('Both sides need some text.')
    addCard('gato', 'cat')
    expect(cardRows()).toHaveLength(1)
    expect(screen.getByRole('textbox', { name: 'Front' })).toHaveProperty('value', '')
    fireEvent.change(screen.getByRole('textbox', { name: 'Front' }), { target: { value: 'perro' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Back' }), { target: { value: 'dog' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Back' }), { key: 'Enter', ctrlKey: true })
    expect(cardRows().map((r) => r.textContent)).toEqual(['gatocatNew', 'perrodogNew'])
    expect(button('Study (2)')).toBeTruthy()
    click('Back to decks')
    expect(totalDue()).toBe('8 cards due today')
  })

  it('edits and deletes cards', () => {
    render(<App />)
    click('Cards in World capitals')
    click('Edit card Capital of Peru')
    const dialog = screen.getByRole('dialog', { name: 'Edit card' })
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Back' }), { target: { value: 'Lima (on the coast)' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Lima (on the coast)')).toBeTruthy()
    click('Delete card Capital of Japan')
    expect(cardRows()).toHaveLength(5)
    expect(saved()[0].cards.map((c: { back: string }) => c.back)).toContain('Lima (on the coast)')
  })

  it('renames, resets and deletes a deck', () => {
    render(<App />)
    click('Study World capitals')
    key(' ')
    key('3')
    key('Escape')
    click('Cards in World capitals')
    expect(cardRows()[0].textContent).toContain('Due 2 Oct')

    click('Rename deck')
    fireEvent.change(screen.getByRole('textbox', { name: 'Deck name' }), { target: { value: 'Capitals' } })
    click('Save')
    expect(screen.getByRole('heading', { name: 'Capitals', level: 2 })).toBeTruthy()

    click('Reset progress')
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Reset' }))
    expect(cardRows()[0].textContent).toContain('New')

    click('Delete deck')
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))
    expect(screen.getByText('No decks yet')).toBeTruthy()
    expect(saved()).toEqual([])
  })
})

describe('import and export', () => {
  const upload = async (text: string) => {
    const file = new File([text], 'decks.json', { type: 'application/json' })
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Import file'), { target: { files: [file] } })
    })
  }

  it('exports every deck as a JSON download', async () => {
    let blob: Blob | undefined
    URL.createObjectURL = vi.fn((b: Blob) => ((blob = b), 'blob:x'))
    URL.revokeObjectURL = vi.fn()
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<App />)
    click('Export decks')
    expect(clicked).toHaveBeenCalled()
    const data = JSON.parse(await blob!.text())
    expect(data).toMatchObject({ format: 'flashcards', version: 1 })
    expect(data.decks[0].cards).toHaveLength(6)
    expect(screen.getByRole('status').textContent).toBe('Exported 1 deck.')
  })

  it('imports decks from a file, renaming clashes', async () => {
    render(<App />)
    await upload(JSON.stringify({ decks: [{ name: 'World capitals', cards: [{ front: 'Capital of Chile', back: 'Santiago' }] }] }))
    expect(screen.getByRole('status').textContent).toBe('Imported 1 deck with 1 card.')
    expect(screen.getByRole('heading', { name: 'World capitals 2' })).toBeTruthy()
    expect(totalDue()).toBe('7 cards due today')
  })

  it('explains a file it cannot read', async () => {
    render(<App />)
    await upload('not json')
    expect(screen.getByRole('alert').textContent).toBe('That file is not valid JSON.')
  })
})
