# Recording plan

Deadline: submit by **5:15 PM PDT**. Freeze of features: 3:30 PM. Script: `docs/video/script.md` (2:30, 10 cues).

## TL;DR

- Jose records **7 short screen clips with live voice-over** (A to G). Claude assembles them with the two cards, speeds up the terminal wait, compresses to under 100 MB, and uploads the files to the form.
- Each clip is 10–35 s, so a bad take costs seconds, not the whole video.
- Before every take of clips E and F, the database must be reset to the clean demo state.

## Timeline (PDT)

| Time | Who | What |
|---|---|---|
| now–3:30 | Jose | Read the script aloud once; check mic; do one dry run of clips A–G without recording |
| now–3:30 | Claude | Features finish; deploy `main`; Stripe vars decision (below); screenshots for the form |
| 3:30 | Claude | `pnpm demo:reset`, then `pnpm demo:check` must print CLEAN |
| 3:35–4:15 | Jose | Record clips A–G, two takes each of E and F |
| 4:15–4:40 | Claude | Assemble, compress, check sound and length, put the file in `~/Movies/lotline/` |
| 4:40–5:00 | Jose + Claude | Upload video and 8 images, final description, flip repo to public |
| 5:10 | Jose | Press Submit Entry. 5:15 is the target; 5:30 is the hard limit |

## Host and Stripe (decided: option A, 13:30)

Done: both vars are in Vercel Production, `main` redeployed, and a production `check_buildability` call (200 in 1.8 s, no 402) moved the sandbox invoice from 1 to 2 × Lotline tool call. Record everything on `https://dreamhouse-chi.vercel.app`.

Metering only fires on a host that has `STRIPE_SECRET_KEY` and `STRIPE_METER_CUSTOMER_ID`. Today only the local dev environment has them.

| Option | Effect |
|---|---|
| **A (recommended)** Add both vars to Vercel Production | Everything is recorded on `https://dreamhouse-chi.vercel.app`; judges clicking the demo also add sandbox usage. The paywall stays off because it needs `STRIPE_PROFILE_ID`, so the public widget keeps working. Calls stay fast: the event is sent after the response with a 2.5 s timeout |
| B Keep Production without the vars | Record everything on `http://localhost:3100` (Claude starts the server). The deployed site never meters |

## Setup (once, before recording)

- Mac: Do Not Disturb on; quit Slack, Mail, Messages; hide the Dock; close all other windows.
- Screen: record at 1920×1080 if possible; otherwise use browser zoom so text is readable on a phone (125% for the app).
- Chrome: new **private** window, bookmarks bar hidden, one tab per clip.
- Recorder: QuickTime Player → File → New Screen Recording → Options → Microphone: your mic, Show Mouse Clicks in Recording. Record the selected portion or the full screen. Save each clip as `~/Movies/lotline/A.mov` … `G.mov`.
- Voice: quiet room, same distance from the mic, speak the voice-over lines exactly as written in `script.md`. Do not speak over the cue's on-screen action; pause during page loads.
- Terminal for clip D: one Terminal window, font size 18+, dark theme, nothing else visible. Run `claude mcp add --transport http lotline https://dreamhouse-chi.vercel.app/mcp` once, then start `claude --allowedTools "mcp__lotline__*"` so tool calls are not interrupted by permission prompts.

## Clips

| Clip | Cues | Length | What to record | Notes |
|---|---|---|---|---|
| A | 1–2 | ~22 s | Landing hero (2 s), press the arrow, Results at 26 ft (two red "Ruled out" cards). Then the Design Manual PDF (`https://www.tsra.org/wp-content/uploads/2020/06/DM_v7.pdf`), scroll fast and stop on the 24 ft height rule. Then the parcel sheet | Find the page with §6.3 before recording and keep it open in a second tab |
| B | 3 | none | Nothing to record. Claude uses `title.png` | — |
| C | — | — | Reserved (not used) | — |
| D | 4 | ~35 s of narration; the wait is cut and sped up | Terminal: paste the exact prompt from `script.md`; let the answer finish; stay on the final answer for 5 s | Record the whole run. If the answer has setbacks stated as passed, or different lots ruled out, redo it |
| E | 5–6 | ~25 s | In Results, **View checks** on 35604 Timber Ridge Road (card expands). Then scroll to section 03 "Guessing vs knowing" | State must be clean (reset first) |
| F | 7–8 | ~50 s | Parcel sheet, then split view: `/seller` left, landing list right. Answer the 3 Timber Ridge questions with: `Septic permitted for 3 bedrooms` / `Connected to the Sea Ranch Water Company` / `Outside the special flood hazard area`. Wait for the highlight after each | Reset before every take. Do not touch other lots |
| G | 9 | ~13 s | Stripe test-mode dashboard: customer "Demo buyer agent", `https://dashboard.stripe.com/test/customers/cus_VNJlUF8WwghCY7`, upcoming invoice with the metered line | Record after D, E and F so `N` is more than 1 |
| — | 10 | none | Claude uses `end.png` | — |

Order of recording: D first (it calls the tools and sets up the metering count), then A, E, F, G. Reset the database before E and again before each retake of F.

## Reset and check (Claude can run these; ask "resetea")

```bash
pnpm demo:reset     # scoped reset + re-ingest, prints per-lot counts, exits 1 if not clean
pnpm demo:check     # verify only: must print "CLEAN: ready to record"
```

Never answer questions on the live site outside a recording, or the state will not be clean.

## Assembly (Claude)

- Concatenate A, B (card, 8 s), D (wait sped up 2× with a small `sped up` label), E, F, G, end card (12 s); no music over the voice-over.
- Export 1920×1080, 30 fps, H.264, AAC, `-crf 23`; check size is under 100 MB and length is near 2:30.
- Watch the whole file once before upload.

## Images for the form (up to 10, PNG/JPEG/WebP, 5 MB each)

1. Landing hero with the install line
2. Verdict readable view for Timber Ridge (sources visible)
3. Trace panel with "unknowns → seller questions drafted"
4. Buyer's agent view with 2 ruled out
5. Parcel sheet
6. Seller console with an open question
7. Verdict after the third answer (Pass)
8. Before/after ("Guessing vs knowing")
9. OG image / wordmark (`public/brand/og.png`)

## Risks

| Risk | Plan |
|---|---|
| The agent in clip D says something wrong | Re-run; the prompt is verified, but model output varies. Keep only a take whose answer matches the verdicts shown in clips E and F |
| Clean state broken by a stray click | `pnpm demo:reset`, then `pnpm demo:check`, then retake |
| Stripe dashboard shows 0 usage | Make 2–3 tool calls on the recording host first and wait about 60 s |
| Time overrun | Drop clip G (cue 9) first; the video is still valid without Stripe |
