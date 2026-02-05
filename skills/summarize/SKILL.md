---
name: summarize
description: Summarize URLs and save to Content-Gate dashboard for review before adding to Second Brain.
homepage: https://github.com/Manantra/content-gate
metadata: {"clawdbot":{"emoji":"🧾","requires":{"bins":["summarize"]},"install":[{"id":"brew","kind":"brew","formula":"steipete/tap/summarize","bins":["summarize"],"label":"Install summarize CLI (brew)"}]}}
---

# Summarize + Content-Gate

Summarize URLs/videos and save them to Content-Gate for review before adding to your Second Brain.

## When to use

Use this skill when the user asks:
- "summarize this URL/article/video"
- "save to second brain / save for later"
- "add to dashboard"
- "what's this link about?"

## Prerequisites

- `summarize` CLI: `brew install steipete/tap/summarize`
- Content-Gate dashboard running on http://localhost:8080
- `~/dashboard-inbox/` directory exists

## Quick Summarize (without saving)

```bash
summarize "https://example.com" --length medium
summarize "https://youtu.be/VIDEO_ID" --youtube auto
```

---

## Content-Gate Workflow

When user wants to **save** the summary:

### Step 1: Summarize URL

```bash
summarize "USER_URL" --length medium --youtube auto
```

### Step 2: Create structured JSON

**EXACT FORMAT - NO DEVIATIONS:**

```json
{
    "id": "YYYY-MM-DD-SOURCE-SLUG",
    "source": "youtube|newsletter|website",
    "title": "Exact Title",
    "summary": "2-3 sentences TL;DR. No bullet points, prose only.",
    "sections": [
        {
            "heading": "Key Points",
            "items": [
                "First point without bullet prefix",
                "Second point",
                "Third point"
            ]
        },
        {
            "heading": "Takeaways",
            "items": [
                "**For X:** Concrete tip",
                "**For Y:** Concrete tip"
            ]
        }
    ],
    "links": ["https://original-url"],
    "created_at": "2026-02-04T16:00:00Z",
    "metadata": {"url": "https://original-url"}
}
```

### Section Rules

1. **heading**: Short title (1-3 words)
2. **items**: Array of strings, NO nesting
3. **Bold text**: Use `**text**`
4. **No prefixes**: NOT "- " or "• " at the start
5. **Max 5 items** per section
6. **2-4 sections** per summary

### JSON Safety (CRITICAL)

**FORBIDDEN in JSON strings:**
- Typographic quotes: `"` `"` `'` `'` → Replace with apostrophe `'`
- Unescaped backslashes: `\` → Use `\\`
- Line breaks in strings: Replace with spaces

**Example - WRONG:**
```json
"items": ["He said "Hello" to me"]
```

**Example - CORRECT:**
```json
"items": ["He said 'Hello' to me"]
```

### Step 3: Save to inbox

```bash
CREATED_AT=$(date -Iseconds)
cat > ~/dashboard-inbox/YYYY-MM-DD-SOURCE-SLUG.json << 'JSONEOF'
{
    "id": "2026-02-05-youtube-example-video",
    "source": "youtube",
    "title": "Example Video Title",
    "summary": "Brief summary here.",
    "sections": [...],
    "links": ["https://youtu.be/..."],
    "created_at": "${CREATED_AT}",
    "metadata": {"url": "https://youtu.be/..."}
}
JSONEOF
```

### Step 4: Confirmation

Output the summary + "Saved to dashboard. Open http://localhost:8080 to review."

### Source Types

- `youtube` → youtu.be, youtube.com
- `newsletter` → Newsletter links
- `website` → All other URLs

---

## Installation

This skill is included with Content-Gate. To use it with OpenClaw:

```bash
# Symlink to your skills directory
ln -sf ~/content-gate/skills/summarize ~/clawd/skills/summarize
```

Or copy the skill:

```bash
cp -r ~/content-gate/skills/summarize ~/clawd/skills/
```
