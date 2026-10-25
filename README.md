# CortexGate

<p align="center">
  <img src="docs/flow-diagram.jpg" alt="Content Gate Flow: Telegram → AI Summary → Dashboard → Second Brain" width="100%">
</p>

A lightweight, mobile-friendly **review queue for AI-generated summaries**. Read a summary, save selected items as Markdown into an Obsidian-compatible knowledge base, or dismiss what you don't need. Humans stay in charge of what gets stored.

> **Note:** This project was formerly known as "Content Gate".

## Features

- Clean, editorial design optimized for reading
- Mobile-friendly PWA (add to home screen)
- iPhone safe area support (notch, home indicator)
- Structured sections for consistent formatting
- One-click save to Obsidian vault
- Dismiss unwanted content

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ AI Bot          │────▶│ ~/dashboard-inbox│────▶│ Dashboard       │
│ (summarize URLs)│     │    /*.json       │     │ localhost:8080  │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          │ "Save" Button
                                                          ▼
                                              ┌─────────────────────┐
                                              │ ~/second-brain/     │
                                              │ (Obsidian Vault)    │
                                              └─────────────────────┘
```

## Quick start

CortexGate is a small **Node.js server with a browser dashboard**. It reads pending JSON summaries from an inbox, then either exports a selected item as Markdown into your Second Brain folder or dismisses it.

### 1. Clone and prepare folders

Use Node.js (v18+ recommended). There is no npm install step for the included server.

```bash
git clone https://github.com/Manantra/cortexgate.git
cd cortexgate
node --version
mkdir -p "$HOME/dashboard-inbox" "$HOME/second-brain"
```

### 2. Start the dashboard

The server uses environment variables; **you do not need to edit `dashboard/server.js`** to configure your folders.

```bash
PORT=8080 \
INBOX_DIR="$HOME/dashboard-inbox" \
SECOND_BRAIN_DIR="$HOME/second-brain" \
node dashboard/server.js
```

Open **http://localhost:8080** in your browser. The defaults are also port `8080`, `~/dashboard-inbox`, and `~/second-brain` if no environment variables are provided.

To see an item in the dashboard, put a valid JSON summary into the inbox; see [manual test](#manual-testing) or [sample items](examples/). Saving places Markdown under the configured Second Brain directory, grouped by source type; dismissing removes the pending inbox item.

> [!WARNING]
> **Keep CortexGate private.** The current server listens on `0.0.0.0` and exposes save/dismiss actions **without authentication**, with permissive CORS. Do not publish port 8080 or put this dashboard directly on the public internet. Use only on a trusted machine/network with appropriate firewall restrictions; add real authentication and access controls before any remote deployment. Summaries may include private information.

### 3. Optional: run as a user-level systemd service (Linux)

The included [service unit](setup/cortexgate.service) expects the checkout at `~/cortexgate`, Node.js at `/usr/bin/node`, and listens on `8080`. Check these paths and edit the copied unit if your setup differs.

```bash
mkdir -p ~/.config/systemd/user
cp setup/cortexgate.service ~/.config/systemd/user/cortexgate.service
command -v node
# If required, edit WorkingDirectory / ExecStart / Environment paths in:
# ~/.config/systemd/user/cortexgate.service
systemctl --user daemon-reload
systemctl --user enable --now cortexgate.service
systemctl --user status cortexgate.service
```

Service name: `cortexgate.service` (not the former `content-gate` name). Keep the same network-access warning in mind for a service install.

## JSON Schema

Items in `~/dashboard-inbox/` follow this structure:

```json
{
    "id": "2026-02-04-youtube-example",
    "source": "youtube",
    "title": "Video Title",
    "summary": "2-3 sentence TL;DR without bullet points.",
    "sections": [
        {
            "heading": "Key Points",
            "items": [
                "First point without bullet prefix",
                "Second point with **bold** text",
                "Third point"
            ]
        },
        {
            "heading": "Takeaways",
            "items": [
                "**For developers:** Specific tip",
                "**For designers:** Another tip"
            ]
        }
    ],
    "links": ["https://youtube.com/watch?v=..."],
    "created_at": "2026-02-04T16:00:00Z",
    "metadata": {
        "url": "https://youtube.com/watch?v=...",
        "duration": "12:34"
    }
}
```

### Source Types

- `youtube` - Video summaries
- `newsletter` - Newsletter digests
- `website` - Article summaries
- `research` - Research summaries

## AI Bot Integration (OpenClaw)

CortexGate works with OpenClaw for automatic URL summarization. Create a skill in your workspace that outputs JSON to `~/dashboard-inbox/`.

### Install summarize CLI

```bash
brew install steipete/tap/summarize
```

### Usage

Tell your AI agent:
- "Summarize this URL and save to dashboard"
- "Save this video to my second brain"

The skill will create properly formatted JSON in `~/dashboard-inbox/`.

### Manual Testing

Create a test item:

```bash
cat > ~/dashboard-inbox/test-item.json << 'EOF'
{
    "id": "2026-02-04-test",
    "source": "website",
    "title": "Test Article",
    "summary": "This is a test summary to verify the dashboard works correctly.",
    "sections": [
        {
            "heading": "Test Section",
            "items": [
                "First test item",
                "Second test item with **bold**"
            ]
        }
    ],
    "links": ["https://example.com"],
    "created_at": "2026-02-04T12:00:00Z",
    "metadata": {"url": "https://example.com"}
}
EOF
```

## PWA Installation (iPhone)

1. Open dashboard in Safari
2. Tap Share button
3. "Add to Home Screen"
4. The app runs in standalone mode with proper safe areas

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/items` | GET | List all items |
| `/api/save/:id` | POST | Save to Second Brain |
| `/api/dismiss/:id` | DELETE | Remove item |

## File Structure

```
cortexgate/
├── dashboard/
│   ├── index.html      # Main HTML
│   ├── style.css       # Styles (editorial design)
│   ├── app.js          # Frontend logic
│   ├── server.js       # Node.js API server
│   ├── manifest.json   # PWA manifest
│   └── icon.svg        # App icon
├── setup/
│   └── cortexgate.service  # systemd service
└── examples/
    └── *.json          # Sample items
```

## Customization

### Colors

Edit CSS variables in `style.css`:

```css
:root {
    --bg-primary: #FAF8F5;      /* Background */
    --accent: #C45D3A;          /* Accent color */
    --text-primary: #1A1A1A;    /* Text color */
}
```

### Fonts

The dashboard uses:
- **Fraunces** (display/headings)
- **Inter** (body text)

Loaded from Google Fonts in `index.html`.

## License

MIT
