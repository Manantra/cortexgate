---
name: summarize
description: Summarize URLs and videos. Saves structured JSON to Dashboard.
metadata: {"clawdbot":{"emoji":"🧾","requires":{"bins":["summarize"]}}}
---

# Summarize

## WORKFLOW

### Schritt 1: Zusammenfassen

```bash
~/.local/bin/summarize "USER_URL" --length medium
```

### Schritt 2: Strukturiertes JSON erstellen

**EXAKTES FORMAT - KEINE ABWEICHUNGEN:**

```json
{
    "id": "YYYY-MM-DD-SOURCE-SLUG",
    "source": "youtube",
    "title": "Exakter Titel",
    "summary": "2-3 Sätze TL;DR. Keine Bulletpoints, nur Fließtext.",
    "sections": [
        {
            "heading": "Kernpunkte",
            "items": [
                "Erster Punkt ohne Bulletpoint-Prefix",
                "Zweiter Punkt",
                "Dritter Punkt"
            ]
        },
        {
            "heading": "Takeaways",
            "items": [
                "**Für X:** Konkreter Tipp",
                "**Für Y:** Konkreter Tipp"
            ]
        }
    ],
    "links": ["https://original-url"],
    "created_at": "2026-02-04T16:00:00Z",
    "metadata": {"url": "https://original-url"}
}
```

### REGELN FÜR SECTIONS:

1. **heading**: Kurzer Titel (1-3 Wörter)
2. **items**: Array von Strings, KEINE Verschachtelung
3. **Bold-Text**: Mit `**text**` markieren
4. **Keine Präfixe**: NICHT "- " oder "• " am Anfang
5. **Max 5 Items** pro Section
6. **2-4 Sections** pro Zusammenfassung

### Schritt 3: Speichern

**Datum VORHER generieren:**
```bash
CREATED_AT=$(date -Iseconds)
```

**Dann JSON erstellen:**
```bash
cat > ~/dashboard-inbox/YYYY-MM-DD-SOURCE-SLUG.json << JSONEOF
{
    "id": "...",
    "source": "...",
    "title": "...",
    "summary": "...",
    "sections": [...],
    "links": ["..."],
    "created_at": "${CREATED_AT}",
    "metadata": {"url": "..."}
}
JSONEOF
```

**WICHTIG:** `${CREATED_AT}` mit Double-Quotes und geschweiften Klammern!

### Schritt 4: Antworten

Gib Zusammenfassung aus + "Im Dashboard gespeichert"
