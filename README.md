# DILG-Survey
Survey for DILG Camarines Norte Provincial Office

## Apps Script (clasp)

The survey backend lives in `apps-script/` — a Google Apps Script project managed
locally with [clasp](https://github.com/google/clasp) (installed as a dev dependency).

Data flow: **Vite app → Vercel function (`/api/submit`) → Apps Script web app → Google Sheet**.

### First-time setup

```powershell
npm run clasp:login    # only if ~/.clasprc.json is missing (already done on this machine)
```

Link the existing survey script (open it in the Apps Script editor, copy the
`script.google.com/d/<SCRIPT_ID>/edit` ID):

```powershell
npm run clasp:clone -- <SCRIPT_ID>
```

Or start fresh (then paste the new Script ID into `apps-script/.clasp.json`):

```powershell
npm run clasp:create -- --title "DILG Survey Backend" --type standalone
npm run clasp:push
```

### Daily workflow

```powershell
npm run clasp:pull      # fetch latest remote changes
npm run clasp:push      # push local apps-script/ changes
npm run clasp:deploy    # create/update a deployment
npm run clasp:open      # open the script in the editor
npm run clasp:status    # what would be pushed
```

After a `push`/`deploy`, the web app deployment URL must match the
`APPS_SCRIPT_URL` env var (Vercel) for submissions to land in the sheet.
