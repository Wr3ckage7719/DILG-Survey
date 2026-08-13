# DILG Client Satisfaction Survey — Operator's Manual

**Document Code:** FM-SP-DILG-07-07B
**Systems covered:** the online survey (web form) and the spreadsheet system (Google Sheet + Apps Script)

This manual explains how the system works and how to do the everyday tasks:
collecting responses, generating printable survey sheets, managing templates,
and keeping everything healthy. It does **not** cover the web admin dashboard —
all admin work happens in the spreadsheet.

---

## 1. How the system fits together

```
                    ┌─────────────────────────────┐
                    │  ONLINE SURVEY (web form)   │
                    │  Hosted on Vercel — the     │
                    │  link shared with clients   │
                    └──────────────┬──────────────┘
                                   │ POST (answers)
                                   ▼
                    ┌─────────────────────────────┐
                    │  Vercel server function     │
                    │  /api/submit                │
                    │  (writes to Google Sheets   │
                    │   directly — the fast path) │
                    └──────────────┬──────────────┘
                    fallback if the fast path     │
                    fails (slow)                  ▼
                    ┌─────────────────────────────┐
                    │  Google Apps Script web app │
                    │  (WebEndpoint)              │
                    └──────────────┬──────────────┘
                                   ▼
                    ┌─────────────────────────────┐
                    │  GOOGLE SHEET (the response │
                    │  book — this spreadsheet)   │
                    │  • "Survey Data" tab        │
                    │  • one row per response     │
                    └──────────────┬──────────────┘
                                   │ "Generate Printable Sheet"
                                   ▼
                    ┌─────────────────────────────┐
                    │  Google Doc template        │
                    │  (Tagalog / English)        │
                    └──────────────┬──────────────┘
                                   ▼
                    ┌─────────────────────────────┐
                    │  Generated PDF per response │
                    │  → "DILG Survey Generated   │
                    │     Sheets" folder          │
                    └─────────────────────────────┘
```

**What you interact with every day:**
- **The spreadsheet** — where all responses land and where all menu tools live.
  It has a **DILG Survey** menu added automatically at the top (see §2).
- **The online survey link** — the web page you share with clients.
- **Google Drive folders**:
  - `DILG Survey Templates` — holds the template documents
  - `DILG Survey Generated Sheets` — holds every generated printable (auto-created)

---

## 2. The DILG Survey menu (spreadsheet)

Open the spreadsheet. A menu bar named **`DILG Survey`** appears next to
Help (it appears automatically when you open the file; if it is missing, see
§8 Troubleshooting).

### Main menu — everyday actions

| Menu item | What it does |
|---|---|
| **Create / Update Google Form** | Creates (first time) or rebuilds the linked Google Form (on-site/offline use), links it to this spreadsheet, and shows the share link. See §3. |
| **Generate Printable Sheet (Selected Row)** | Generates the filled survey sheet for **one** response (the row you selected). See §5. |
| **Batch Generate (Selected Rows)** | Generates filled sheets for **many** responses at once (all rows you selected). See §5. |
| **Settings** | Opens the settings sidebar: template documents, output folder, Google Form. See §6. |
| **Install Keep-Warm + Cleanup Triggers** | One-time setup that keeps the online survey fast and cleans duplicate rows automatically. See §7. |
| **About / Help** | Shows a short summary of how to use the tool. |

### Advanced submenu — maintenance & power-user tools

