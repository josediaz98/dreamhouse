# Claude with no tools: real answer (2026-10-03)

Used in landing section 03 as a quoted excerpt. Generated with Claude Code, no MCP servers and no tools:

```
claude -p --strict-mcp-config --mcp-config <empty> --disallowedTools "WebSearch,WebFetch,Bash,Read,Grep,Glob,Edit,Write" --max-turns 1 \
  "Can I build a 2-story house, 26 ft tall, with a 2,155 sq ft footprint and a 400 sq ft deck on 39463 Leeward Road, The Sea Ranch, CA (0.39 acres, listed at $224,500)? Answer in under 80 words."
```

## Full answer, unedited

**I don't know.** Approval depends on site-specific rules I can't check from here:

- **The Sea Ranch Association Design Committee:** height limits differ by lot, and 26 ft may exceed this lot's limit. It also sets coverage limits and view-corridor rules.
- **Sonoma County and the Coastal Commission:** you need a Coastal Development Permit.
- **Septic:** a low price can mean the lot can't support a large house.

Ask the Association for this lot's design limits and septic status before you make an offer.

## Lotline for the same lot and program

`check_buildability` returns `fail`: height limit 24 ft west of Hwy 1 (Sea Ranch Design Manual section 6.3); the house is 26 ft.
