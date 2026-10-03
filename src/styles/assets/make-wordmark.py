#!/usr/bin/env python3
"""Generate the mark and wordmark SVGs (text converted to outlines).

Usage: make-wordmark.py <font.woff2> <out-dir> [name]

The font is a static Fraunces instance (opsz 144, wght 500, latin subset). Needs
fonttools + brotli. Re-run with the chosen product name once Jose picks one.
"""
import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FG = "#ecebe4"
ACCENT = "#d8a24a"
BG = "#0d0f0e"

# Mark: a shed-roof house (Sea Ranch silhouette). Right wall is dashed: the unknown edge.
MARK_SOLID = "M10 54V28L54 14M4 54H60"
MARK_DASHED = "M54 14V54"


def mark_svg_body(fg: str = FG, accent: str = ACCENT, sw: float = 4, dash: str = "5 4.5") -> str:
    return (
        f'<path d="{MARK_SOLID}" fill="none" stroke="{fg}" stroke-width="{sw}" stroke-linejoin="miter"/>'
        f'<path d="{MARK_DASHED}" fill="none" stroke="{accent}" stroke-width="{sw}" stroke-dasharray="{dash}"/>'
    )


def text_path(font: TTFont, text: str, size: float, tracking: float) -> tuple[str, float, float]:
    """Return (svg path d, width, cap/x ascent) for text set at `size` px."""
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    scale = size / upm
    x = 0.0
    parts: list[str] = []
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(glyphs)
        tpen = TransformPen(pen, (scale, 0, 0, -scale, x, 0))
        glyphs[name].draw(tpen)
        parts.append(pen.getCommands())
        x += glyphs[name].width * scale + tracking
    return " ".join(p for p in parts if p), x - tracking, size


def main() -> None:
    font_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    name = sys.argv[3] if len(sys.argv) > 3 else "dreamhouse"
    out_dir.mkdir(parents=True, exist_ok=True)
    font = TTFont(font_path)

    # Mark alone (transparent background).
    (out_dir / "mark.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="{name}">'
        f"{mark_svg_body()}</svg>\n"
    )
    # Mono mark: inherits colour, for one-colour use.
    (out_dir / "mark-mono.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" '
        f'aria-label="{name}">{mark_svg_body("currentColor", "currentColor")}</svg>\n'
    )

    # Wordmark: mark (40 px) + outlined text, cap-height aligned to the mark's baseline.
    size, tracking = 44.0, 0.4
    d, width, _ = text_path(font, name, size, tracking)
    mark_px = 52.0
    gap = 14.0
    total_w = mark_px + gap + width
    height = 56.0
    baseline = 43.0
    s = mark_px / 64.0
    (out_dir / "wordmark.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w:.1f} {height:.0f}" '
        f'width="{total_w:.1f}" height="{height:.0f}" role="img" aria-label="{name}">'
        f'<g transform="translate(0 -0.9) scale({s:.4f})">{mark_svg_body()}</g>'
        f'<path transform="translate({mark_px + gap:.1f} {baseline})" d="{d}" fill="{FG}"/></svg>\n'
    )

    # Favicon: mark on a rounded dark tile.
    (out_dir / "icon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">'
        f'<rect width="64" height="64" rx="14" fill="{BG}"/>'
        f'<g transform="translate(6.4 5) scale(0.8)">{mark_svg_body(sw=7.5, dash="7 5.5")}</g></svg>\n'
    )
    print(f"wrote mark, mark-mono, wordmark, icon for '{name}' -> {out_dir}  (wordmark {total_w:.0f}x{height:.0f})")


if __name__ == "__main__":
    main()
