# 🗂️ Flashcards

[![Test and deploy](https://github.com/mchamow/flashcards/actions/workflows/deploy.yml/badge.svg)](https://github.com/mchamow/flashcards/actions/workflows/deploy.yml)

**Day 13 of [100 Days of React](https://github.com/mchamow?tab=repositories)**: Spaced-repetition flashcards that schedule reviews with SM-2.

**Live demo:** https://mchamow.github.io/flashcards/

## Features

- **Decks**: create, rename, reset progress and delete (with confirmation). Each deck shows its card count, how many cards are **due today**, when the next review is, and how many cards are learned
- **Cards**: add with front and back fields (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> adds and keeps you typing), edit without losing the schedule, delete. Each card shows whether it's new or when it's due
- **Study sessions** of the deck's due cards: see the front, reveal the answer, then grade it **Again / Hard / Good / Easy**. Each button shows when the card will come back (`now`, `2d`, `3mo`, …). Cards you forget go to the back of the queue and come round again before the session ends, which closes with a summary
- **Scheduling** in the style of SM-2: new cards come back after 1, 2 or 4 days; after that intervals grow by each card's ease factor, which Hard and Again lower and Easy raises
- **Import / export** every deck as JSON. Importing adds copies (clashing names become "Spanish 2"), keeps review progress, and explains files it can't use
- Keyboard: <kbd>Space</kbd> / <kbd>Enter</kbd> flip, <kbd>1</kbd>–<kbd>4</kbd> grade, <kbd>Esc</kbd> ends the session; <kbd>N</kbd> new deck (or focuses the new card's front in a deck), <kbd>S</kbd> studies the open deck
- Starts with a small sample deck of world capitals. Everything is saved to `localStorage`; unreadable data falls back to the sample deck, and cards with a broken schedule start over as new
- Light and dark themes (following the system), and a layout that works on a 360px phone

## Tech

React 19 · TypeScript · Vite · Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (Base UI) · lucide icons · Vitest + Testing Library · deployed to GitHub Pages with GitHub Actions.

The scheduler is a pure function in [`src/srs.ts`](src/srs.ts) that maps a card's schedule and a grade to the next schedule. Decks live in a reducer ([`src/decks.ts`](src/decks.ts)) that also validates untrusted JSON for both `localStorage` and imports. A study session is its own small reducer ([`src/session.ts`](src/session.ts)): a fixed queue of card ids, with forgotten cards moved to the back. Due dates are local calendar days (`YYYY-MM-DD`), so "due today" doesn't depend on the time of day.

## Run locally

```bash
pnpm install
pnpm dev
pnpm test   # 57 unit and component tests (Vitest)
```
