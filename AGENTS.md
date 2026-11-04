<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Voice upload goes through the `/api/notes` server route (multipart): verifies bearer token, enforces the free monthly limit from `src/lib/plan.ts`, transcribes, AI-tags, then inserts — so limits can't be bypassed client-side.
- Related ideas and resurfacing are computed from shared tags in `src/lib/resurface.ts` (pure, unit-tested) — keeps linking cheap and explainable; the AI is told to reuse existing tags.
- Browser records WAV via Web Audio downsampled to 16 kHz — decodable everywhere and ~12 min fits the upload cap.