| Menu item | What it does |
|---|---|
| **Generate Template Document** | Creates a brand-new Tagalog template Google Doc with all `{{placeholders}}` already embedded. Ask for a name when prompted. |
| **Prepare English Template** | Inserts placeholders into your English template document (set in Settings first). See §6.2. |
| **Reset English Template** | Removes the placeholders from the English template (undoes "Prepare"). |
| **Verify Template** | Checks the Tagalog template: file exists, is a native Google Doc, all ~89 placeholders present, SQD grid state, output folder and form configured. |
| **Verify English Template** | Same check for the English template. |
| **Fix Template Layout** | Repairs common template issues: merges orphan `☐ {{key}}` lines back into label lines and strips literal checkbox glyphs. Run this when the printable output looks off. |
| **Compact SQD Grid** | Tidies the SQD rating tables in both templates: fills every rating cell with the checkbox glyph and narrows the rating columns. Run after making a new template. |
| **Diagnose Deployment** | The first thing to run when output looks wrong. Shows the code version (`MERGE_VERSION`), the state of both templates, and the active row's language/answers. |
| **Diagnose Batch Append** | Developer diagnostic for batch document building. |
| **Batch Spacing Self-Test** | Runs internal tests on the batch document layout; shows pass/fail counts. |
| **Batch Resume Self-Test** | Runs internal tests on batch resume (continuing an interrupted batch). |
| **Test Merge (English) — Selected Row** | Performs the real English merge against the selected row and reports the values read and the resulting checkmarks. Use when a printable shows wrong/unchecked answers. |
| **Remove Duplicate Reference Numbers** | Scans the Reference Number column and deletes any duplicate rows, keeping the first. Safe to run any time. |
| **Delete Test Rows** | Deletes leftover test/diagnostic rows (Reference Numbers starting with `REFTEST-`, `VERIFY-`, `DILG-TEST-`, etc.). Keeps the sheet clean. |

---

## 3. The online survey (collecting responses)

### 3.1 One-time setup

The online survey is a web page (hosted on Vercel) that posts answers into this
spreadsheet. Everything was set up during installation; you only re-verify
occasionally:

1. The Vercel project has the environment variables set:
   - `APPS_SCRIPT_URL` — must equal the live web-app URL ending in
     `/AKfycbxGAbSu3N1x0iVaKGLmLIi8JgrR6mpmAdH00-.../exec`
   - `GOOGLE_SA_KEY` + `SPREADSHEET_ID` — enable the fast path that writes
     responses straight into the sheet (recommended, much faster)
2. The Apps Script project has the **keep-warm** trigger installed
   (see §7) so the survey never feels slow.

### 3.2 Sharing the survey

- Share the **online web app link** (the Vercel URL) with clients. This is the
  recommended channel — submissions land in the sheet in ~2 seconds.
- Alternatively, share the **Google Form** link (from `DILG Survey →
  Create / Update Google Form`). The form is linked to the same spreadsheet, so
  on-site (tablet) responses land in the same rows.

### 3.3 What happens when someone answers

1. The response is posted to the spreadsheet (directly via the fast path, or
   via the Apps Script web app as fallback).
2. A **Reference Number** is assigned to the row (shown on the client's
   success screen).
3. The **`onFormSubmit`** trigger runs automatically and:
   - numbers the **Response ID** column (1, 2, 3, …)
   - auto-fills **SQD5 = N/A** if the respondent left it blank (this office
     has no payment transactions — the question does not apply)
4. The row appears in the sheet's **Survey Data** tab, ready to be turned into
   a printable.

> **If a response seems missing:** check the most recent rows first (the sheet
> is sorted by submission time). If a Reference Number appears twice, run
> `Advanced → Remove Duplicate Reference Numbers`.

---

## 4. One-time setup (do this before generating your first printable)

1. **Set the template documents** — `DILG Survey → Settings`:
   - **Template Document** (Tagalog): click **⚡ Auto-Generate Template** to
     create one, or paste the Doc ID of an existing template.
   - **English Template Document**: if you keep an English-language copy of the
     form (e.g. a converted Word file), upload/convert it to Google Docs
     (Drive → right-click → **Open with → Google Docs**), copy its Doc ID from
     the URL, paste it here and click **Save English Template**, then run
     `Advanced → Prepare English Template`.
2. **Output folder** (optional) — leave blank and the system auto-creates
   `DILG Survey Generated Sheets`; or paste a specific Drive folder ID to pin
   the destination.
