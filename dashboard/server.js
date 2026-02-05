#!/usr/bin/env node
/**
 * CortexGate — API Server
 * Minimal Node.js server for dashboard backend
 *
 * Endpoints:
 *   GET  /api/items         - List all items from dashboard-inbox
 *   POST /api/save/:id      - Save item to second-brain and delete from inbox
 *   DELETE /api/dismiss/:id - Delete item from inbox
 *
 * Static files served from current directory
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// ─────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 8080;
const INBOX_DIR = process.env.INBOX_DIR || path.join(process.env.HOME, 'dashboard-inbox');
const SECOND_BRAIN_DIR = process.env.SECOND_BRAIN_DIR || path.join(process.env.HOME, 'second-brain');
const STATIC_DIR = __dirname;

// MIME types for static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// ─────────────────────────────────────────────────────────────────
// Server
// ─────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // CORS headers (for development)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    console.log(`${new Date().toISOString()} ${req.method} ${pathname}`);

    try {
        // API Routes
        if (pathname === '/api/items' && req.method === 'GET') {
            return handleGetItems(req, res);
        }

        if (pathname.startsWith('/api/save/') && req.method === 'POST') {
            const id = pathname.replace('/api/save/', '');
            return handleSaveItem(req, res, id);
        }

        if (pathname.startsWith('/api/dismiss/') && req.method === 'DELETE') {
            const id = pathname.replace('/api/dismiss/', '');
            return handleDismissItem(req, res, id);
        }

        // Static file serving
        return handleStatic(req, res, pathname);

    } catch (error) {
        console.error('Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
    }
});

// ─────────────────────────────────────────────────────────────────
// API Handlers
// ─────────────────────────────────────────────────────────────────

function handleGetItems(req, res) {
    try {
        // Ensure inbox directory exists
        if (!fs.existsSync(INBOX_DIR)) {
            fs.mkdirSync(INBOX_DIR, { recursive: true });
        }

        const files = fs.readdirSync(INBOX_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                try {
                    const filePath = path.join(INBOX_DIR, f);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const parsed = safeParseJson(content, filePath);
                    if (!parsed) {
                        console.error(`Error reading ${f}: Invalid JSON (even after sanitization)`);
                    }
                    return parsed;
                } catch (e) {
                    console.error(`Error reading ${f}:`, e.message);
                    return null;
                }
            })
            .filter(Boolean);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(files));

    } catch (error) {
        console.error('Error listing items:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to list items' }));
    }
}

function handleSaveItem(req, res, id) {
    try {
        // Find the item file
        const files = fs.readdirSync(INBOX_DIR).filter(f => f.endsWith('.json'));
        const itemFile = files.find(f => {
            try {
                const filePath = path.join(INBOX_DIR, f);
                const content = safeParseJson(fs.readFileSync(filePath, 'utf8'), filePath);
                return content && content.id === id;
            } catch {
                return false;
            }
        });

        if (!itemFile) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Item not found' }));
            return;
        }

        const itemPath = path.join(INBOX_DIR, itemFile);
        const item = safeParseJson(fs.readFileSync(itemPath, 'utf8'), itemPath);

        // Generate markdown for second-brain
        const markdown = generateMarkdown(item);

        // Determine target path based on source
        const targetDir = getTargetDirectory(item.source);
        const targetPath = path.join(SECOND_BRAIN_DIR, targetDir);

        // Ensure target directory exists
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }

        // Generate filename from date and title
        const dateStr = new Date(item.created_at).toISOString().split('T')[0];
        const slug = slugify(item.title);
        const filename = `${dateStr}-${slug}.md`;
        const fullPath = path.join(targetPath, filename);

        // Write to second-brain
        fs.writeFileSync(fullPath, markdown);
        console.log(`Saved to: ${fullPath}`);

        // Delete from inbox
        fs.unlinkSync(itemPath);
        console.log(`Deleted: ${itemPath}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            saved_to: fullPath.replace(SECOND_BRAIN_DIR, '~/second-brain')
        }));

    } catch (error) {
        console.error('Error saving item:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save item' }));
    }
}

function handleDismissItem(req, res, id) {
    try {
        // Find the item file
        const files = fs.readdirSync(INBOX_DIR).filter(f => f.endsWith('.json'));
        const itemFile = files.find(f => {
            try {
                const filePath = path.join(INBOX_DIR, f);
                const content = safeParseJson(fs.readFileSync(filePath, 'utf8'), filePath);
                return content && content.id === id;
            } catch {
                return false;
            }
        });

        if (!itemFile) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Item not found' }));
            return;
        }

        const itemPath = path.join(INBOX_DIR, itemFile);
        fs.unlinkSync(itemPath);
        console.log(`Dismissed: ${itemPath}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));

    } catch (error) {
        console.error('Error dismissing item:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to dismiss item' }));
    }
}

// ─────────────────────────────────────────────────────────────────
// Static File Handler
// ─────────────────────────────────────────────────────────────────

function handleStatic(req, res, pathname) {
    // Default to index.html
    if (pathname === '/') pathname = '/index.html';

    const filePath = path.join(STATIC_DIR, pathname);

    // Security: prevent directory traversal
    if (!filePath.startsWith(STATIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
}

// ─────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Sanitize JSON content by replacing typographic quotes with ASCII quotes
 * This fixes malformed JSON from AI-generated content
 */
