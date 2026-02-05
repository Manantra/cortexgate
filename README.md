# Content Gate

<p align="center">
  <img src="docs/flow-diagram.jpg" alt="Content Gate Flow: Telegram → AI Summary → Dashboard → Second Brain" width="100%">
</p>

A lightweight dashboard to review and curate AI-generated content summaries before saving them to your Second Brain (Obsidian).

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
│ (summarize URLs)│     │    /*.json       │     │ localhost:3000  │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          │ "Save" Button
                                                          ▼
                                              ┌─────────────────────┐
                                              │ ~/second-brain/     │
                                              │ (Obsidian Vault)    │
                                              └─────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
# Node.js required
node --version  # v18+ recommended
```

### 2. Create Directories

```bash
mkdir -p ~/dashboard-inbox
mkdir -p ~/second-brain/inbox  # or your Obsidian vault path
```

### 3. Configure Paths

Edit `dashboard/server.js`:

```javascript
const INBOX_DIR = '/home/YOUR_USER/dashboard-inbox';
const SECOND_BRAIN_DIR = '/home/YOUR_USER/second-brain/inbox';
```

### 4. Start the Server

```bash
cd dashboard
node server.js
```

Dashboard available at: http://localhost:3000

### 5. (Optional) Run as Service

```bash
# Copy service file
cp setup/content-gate.service ~/.config/systemd/user/

# Edit paths in the service file
nano ~/.config/systemd/user/content-gate.service

# Enable and start
systemctl --user daemon-reload
systemctl --user enable content-gate
systemctl --user start content-gate
```

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

## AI Bot Integration

The `skills/summarize/SKILL.md` file can be used with AI agents (like OpenClaw/Claude) to automatically generate summaries in the correct format.

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
content-gate/
├── dashboard/
│   ├── index.html      # Main HTML
│   ├── style.css       # Styles (editorial design)
│   ├── app.js          # Frontend logic
│   ├── server.js       # Node.js API server
│   ├── manifest.json   # PWA manifest
│   └── icon.svg        # App icon
├── skills/
│   └── summarize/
│       └── SKILL.md    # AI agent skill definition
├── setup/
│   └── content-gate.service  # systemd service
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
