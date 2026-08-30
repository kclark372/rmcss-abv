# CLAUDE.md

Next.js app with two public forms that create records in the FileMaker file
`RMCSS__DEV` over the Data API.

## Shape

- `app/page.tsx` — the whole checkup. `components/assessment-flow.tsx` runs it as
  a three-step state machine: assessment → meeting → done. Pressing "Staff Zone"
  on the assessment's last step saves the RSA record and goes straight to the
  meeting. The assessment UUID linking the two records is held in memory and
  never shown, typed, or put in the URL.
- `app/rmc/page.tsx` — the meeting form on its own, for picking a meeting up
  later by assessment ID.
- `app/actions/*.ts` — the only code that talks to FileMaker. Server actions, so
  credentials never reach the browser.
- `lib/fm/` — the Data API client, types, and value formatting.
- `lib/schemas/` — zod schemas plus the question and option definitions.
- `components/ui.tsx` — the shared primitives. Build forms from these rather than
  writing class lists inline, so both forms stay consistent.

## FileMaker

Three tables, each with a layout of the same name. The Data API can only read or
write fields **present on the layout**, so adding a field in FileMaker is not
enough — it has to be on the layout too, or writes fail with error 102.

| Layout | Holds | Links via |
| --- | --- | --- |
| `abv_RSA` | the self-assessment | — |
| `abv_RMC` | the meeting | `_UUID_RSA` → `abv_RSA::__UUID` |
| `abv_tx` | the treatment referral | `_UUID_RMC` → `abv_RMC::__UUID` |

Things that will bite you:

- **Field names differ from the old HTML forms.** It is `important`, `confident`
  and `recording` on `abv_RMC` — not `importance`, `confidence`, `record`.
- **"Your name" (staff) is `name_pref_full_staff`**, not `XSID`, on all three
  layouts. The code calls it `staffName` internally.
- **`abv_RSA` has no `s8z_none`.** Section 8 therefore has no "none of these"
  option. Add the field and put it on the layout before adding one.
- **`discuss_te` must be on the `abv_RSA` layout.** The self-assessment's
  "anything else you'd like to discuss?" step writes it; the RMC form reads it
  back and also copies it to `abv_RMC::RSA_discuss_te`. If it is not on the
  `abv_RSA` layout, every RSA create fails with error 102.
- **`abv_tx::__UUID` has no auto-enter**, unlike the other two, so the server
  action supplies it.
- **`abv_tx` has two agency pairs.** This app writes the newer `ref_agency` /
  `ref_agency_details` and leaves `_agency` / `agency_details` alone. Confirm
  that is what the file expects before relying on it.
- **Dates and times.** Requests use the Data API default (`dateformats` 0, US),
  so real date/time/timestamp fields need `MM/DD/YYYY` and `HH:MM:SS` — see
  `lib/fm/format.ts`. `XADT` on `abv_RSA` and every date/time on `abv_tx` are
  *text* fields, so ISO values are stored verbatim.
- **Checkboxes** are text fields holding `"1"` / `"0"`, not FileMaker checkbox
  sets.

## Working on it

```bash
npm run dev        # http://localhost:3000
npm run build      # also typechecks
npm run typecheck
```

Needs `.env` (see `.env.example`). To re-check the schema against the live file,
use the ProofKit MCP: `table_metadata`, `layout_metadata` for a layout's real
field list, and `get_filemaker_ddl_schema`.
