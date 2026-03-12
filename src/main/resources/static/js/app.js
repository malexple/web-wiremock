'use strict';

// ─── Toast helper ──────────────────────────────────────────────
const Toast = {
    show(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const bg = { success: 'bg-success', danger: 'bg-danger',
                     warning: 'bg-warning text-dark', info: 'bg-info text-dark' }[type] || 'bg-secondary';
        const id = 'toast-' + Date.now();
        container.insertAdjacentHTML('beforeend', `
            <div id="${id}" class="toast align-items-center text-white ${bg} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto"
                            data-bs-dismiss="toast"></button>
                </div>
            </div>`);
        const el = document.getElementById(id);
        const t = new bootstrap.Toast(el, { delay: 3500 });
        t.show();
        el.addEventListener('hidden.bs.toast', () => el.remove());
    }
};

// ─── API helper ────────────────────────────────────────────────
const Api = {
    async request(method, url, body = null) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        };
        if (body !== null) opts.body = JSON.stringify(body);
        const resp = await fetch(url, opts);
        const json = await resp.json().catch(() => null);
        if (!resp.ok || (json && json.success === false)) {
            throw new Error(json?.message || `HTTP ${resp.status}`);
        }
        return json?.data !== undefined ? json.data : json;
    },
    get:    (url)          => Api.request('GET', url),
    post:   (url, body)    => Api.request('POST', url, body),
    put:    (url, body)    => Api.request('PUT', url, body),
    delete: (url)          => Api.request('DELETE', url),
};

// ─── JSON helpers ──────────────────────────────────────────────
const JsonUtil = {
    beautify(str) {
        try {
            return JSON.stringify(JSON.parse(str), null, 2);
        } catch {
            return str;
        }
    },
    isValid(str) {
        if (!str || !str.trim()) return true;
        try { JSON.parse(str); return true; } catch { return false; }
    }
};

// ─── Splitter (drag to resize) ────────────────────────────────
function initSplitter(splitterId, leftId) {
    const splitter = document.getElementById(splitterId);
    const left     = document.getElementById(leftId);
    if (!splitter || !left) return;
    let dragging = false, startX = 0, startW = 0;

    splitter.addEventListener('mousedown', e => {
        dragging = true; startX = e.clientX; startW = left.offsetWidth;
        splitter.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const w = Math.max(150, Math.min(startW + e.clientX - startX, window.innerWidth * 0.6));
        left.style.width = w + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        splitter.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });
}

// ─── Method badge css class ───────────────────────────────────
function methodBadgeClass(method) {
    const m = (method || 'ANY').toUpperCase();
    const map = {
        GET: 'bg-success', POST: 'bg-primary', PUT: 'bg-warning text-dark',
        DELETE: 'bg-danger', PATCH: 'bg-info text-dark',
        HEAD: 'bg-secondary', OPTIONS: 'bg-secondary', ANY: 'bg-purple'
    };
    return map[m] || 'bg-secondary';
}

// ─── Status badge ─────────────────────────────────────────────
function statusBadgeHtml(code) {
    let cls = 'status-0xx';
    if      (code >= 200 && code < 300) cls = 'status-2xx';
    else if (code >= 300 && code < 400) cls = 'status-3xx';
    else if (code >= 400 && code < 500) cls = 'status-4xx';
    else if (code >= 500)               cls = 'status-5xx';
    return `<span class="badge ${cls}">${code}</span>`;
}

// ─── WireMock health ping ─────────────────────────────────────
async function checkWiremockHealth() {
    const badge = document.getElementById('wiremockStatus');
    if (!badge) return;
    try {
        await fetch('/run-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: 'GET', url: '/__admin/health' })
        });
        badge.innerHTML = '<i class="bi bi-circle-fill text-success"></i> WireMock';
        badge.classList.replace('bg-secondary', 'bg-dark');
    } catch {
        badge.innerHTML = '<i class="bi bi-circle-fill text-danger"></i> WireMock';
    }
}

document.addEventListener('DOMContentLoaded', () => checkWiremockHealth());
