/**
 * CortexGate — Dashboard Application
 * Handles loading items, modal interactions, save/dismiss actions
 */

const API_BASE = '/api';
let items = [];
let currentItemId = null;

// ─────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    loadItems();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
});

// ─────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────

async function loadItems() {
    const container = document.getElementById('items-container');
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');
    const countEl = document.getElementById('count');

    loadingState.style.display = 'block';
    emptyState.style.display = 'none';
    container.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE}/items`);
        if (!response.ok) throw new Error('Failed to load items');

        items = await response.json();
        countEl.textContent = items.length;
        loadingState.style.display = 'none';

        if (items.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        // Sort by date, newest first
        items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        items.forEach(item => {
            container.appendChild(createCard(item));
        });

    } catch (error) {
        console.error('Error loading items:', error);
        loadingState.style.display = 'none';
        showToast('Fehler beim Laden der Inhalte', 'error');
    }
}

async function saveItem(id) {
    const btn = document.querySelector('.btn-save');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader" style="width:18px;height:18px;border-width:2px;margin:0;"></span> Speichere...';

    try {
        const response = await fetch(`${API_BASE}/save/${id}`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to save');

        showToast('In Second Brain gespeichert', 'success');
        closeModal();
        removeItemFromGrid(id);

    } catch (error) {
        console.error('Error saving:', error);
        showToast('Fehler beim Speichern', 'error');
        btn.disabled = false;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
            <polyline points="17,21 17,13 7,13 7,21"/>
            <polyline points="7,3 7,8 15,8"/>
        </svg> In Second Brain speichern`;
    }
}

async function dismissItem(id) {
    const btn = document.querySelector('.btn-dismiss');
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/dismiss/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to dismiss');

        showToast('Verworfen', 'success');
        closeModal();
        removeItemFromGrid(id);

    } catch (error) {
        console.error('Error dismissing:', error);
        showToast('Fehler beim Verwerfen', 'error');
        btn.disabled = false;
    }
}

// ─────────────────────────────────────────────────────────────────
// UI Components
// ─────────────────────────────────────────────────────────────────

function createCard(item) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.source = item.source;
    card.dataset.id = item.id;
    card.onclick = () => openModal(item.id);

    const sourceLabel = {
        'newsletter': 'Newsletter',
        'youtube': 'YouTube',
        'website': 'Website',
        'research': 'Research'
    }[item.source] || item.source;

    const sourceIcon = {
        'newsletter': '📰',
        'youtube': '▶',
        'website': '🌐',
        'research': '🔬'
    }[item.source] || '📄';

    const date = formatDate(item.created_at);
    const linkCount = item.links?.length || 0;

    card.innerHTML = `
        <div class="card-header">
            <span class="card-source" data-source="${item.source}">${sourceIcon} ${sourceLabel}</span>
            <time class="card-date">${date}</time>
        </div>
        <h2 class="card-title">${escapeHtml(item.title)}</h2>
        <p class="card-summary">${escapeHtml(item.summary)}</p>
        <div class="card-footer">
            <div class="card-meta">
                ${linkCount > 0 ? `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                    </svg>
                    <span>${linkCount} Links</span>
                ` : ''}
            </div>
            <span class="card-action">Lesen →</span>
        </div>
    `;

    return card;
}

function openModal(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;

    currentItemId = id;
    const modal = document.getElementById('modal');

    // Populate modal content
    const sourceEl = document.getElementById('modal-source');
    sourceEl.dataset.source = item.source;
    sourceEl.textContent = {
        'newsletter': '📰 Newsletter',
        'youtube': '▶ YouTube',
        'website': '🌐 Website',
        'research': '🔬 Research'
    }[item.source] || item.source;

    document.getElementById('modal-date').textContent = formatDate(item.created_at);
    document.getElementById('modal-title').textContent = item.title;
    document.getElementById('modal-summary').textContent = item.summary;
    document.getElementById('modal-content').innerHTML = formatContent(item.content, item.sections);

    // Links section
    const linksEl = document.getElementById('modal-links');
    if (item.links && item.links.length > 0) {
        linksEl.innerHTML = `
            <h4>Weiterführende Links</h4>
            <ul>
                ${item.links.map(link => `
                    <li><a href="${escapeHtml(link)}" target="_blank" rel="noopener">
                        ${truncateUrl(link)} ↗
                    </a></li>
                `).join('')}
            </ul>
        `;
    } else {
        linksEl.innerHTML = '';
    }

    // Reset button states
    document.querySelector('.btn-save').disabled = false;
    document.querySelector('.btn-dismiss').disabled = false;

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    currentItemId = null;
}

function removeItemFromGrid(id) {
    const card = document.querySelector(`.card[data-id="${id}"]`);
    if (card) {
        card.style.transform = 'scale(0.9)';
        card.style.opacity = '0';
        setTimeout(() => {
            card.remove();
            items = items.filter(i => i.id !== id);
            document.getElementById('count').textContent = items.length;

            if (items.length === 0) {
                document.getElementById('empty-state').style.display = 'block';
            }
        }, 300);
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span>${icon}</span> ${message}`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ─────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `Vor ${diffDays} Tagen`;

    return date.toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

function formatContent(content, sections) {
    // Wenn sections vorhanden, nutze strukturiertes Rendering
    if (sections && Array.isArray(sections) && sections.length > 0) {
        return sections.map(section => `
            <section class="content-section">
                <h3>${escapeHtml(section.heading)}</h3>
                <ul>
                    ${section.items.map(item => `<li>${formatInlineMarkdown(item)}</li>`).join('')}
                </ul>
            </section>
        `).join('');
    }

    // Fallback für alten content-String (Markdown)
    if (!content) return '';
    let html = escapeHtml(content);
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    html = html.replace(/\\n/g, '\n');
    return html;
}

function formatInlineMarkdown(text) {
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return html;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function truncateUrl(url) {
    try {
        const u = new URL(url);
        let display = u.hostname.replace('www.', '');
        if (u.pathname !== '/') {
            const path = u.pathname.slice(0, 30);
            display += path + (u.pathname.length > 30 ? '...' : '');
        }
        return display;
    } catch {
        return url.slice(0, 40) + (url.length > 40 ? '...' : '');
    }
}
