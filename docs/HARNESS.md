# Harness

The harness lets you test Tikke features without a real TikTok LIVE connection.

## Run

```bash
pnpm harness:chat      # 5 mock chat events
pnpm harness:gift      # 5 mock gift events
pnpm harness:stress    # 1000 random events
pnpm harness:tts       # TTS queue (Phase 8)
pnpm harness:overlay   # Marquee overlay (Phase 10)
```

## Replay any JSONL

```bash
cd apps/desktop
tsx harness/runners/event-replay-runner.ts harness/mock-events/mixed-live.jsonl
```

## Add a scenario

1. Create `apps/desktop/harness/scenarios/my-scenario.ts`
2. Add `"harness:my": "tsx harness/scenarios/my-scenario.ts"` to `apps/desktop/package.json`
3. Add mock data to `harness/mock-events/my-data.jsonl` if needed

## Definition of done

A feature is complete when:
- It works with mock events
- It does not crash on missing fields
- It can be toggled on/off
- Errors are logged clearly
