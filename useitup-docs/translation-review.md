# Translation Fill — Morning Review

Overnight run that expanded every non-Spanish locale in [lib/translations.ts](../lib/translations.ts)
from an ~11-key stub to the full **422-key** set.

## What happened

- Branch: `i18n-fill-translations` (8 commits, one per language, off `main`).
- Languages filled: `fr`, `de`, `pt` (Brazilian), `it`, `ja`, `ko`, `zh` (Simplified), `vi`.
- Every locale verified at exactly **422 keys** (matches `en`), no missing or stray keys.
- `npx tsc --noEmit` passes after every commit.
- Each language is its own commit, so you can review or `git revert` any single one independently.

## Important: the {plural} decision (review this first)

The app hardcodes the plural marker as an English `"s"`:
`plural: count === 1 ? '' : 's'` (see [app/(tabs)/pantry.tsx](../app/(tabs)/pantry.tsx),
[app/expiring-soon.tsx](../app/expiring-soon.tsx), [app/recipe/[id].tsx](../app/recipe/[id].tsx), etc.).

That `"s"` is only correct for English and the Romance `-s` plural. So:

- **fr** — keeps `{plural}` (French `-s` plural is correct: `jour`/`jours`, `article`/`articles`).
- **pt** — keeps `{plural}` but only on regular `-s` nouns I deliberately chose (`produto`, `dia`).
  I avoided Portuguese irregular plurals (`item`→`itens`, `disponível`→`disponíveis`) by rewording.
- **de, it, ja, ko, zh, vi** — `{plural}` is **omitted entirely**. German/Italian don't pluralize
  with `-s`; CJK + Vietnamese don't inflect for number at all. Phrasing is count-agnostic instead
  (e.g. German "Artikel" is invariant, Japanese/Chinese use counters like `{count}個` / `{count} 件`).

Net effect: there is **no `{plural}` grammar bug** in the filled languages. The 5 count-bearing keys
to spot-check if you want (`itemsAddedToShoppingList`, `pantryItemsAvailable`, `withinDays`,
`foodExpiringWithinDays`, `itemsNeedAttention`) read naturally for both singular and plural counts.

## Tone choices (change if you disagree)

- **de** — informal **du** (not formal Sie). Casual consumer-app tone to match the English voice.
- **it** — informal **tu**.
- **ja / ko** — polite UI register (です・ます / 해요체).
- **fr / pt / vi / zh** — standard neutral consumer-app phrasing.

If you'd rather German/Italian be formal (Sie / Lei), it's a find-and-replace within those two
commits — tell me and I'll do it.

## Things I left as-is on purpose

- **Parser keywords stay English.** In `useValidExpirationDate` the literal tokens `today`,
  `tomorrow`, and `in 3 days` are kept in English in every locale because they're date-parser
  inputs, not display-only text. Confirm the parser doesn't accept localized words — if it does,
  these should be localized too.
- **Brand / proper nouns** — `UseItUp`, `Supabase`, `Supabase Auth` left untranslated everywhere.
- **`emailPlaceholder`** — localized the example local-part where natural (e.g. de `du@beispiel.com`,
  vi `ban@vidu.com`), kept `you@example.com` for CJK/ja/ko.

## Unrelated pre-existing gap (not from this run)

- **Spanish (`es`) is missing one key: `viewList`** (421/422). This predates this work — `es` was
  already in the repo. Quick fix: add `viewList: 'Ver lista',` to the `es` block. Say the word and
  I'll patch it.

## Suggested next steps

1. Skim 2-3 languages you read for tone (likely `fr`, `de`, `pt`).
2. Decide de/it formality (du/tu vs Sie/Lei).
3. Confirm the date-parser-keyword question above.
4. Merge `i18n-fill-translations` into `main`, or cherry-pick the languages you're ready to ship.
5. Optionally patch the `es` `viewList` gap.
