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

## Clips (script v3)

| Clip | Cues | Length | What to record | Notes |
|---|---|---|---|---|
| A | 1–4 | ~38 s | Private window, open `https://dreamhouse-chi.vercel.app/?tour=1`. Onboarding step 1 (hold on the left card, then the right card), **Next**, step 2, **Next**, step 3, **Search lots**, results load | `?tour=1` always opens the tour. Results take ~2 s to load on production; keep talking |
| D | 5 | ~30 s narrated; wait sped up | Terminal: paste the exact prompt from `script.md`; let the answer finish; hold 5 s | Retake if the answer contradicts cue 6 |
| E | 6–7 | ~24 s | In Results, **View checks** on 35604 Timber Ridge Road (aerial + checks). Then the **Map** toggle | State must be clean |
| F | 8 | ~26 s | `https://dreamhouse-chi.vercel.app/seller` → click **35604 Timber Ridge Road** → on its page, for septic, water, flood: click the **Demo answers** chip, then **Send**; wait for the verdict block to flash after each; end on Pass | Reset before every take |
| G | 9–10 | ~24 s | Stripe test-mode dashboard: `https://dreamhouse-chi.vercel.app` metering customer "Demo buyer agent" (`https://dashboard.stripe.com/test/customers/cus_VNJlUF8WwghCY7`), upcoming invoice line. Then `https://dreamhouse-chi.vercel.app/llms.txt` | Record after A–F so `N` > 1 |
| — | 11 | 8 s | Claude adds `end.png` | — |

Order: D first, then A, E, F, G. Run `pnpm demo:reset` before E and before every take of F.

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
8. Before/after ("“I don’t know” vs a sourced answer")
9. OG image / wordmark (`public/brand/og.png`)

## Risks

| Risk | Plan |
|---|---|
| The agent in clip D says something wrong | Re-run; the prompt is verified, but model output varies. Keep only a take whose answer matches the verdicts shown in clips E and F |
| Clean state broken by a stray click | `pnpm demo:reset`, then `pnpm demo:check`, then retake |
| Stripe dashboard shows 0 usage | Make 2–3 tool calls on the recording host first and wait about 60 s |
| Time overrun | Drop clip G (cue 9) first; the video is still valid without Stripe |
