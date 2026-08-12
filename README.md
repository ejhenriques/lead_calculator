# Lead Calculator

A single-file React tool that tells you how many leads you need per month to hit a revenue goal, based on your funnel's stage-by-stage conversion rates, average deal size, and sales cycle length.

## What it does

- Set an **annual goal**, **YTD sales**, and **average deal size** — the calculator subtracts YTD from the goal to get what's still outstanding, and drives every calculation off that remaining number.
- Define your **funnel stages** (e.g. Lead → MQL → Opportunity → Close), each with its own conversion rate. Add or remove stages freely.
- See the required volume at **every stage** of the funnel, not just the top and bottom.
- Factor in your **average sales cycle** (in days): the tool shows how many leads must be active in the pipeline at once to sustain your closing pace, and roughly when today's leads would close.
- **Save, reload, and compare** multiple named scenarios side by side.
- Toggle between **dark and light** mode.

All monetary values use standard USD formatting (`$1,234.56`). Lead and deal counts are always whole numbers, rounded up.

## Running it

This is a single React component (`calculadora-leads.jsx`) built for Claude.ai's Artifacts environment (Tailwind core utility classes only, `lucide-react` icons, and a `window.storage` key-value API for persisting saved scenarios).

To use it in Claude.ai:
1. Open a conversation with Claude.
2. Paste the contents of `calculadora-leads.jsx`.
3. Ask Claude to render it as an artifact.

To adapt it for a standard React project (Vite, Next.js, etc.), you'll need to:
- Replace the `window.storage` calls in the persistence section with your own storage (e.g. `localStorage`, a database, or an API call).
- Make sure Tailwind CSS and `lucide-react` are installed and configured.

## Notes

- The file ships with generic example values only (no real business figures). Saved scenarios live in the browser's session storage for that artifact and are **not** included in this file.
- Persistence via `window.storage` only works once the artifact is published in Claude.ai or opened live in a conversation — it won't run in a plain static HTML preview.
