# RMCSS ABV Forms

Two forms for the Recovery Management Checkup study, writing to FileMaker.

1. **Self-assessment (RSA)** — the participant answers eight sections about
   substance use, consequences, help received, reasons to change, thoughts about
   treatment, barriers, legal status and housing.
2. **RMC meeting** — staff go through those answers with the participant, set a
   goal, rate importance and confidence, and record a treatment referral.

Submitting creates one record per form: `abv_RSA`, then `abv_RMC`, plus a child
`abv_tx` record when the participant wants a referral.

## How it runs

Everything happens on one device at `/`. The participant fills in the
assessment, a screen asks them to hand the tablet back, and staff continue
straight into the meeting form with the assessment already loaded. Nobody types
or sees a record ID, and nobody has to navigate anywhere.

`/rmc` opens the meeting form on its own, for when the meeting happens later
than the assessment; it asks for the assessment ID.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Value |
| --- | --- |
| `FM_SERVER_URL` | Server origin, e.g. `https://fms.example.com` |
| `FM_DATABASE` | Hosted file name, without `.fmp12` |
| `FM_API_USERNAME` | FileMaker account |
| `FM_API_PASSWORD` | Its password |

The account's privilege set needs the **fmrest** extended privilege and create
access to `abv_RSA`, `abv_RMC` and `abv_tx`.

```bash
npm run dev
```

## Deploying

Built for Vercel. Set the same four variables in the project's environment
settings. The forms are public and unauthenticated by design.

## Notes

- FileMaker is only ever called from server actions, so credentials stay on the
  server. Requests use plain `fetch` against the Data API rather than
  `@proofkit/fmdapi`, to keep the request shapes visible.
- Each submission opens one Data API session and logs out afterwards, since
  FileMaker Server caps concurrent sessions.
- See `CLAUDE.md` for the schema details worth knowing before changing a field.
