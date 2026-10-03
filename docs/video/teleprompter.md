# Teleprompter: what to show and what to say

Record each clip separately. Export each one as `~/Movies/lotline/<LETTER>.mp4`. Speak calmly; pause while pages load.

---

## Clip D: terminal (record first)

**Show:** Terminal at full screen, large font, Claude Code open (`claude --allowedTools "mcp__lotline__*"`), screen cleared with `/clear`.

**Do:** start recording → paste the prompt below → Enter → wait for the answer → hold 5 s → stop.

```
Use the lotline tools. Find me a Sea Ranch lot under $400,000 where I can build a 2-story house with a 2,155 sq ft footprint, a 400 sq ft deck, 26 ft tall. Search once, then check the ruled-out lots and the two best open lots. Answer in under 120 words: which lots are ruled out and the exact rule, and what is still unknown on the open lots. Report only what the tools returned; do not compute anything yourself.
```

**Say (right after pressing Enter):**
> Here's Claude Code using Lotline over MCP. It searches, checks the best two lots, and cites the rule it used.

**Check:** the answer rules out Leeward and Burl Tree on the 24 ft limit. Otherwise, retake.

---

## Clip A: tour and search

**Show:** Chrome private window, zoom 125%, open `https://dreamhouse-chi.vercel.app/?tour=1`.

**1. Tour step 1 is on screen. Point at the LEFT card. Say:**
> Ask an AI agent today: can I build a two-story house on this coastal lot? It says: I don't know, go ask the association.

**2. Point at the RIGHT card. Say:**
> The answer is in a fifty-two-page design manual and county maps that no agent can read. Lotline makes lots agent-readable: every fact has a source, every unknown is explicit.

**3. Click Next (step 2). Say:**
> Rules decide. The model never does.

**4. Click Next (step 3), then click Search lots. Wait for "2 ruled out". Say:**
> Six real lots at The Sea Ranch. One search: two ruled out by the twenty-four-foot height limit, before anyone drives out.

Stop.

---

## Clip E: lot details and map

**Show:** the results page (if needed, open `https://dreamhouse-chi.vercel.app/?tour=0` and click the gold arrow).

**1. Click View checks on 35604 Timber Ridge Road. Scroll slowly through the photo and the checks. Say:**
> Every check shows its source and page. This lot passes height and coverage. Septic, water and flood are still unknown.

**2. Scroll up to Results and click Map. Say:**
> Where the facts stop, the line is dashed.

Stop.

---

## Clip G: Stripe and llms.txt

**1. Show:** `https://dashboard.stripe.com/test/customers/cus_VNJlUF8WwghCY7`, scroll to the upcoming invoice line "Lotline tool call". **Say:**
> Buyers' agents stop wasting visits. Sellers answer once and reach qualified buyers. We charge per answer, metered in Stripe, not per seat.

**2. Show:** `https://dreamhouse-chi.vercel.app/llms.txt`, short scroll. **Say:**
> Any agent can discover it on its own. Built on Supabase, Vercel, Stripe and Claude.

Stop.

---

## Clip F: seller (tell Claude first, so the database is reset)

**Show:** `https://dreamhouse-chi.vercel.app/seller` → click **35604 Timber Ridge Road**.

**Do:** for Flood zone, Water and Septic: click the Demo answers chip → click Send → wait for the verdict box to flash. End on Pass.

**Say (while answering):**
> Those unknowns become questions for the seller. The seller answers once, the spec updates over Supabase Realtime, and the verdict flips to pass, live.

Stop.

---

## End card (Claude adds it; you only record the voice if you want)

> Lot facts first. Then design, financing and builders, all on facts an agent can trust. That's Lotline.

If you want this line in the video, record it as a short audio-only or screen clip named `END.mp4` (any screen; only the voice is used). Otherwise the end card plays silent.
