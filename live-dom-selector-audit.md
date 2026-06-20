---
date: 2026-06-19 23:20:51 PDT
ver: 1.0.0
author: codex
model: gpt-5-codex
tags: [datakiln, dom, selectors, gemini, perplexity, youtube, workflow, verification]
---
# Live DOM Selector Audit

## Conclusion

Verified live selectors:

- Gemini prompt input: `rich-textarea [contenteditable='true']`
- Gemini input fallbacks: `[contenteditable='true']`, `[role='textbox']`
- Gemini send button after fill: `button[aria-label*='Send']`
- Perplexity prompt input: `[contenteditable='true']`
- Perplexity input fallbacks: `[role='textbox']`, `[data-lexical-editor='true']`, `textarea`
- Perplexity submit button after fill: `button[aria-label*='Submit']`

Rejected stale selectors:

- Gemini `input[name='q']`: verified `0` matches on `https://gemini.google.com/app`
- Gemini `input[type='text']`: verified `0` matches
- Gemini `input[value='Google Search']`: obsolete Google Search-era control
- Perplexity `textarea[data-testid='search-input']`: verified `0` matches
- Perplexity `button[data-testid='send-button']`: verified `0` matches before fill; retained only as fallback

Unavailable live:

- `https://youtubetranscript.com/transcript?...`: verified `404 Not Found`
- `https://youtubetotranscript.com/transcript?video_id=...`: blocked by Cloudflare challenge during headless verification

## Evidence

Generated reports:

- `/tmp/datakiln-live-dom-selector-report.json`
- `/tmp/datakiln-live-dom-interaction-report.json`

Gemini passive probe:

- `rich-textarea`: `1`
- `rich-textarea [contenteditable='true']`: `2`
- `[contenteditable='true']`: `2`
- `input[type='text']`: `0`
- `input[name='q']`: `0`

Gemini interaction probe after harmless fill:

- `button[aria-label*='Send']`: `1`, visible `1`
- observed button label: `Send message`
- `mat-icon[fonticon='send']`: `0`

Perplexity passive probe:

- `[contenteditable='true']`: `1`
- `[role='textbox']`: `1`
- `[data-lexical-editor='true']`: `1`
- `div[contenteditable='true']`: `1`
- `textarea[data-testid='search-input']`: `0`

Perplexity interaction probe after harmless fill:

- `button[aria-label*='Submit']`: `1`, visible `1`
- observed button label: `Submit`
- `button[data-testid='send-button']`: `0`

## Applied Changes

- Executor DOM actions now support `fallback_targets` / `fallback_selectors`.
- Gemini deep research default sequence now uses `https://gemini.google.com/app`, live prompt selectors, live send selector, and capture fallbacks.
- Perplexity Pro Search is now a registered schema/executor node: `dom.perplexity.pro_search`.
- Perplexity Pro Search template now includes an executable DOM sequence.
- Root and backend selector registries now use live Gemini/Perplexity selectors as primaries.

## Remaining Risk

Live provider submission was not clicked. The probes intentionally stop before sending prompts to avoid external model calls and session side effects. Full end-to-end provider verification still requires an authenticated browser/session and explicit approval to run live prompts.
