# Font preview: Newsreader for headings (2026-11-11, branch `design/font-preview`)

Before (left) = Gloock, after (right) = Newsreader (variable, optical sizes, weight 500), same pages, 1440×900, mocked
API: `cmp_hero.jpg`, `cmp_newarrivals.jpg` (promises band and footer), `cmp_top10.jpg`, `cmp_book.jpg`, `cmp_books.jpg`.

- Changed: `--font-display` → "Newsreader Variable" (`@fontsource-variable/newsreader`, opsz axis), headings and
  `.font-display` at 500 with optical sizing on. Body (Hanken Grotesk) and Khmer (Kantumruy Pro) unchanged.
- Gloock stays loaded only for the splash screen (index.html), which is not part of this change.
- To keep Gloock: do not merge this branch. To adopt: merge it after `design/home-refresh`; MASTER §3 then needs the
  typography table updated (I will do that on approval).