3. **Click Save** on each section. Then run `Advanced → Verify Template` to
   confirm everything is ready (green checkmarks).

---

## 5. Generating a printable survey sheet ★ (the main task)

The printable is a filled copy of the form — every checkbox and answer from a
response row pre-marked — saved as a **Google Doc + PDF** in the output folder.

### 5.1 Single response

1. Open the spreadsheet and go to the **Survey Data** tab.
2. **Select any cell in the response row** you want (click on the row number or
   a cell inside it — not the header row).
3. Menu: **`DILG Survey → Generate Printable Sheet (Selected Row)`**.
4. A small dialog asks which template to use:
   - **Auto** (recommended) — uses the row's **"Wika ng sarbey"** answer to
     pick the language. If that column is missing, it falls back to Tagalog.
   - **English form** — always uses the English template.
   - **Tagalog form** — always uses the Tagalog template.
5. Click **Generate**.
6. The dialog reports **"Generated! Printable sheet saved:"** with a link.
   - Click the link to open the Google Doc, or
   - find the matching **PDF** in the output folder
     (`DILG Survey Generated Sheets`) — the PDF is the copy you print/file.

### 5.2 Batch (many responses)

1. Select **multiple rows** (click-drag on the row numbers, or hold `Ctrl`
   while clicking row numbers) — any selection that covers data rows works.
2. Menu: **`DILG Survey → Batch Generate (Selected Rows)`**.
3. Choose the template (Auto / English / Tagalog) and click **Generate**.
4. The dialog shows `N / M files generated` plus the list of links. Any row
   that failed is listed separately (e.g. `Row 12: …`) so you can retry it.
5. All PDFs land in the output folder with the response's reference details in
   the file name.

### 5.3 Where the files go

- Output folder: `DILG Survey Generated Sheets` (in Drive) — auto-created.
- Each response produces a **Google Doc** (editable) and a **PDF** (print-ready)
  with the same name.

### 5.4 If the printable shows raw `{{placeholders}}` or wrong marks

1. Run `Advanced → Diagnose Deployment` — check that `MERGE_VERSION` shows the
   current version (if it says **MISSING / STALE**, the deployed code is old —
   see §7.4 on deploying code updates).
2. Run `Advanced → Verify Template` for the template in use — fix anything it
   flags (missing keys → regenerate; `.docx` format → convert to Google Docs).
3. Run `Advanced → Fix Template Layout` to merge orphan placeholder lines.
4. Re-generate the printable for that row.

---

## 6. Settings sidebar

Open with **`DILG Survey → Settings`**. Sections:

| Section | Purpose |
|---|---|
| **Google Form** | Shows the linked form's link. **Create / Update Form** rebuilds the form with all questions and conditional logic. |
| **Template Document** | The Tagalog template Doc ID. Paste an existing ID, or click **⚡ Auto-Generate Template**. |
| **English Template Document** | The English template Doc ID (see §4 step 1 for how to create one). |
| **Output Folder ID** | Where generated PDFs are saved. Blank = auto-created `DILG Survey Generated Sheets`. |
| **Reset All Settings** | Clears template/form/folder settings (the sheet data is untouched). Only use when reconfiguring from scratch. |

> **Note:** the "Admin Dashboard Login" section in the sidebar is no longer
> used. Ignore it — all administration now happens in this spreadsheet.

---

## 7. Triggers, maintenance & updating

### 7.1 Install the triggers (one-time, do after any fresh setup)

Menu: **`DILG Survey → Install Keep-Warm + Cleanup Triggers`**. This installs:

- **keep-warm** — pings the live web app **every minute** so the online survey
  never hits the 20–40 second cold start. Without it, the first submission
  after ~6 idle minutes is very slow.
- **cleanup** — every day at 3 AM, scans the Reference Number column and deletes
  duplicate rows (keeping the first). Safety net against double submissions.

Re-run the item any time to re-install (it replaces old triggers, never stacks).

