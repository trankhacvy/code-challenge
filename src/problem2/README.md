# Problem 2: Fancy Form — Currency Swap

## Why Vanilla JS?

This is a single-page form with two dropdowns, an input, and a button. React + Tailwind would work, but it's overkill here. Using vanilla JS demonstrates:

- **Fundamentals mastery** — DOM manipulation, event handling, CSS without framework abstractions
- **Zero dependencies** — opens instantly in any browser, no `npm install` or build step
- **Discipline** — writing clean, maintainable code without leaning on a library

For a multi-page app with shared state and component reuse, React would absolutely be the right call.

## Features

| Feature | Details |
|---|---|
| Token selector | Searchable modal with live icons from Switcheo's repo |
| Balance simulation | `simulateFetchBalance()` — deterministic fake balance per token, with loading skeleton |
| Quote simulation | `simulateFetchQuote()` — with realistic slippage (0.1–0.7%) |
| Debounced input | Quote API is called only after the user stops typing (300ms), avoiding unnecessary requests on every keystroke |
| Number formatting | Adapts decimal places to magnitude (handles 0.00000012 through 4,157,103) |
| Validation | Insufficient balance, missing tokens, same-token swap — shown on the button itself (Uniswap-style) |
| MAX button | Fills input with full balance |
| Swap direction | Flips tokens + moves receive amount to send input |
| Loading states | Skeleton shimmer for balance, spinner for quote, spinner on submit |
| Stale response handling | Version counter discards quote responses that arrive after a newer request was made |
| Responsive | Works on mobile (480px+) |

## How to View

Open `index.html` in a browser. That's it.

For live-reload during development:

```sh
npx serve .
```
