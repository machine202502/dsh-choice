# dsh-choice

A single-choice board inside the DeepSeek Harness chat, next to the built-in `ask_user_question`.

`ask_user_choice({ title, subtitle?, options, noneLabel? })` shows a card where every
option is **text**, an **image** or a **sound**, and waits for the user:

- **✓ pick** — the board resolves with that option;
- **✗ not this** — the option is rejected and dimmed;
- rejecting every option resolves with the rejected list;
- no answer within `timeoutSeconds` (default 600) resolves as cancelled.

The tool blocks while the card is open, so the agent receives the answer in the same turn.

## Card

Text options are rows, image options form a thumbnail grid, audio options get a native
player. Hover shows the two round actions; no download or extra buttons.

## Media

`src` may be an `http(s)` URL or an absolute local path. Local files are copied into
`%LOCALAPPDATA%\dsh-choice-board\media` and served over loopback (`127.0.0.1:49236`).

## Bridge

`GET /status`, `GET /media/<file>`, `POST /attach`, `POST /choose`, `POST /reject`.