function sanitizeJsonContent(content) {
    return content
        // Replace typographic double quotes with ASCII
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
        // Replace typographic single quotes with ASCII apostrophe
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
        // Replace other unicode dashes with ASCII
        .replace(/[\u2013\u2014]/g, '-');
}

/**
 * Safely parse JSON with automatic sanitization
 * If parsing fails after sanitization, returns null
 */
function safeParseJson(content, filePath = null) {
    // First try parsing as-is
    try {
        return JSON.parse(content);
    } catch (e) {
        // Try with sanitization
        const sanitized = sanitizeJsonContent(content);
        try {
            const parsed = JSON.parse(sanitized);
            // If we have a file path and sanitization helped, save the fixed version
            if (filePath && sanitized !== content) {
                try {
                    fs.writeFileSync(filePath, sanitized);
                    console.log(`Auto-fixed JSON: ${path.basename(filePath)}`);
                } catch (writeErr) {
                    console.error(`Could not auto-fix ${filePath}:`, writeErr.message);
                }
            }
            return parsed;
        } catch (e2) {
            // Still failed - return null
            return null;
        }
    }
}

function generateMarkdown(item) {
    let dateStr;
    try {
        const parsed = new Date(item.created_at);
        dateStr = isNaN(parsed.getTime()) ? new Date().toISOString().split('T')[0] : parsed.toISOString().split('T')[0];
    } catch {
        dateStr = new Date().toISOString().split('T')[0];
    }

    const frontmatter = {
        type: `${item.source}-summary`,
        date: dateStr,
        source: item.source,
        tags: [item.source, 'summary', 'cortexgate']
    };

    if (item.metadata) {
        if (item.metadata.url) frontmatter.url = item.metadata.url;
        if (item.metadata.video_url) frontmatter.video_url = item.metadata.video_url;
        if (item.metadata.duration) frontmatter.duration = item.metadata.duration;
    }

    let md = '---\n';
    for (const [key, value] of Object.entries(frontmatter)) {
        if (Array.isArray(value)) {
            md += `${key}:\n${value.map(v => `  - ${v}`).join('\n')}\n`;
        } else {
            md += `${key}: ${value}\n`;
        }
    }
    md += '---\n\n';

    md += `# ${item.title}\n\n`;
    md += `> [!tldr] TL;DR\n> ${item.summary}\n\n`;

    // Sections (neues Format)
    if (item.sections && Array.isArray(item.sections)) {
        for (const section of item.sections) {
            md += `## ${section.heading}\n\n`;
            for (const itemText of section.items) {
                md += `- ${itemText}\n`;
            }
            md += '\n';
        }
    }
    // Fallback: alter content-String
    else if (item.content) {
        md += `## Details\n\n${item.content}\n\n`;
    }

    if (item.links && item.links.length > 0) {
        md += `## Links\n\n`;
        item.links.forEach(link => {
            md += `- ${link}\n`;
        });
    }

    return md;
}

function getTargetDirectory(source) {
    switch (source) {
        case 'newsletter':
            return '3-resources/newsletters';
        case 'youtube':
            return '3-resources/videos';
        case 'website':
            return '3-resources/articles';
        case 'research':
            return '3-resources/research';
        default:
            return 'inbox';
    }
}

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c]))
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50);
}

// ─────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    CortexGate Server                          ║
╠═══════════════════════════════════════════════════════════════╣
║  Dashboard:    http://localhost:${PORT}                          ║
║  Inbox:        ${INBOX_DIR}
║  Second Brain: ${SECOND_BRAIN_DIR}
╚═══════════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
});
