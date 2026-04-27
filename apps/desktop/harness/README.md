# Tikke Harness

Mock event system for testing Tikke features without a real TikTok LIVE connection.

## Run scenarios

```bash
pnpm harness:chat      # mock chat events
pnpm harness:gift      # mock gift events
pnpm harness:tts       # TTS queue (Phase 8)
pnpm harness:overlay   # overlay marquee (Phase 10)
pnpm harness:stress    # 1000 random events
```

## JSONL format

Each line is one `TikkeEvent` JSON object.

```json
{"id":"evt_1","type":"chat","timestamp":1710000000000,"user":{"uniqueId":"viewer1","nickname":"뷰어1"},"message":"안녕하세요"}
```

## Adding scenarios

1. Add a `.ts` file in `scenarios/`
2. Add a script entry in `apps/desktop/package.json`
3. Add a JSONL fixture in `mock-events/` if needed
