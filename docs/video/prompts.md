# Higgsfield prompts — b-roll only

Generated footage is **illustrative**. Label it "illustrative" on screen. It never stands in for listing data, a real lot or a real Sea Ranch property. Generic modernist coastal architecture only: no people, no text, no signage, no logos, no identifiable real house.

Settings for all three: 16:9, 1080p, no audio needed (we add music or none). Generate 2–3 variants each and keep the calmest. Target file size under 20 MB each (re-encode with `ffmpeg -i in.mp4 -vf scale=1920:-2 -crf 26 -an out.mp4` if larger).

Shared style line (append to every prompt): *Muted, natural colour. Overcast marine light. Weathered grey cedar, dry coastal meadow grass, fog. Modernist shed-roof architecture. Calm, documentary, no people, no text, no logos. Slight film grain.*

## 1. Intro clip (5–8 s) → `public/brand/media/intro.mp4`

| Field | Value |
|---|---|
| Shot | Wide, low angle. A single weathered-cedar modernist house with a mono-pitched shed roof sits at the edge of a windswept coastal meadow, ocean beyond |
| Light | Soft overcast, early morning, cool sky, slightly warm glow on the cedar |
| Camera | Slow dolly forward, 5–8 s, no cuts, steady |
| Mood | Quiet, patient, observational. The sense of a place with rules you cannot see yet |

Prompt: *Wide low-angle shot, slow steady dolly forward toward a weathered grey cedar modernist house with a mono-pitched shed roof, set in a windswept coastal meadow above the Pacific, tall dry grass moving gently, fog on the horizon. Soft overcast morning light, faint warm glow on the timber. Muted natural colour, calm documentary mood, 35mm lens, shallow film grain. No people, no text, no logos.*

Negative: *people, cars, signs, text, logos, fences with branding, cartoon, oversaturated, drone swoop, lens flare.*

## 2. Title loop (8–10 s, seamless) → `public/brand/media/loop-title.mp4`

Sits behind the title card, darkened to ~25% under the dark overlay, so keep it low-contrast and slow.

| Field | Value |
|---|---|
| Shot | Close, abstract: weathered cedar board-and-batten siding in raking light, shadow lines slowly shifting |
| Light | Low sun through fog, long soft shadows |
| Camera | Imperceptible lateral slide, 10 s, loopable |
| Mood | Texture and grain, the "spec sheet" of a surface |

Prompt: *Close, static-feeling macro shot of weathered grey cedar board-and-batten siding, raking soft light, shadow lines drifting very slowly across the boards, subtle sea mist. Extremely slow lateral camera slide, seamless loop. Muted natural colour, low contrast, documentary, film grain. No people, no text, no logos.*

## 3. Closing loop (8–10 s, seamless) → `public/brand/media/loop-closing.mp4`

Sits behind the end card.

| Field | Value |
|---|---|
| Shot | Wide, empty coastal meadow at dusk, a bare building lot with only wooden survey stakes and a faint path to the sea; no house |
| Light | Blue hour, soft fog, last warm light on the horizon |
| Camera | Locked-off or very slow push, 10 s, loopable |
| Mood | Possibility, an unbuilt lot. Pairs with "Lot facts first." |

Prompt: *Locked-off wide shot of an empty coastal meadow lot at blue hour, a few small wooden survey stakes in dry grass, a faint mown path leading toward the ocean, fog drifting slowly, last warm light on the horizon. Very slow push-in, seamless loop. Muted colour, calm, documentary, film grain. No buildings, no people, no text, no logos.*

## Delivery checklist

- [ ] Files saved under `public/brand/media/`, each under 20 MB, MP4 (H.264), no audio
- [ ] Each reviewed frame by frame: no text, no logos, no people, no real landmark
- [ ] On screen, each clip carries a small "illustrative" label (see `script.md`)
