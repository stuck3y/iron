# Plan submission ingress

Tiny Vercel serverless project. One endpoint, `POST /api/submit`, that takes
`{ passcode, month, year, pdf (base64) }` from the `/submit/` page, verifies
the passcode, and commits the PDF to `inbox/<year>-<month>.pdf` on branch
`plan-inbox/<year>-<month>` of the site repo — which triggers the
`generate-plan.yml` GitHub Action to build the month and open a PR.

## Deploy (one time, ~2 minutes)

```bash
cd pipeline/ingress
npx vercel            # creates the project (accept defaults)
npx vercel env add SUBMIT_PASSCODE    # the shared passcode for the group
npx vercel env add GITHUB_TOKEN       # fine-grained PAT, see below
npx vercel --prod
```

The **GITHUB_TOKEN** should be a fine-grained personal access token scoped to
the single repo with only **Contents: Read and write** permission
(github.com → Settings → Developer settings → Fine-grained tokens).

Then put the production URL into the `ENDPOINT` constant at the top of the
script in `/submit/index.html` (e.g. `https://isi-plan-ingress.vercel.app/api/submit`)
and redeploy the site (commit + push).

## Also required (repo side)

- Repo secret `ANTHROPIC_API_KEY` (Settings → Secrets and variables → Actions)
  for the generation workflow.

## Notes

- Re-submitting the same month replaces the PDF on the same branch and re-runs
  the workflow; the existing PR just gets a new commit.
- The endpoint only ever writes `inbox/*.pdf` to `plan-inbox/*` branches —
  it cannot touch `main`.
