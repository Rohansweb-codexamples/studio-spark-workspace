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

## Architecture
- Signed-in pages live under `src/routes/_authenticated/` (client-only guard) — keeps auth checks in one layout.
- Deployed sites are stored as rows in `site_files` and rendered at `/s/$slug` by inlining CSS/JS into a sandboxed iframe (`src/lib/site-bundle.ts`) — no separate hosting needed.