### 7.2 Weekly/monthly housekeeping

- **Delete test rows**: `Advanced → Delete Test Rows` — clears any
  test/diagnostic rows polluting the sheet.
- **Check for duplicates**: `Advanced → Remove Duplicate Reference Numbers`
  (or just rely on the 3 AM cleanup).
- **Spot-check a printable**: generate one with `Auto` and verify checkboxes
  match the row's answers.

### 7.3 If the sheet grows large

The system reads only recent rows for reference lookups by design, so a large
sheet stays fast. The daily cleanup keeps duplicates out. No archiving needed.

### 7.4 Deploying code updates (for the developer)

1. In a terminal (repo root): `npm run clasp:push` to upload `apps-script/`
   changes to the Apps Script project.
2. In the Apps Script editor (open from the spreadsheet: **Extensions →
   Apps Script**): **Deploy → Manage deployments → ✏ Edit → Version: New
   version → Deploy**.
3. Verify the new version is live: open
   `https://script.google.com/macros/s/AKfycbxGAbSu3N1x0iVaKGLmLIi8JgrR6mpmAdH00-rjCJZDldT_n6R1iUlqtz-sPPDjRUH3/exec?status=1`
   in a browser — it returns JSON including the `mergeVersion`. A fresh
   deployment must match the current code version.
4. Confirm the Vercel `APPS_SCRIPT_URL` still points to that URL (it does,
   unless the URL changed — then update Vercel too, and the `WEBAPP_URL`
   constant in the code, *before* switching).

> Every menu action above runs the **current** code the moment you click it —
> but the **online survey** runs the **deployed** web app, so after any code
> change you must redeploy (step 2) or the survey keeps using the old version.

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| **No `DILG Survey` menu in the spreadsheet** | Refresh the page. If still missing, open **Extensions → Apps Script**, re-run `onOpen` once, then refresh. (Doing this needs editor access to the script.) |
| **"Walang template na naka-set" / printable generates nothing** | `DILG Survey → Settings` → set the Template Document (⚡ Auto-Generate), save. |
| **Printable has `{{placeholders}}` text left in it** | 1) `Advanced → Diagnose Deployment` (is `MERGE_VERSION` current?) → 2) `Advanced → Verify Template` → 3) `Advanced → Fix Template Layout` → 4) regenerate. |
| **Checkboxes not marked for a row** | `Advanced → Test Merge (English) — Selected Row` on that row and read the values it reports; check the row's answers actually match the template's labels. |
| **Online survey takes 30+ seconds after being idle** | Install the triggers: `DILG Survey → Install Keep-Warm + Cleanup Triggers`. |
| **A response appears twice** | `Advanced → Remove Duplicate Reference Numbers` (or wait for the 3 AM cleanup). |
| **SQD rating grid too wide / cells empty in the printable** | `Advanced → Compact SQD Grid`, then regenerate. |
| **Can't find a generated file** | Check the `DILG Survey Generated Sheets` folder in Drive; the dialog also prints the direct link. |
| **"Hindi makabuo" error on generate** | Check **Executions** in the Apps Script editor for the exact error; most often a template issue — run `Advanced → Verify Template`. |

---

## 9. Glossary

| Term | Meaning |
|---|---|
| **Printable / Printable Sheet** | The filled copy of the survey form generated from a response (Google Doc + PDF). |
| **Template** | The blank form document containing `{{placeholders}}` that the merge fills. Two exist: Tagalog and English. |
| **Placeholder** | A token like `{{cc1_0}}` inside the template — replaced with a checkmark or text during generation. |
| **Reference Number** | Unique ID per submission, assigned when the response arrives. |
| **SQD** | Service Quality Dimension — the 8-question rating section of the form. |
| **Keep-warm trigger** | A once-a-minute ping that keeps the online survey web app from falling asleep. |
| **Fast path** | Writing responses directly from Vercel to the sheet (no Apps Script hop) — makes the online survey ~2s fast. |
