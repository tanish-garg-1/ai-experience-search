# Discover: AI experience search

**Live demo:** https://ai-experience-search.vercel.app

Search travel experiences in plain English ("relaxing half-day thing in Bali under $80"). Claude turns the request into structured filters you can see and edit. Then check live availability in a keyboard-accessible calendar and hold a booking.

## Features

- **AI query → filters.** `/api/parse` calls Claude with a Zod schema (structured outputs), so the model can only return valid categories, cities, prices and sort orders. The result becomes editable filter chips. Without an API key it falls back to an offline rule-based parser.
- **Race-safe autosuggest.** Input is debounced (250 ms). Each request cancels the previous one with `AbortController` and carries a sequence id, so a slow old response can never overwrite a newer one. The API adds random latency on purpose to prove this (`src/lib/async.ts`).
- **URL as the source of truth.** Every filter is in the query string, so results are shareable and survive a reload. Invalid URL values are validated and dropped (`src/lib/filters.ts`).
- **Virtualized infinite scroll.** Pages of 40 load as you scroll, but only about 17 rows are in the DOM at any time (`@tanstack/react-virtual`).
- **Every state handled.** Loading skeletons, stale results dimmed while refetching, error with retry, empty with "clear filters", and inline validation (min price above max).
- **Availability widget.** Month navigation, per-day status (available, few spots, sold out), a guest count capped at the spots left, arrow-key grid navigation that crosses month boundaries, focus trap and restore, and Escape to close.
- **Tests.** Vitest covers out-of-order responses, abort behaviour, `setInterval` built on `setTimeout`, URL round-tripping and the parser.

## Run

```bash
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY for Claude parsing
npm run dev
npm test
```

## Structure

```
src/app/api/{search,suggest,parse,availability}/route.ts   mock backend + AI endpoint
src/lib/async.ts          latest-request guard, customSetInterval
src/lib/filters.ts        URL <-> filters, filtering and sorting
src/lib/aiParse.ts        Claude structured-output parser (server only)
src/lib/nlParse.ts        offline fallback parser
src/components/           SearchApp, AskAI, SearchBox, FilterPanel, ResultsList, AvailabilityWidget
```
