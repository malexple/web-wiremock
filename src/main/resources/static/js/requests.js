'use strict';

// ─── State ────────────────────────────────────────────────────
// APP_DATA.requests — полный список объектов LoggedRequest из Thymeleaf
const requestsMap = new Map(
    (APP_DATA.requests || []).map(r => [r.id, r])
);

document.addEventListener('DOMContentLoaded', () => {
    initSplitter('requestSplitter', 'requestsTablePane');
    initRowClick();
    initReqTabs();
    initQuickSearch();
    initButtons();
});

// ─── Row click ────────────────────────────────────────────────
function initRowClick() {
    document.getElementById('requestsBody').addEventListener('click', e => {
        const row = e.target.closest('.request-row');
        if (!row) return;
        document.querySelectorAll('.request-row.selected')
                .forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        const req = requestsMap.get(row.dataset.id);
        if (req) renderDetail(req);
    });
}

// ─── Render full detail ───────────────────────────────────────
function renderDetail(req) {
    document.getElementById('reqEmptyState').classList.add('d-none');
    document.getElementById('reqDetailContent').classList.remove('d-none');

    // Метод + URL
    const badge = document.getElementById('reqMethodBadge');
    badge.textContent = req.method || '?';
    badge.className = 'badge fs-6 flex-shrink-0 ' + methodBadgeClass(req.method);
    document.getElementById('reqUrl').textContent = req.absoluteUrl || req.url || '';

    // Мета
    document.getElementById('reqDate').textContent    = req.loggedDateString || '—';
    document.getElementById('reqIp').textContent      = req.clientIp || '—';
    document.getElementById('reqTimingVal').textContent =
        req.timing ? `${req.timing.totalTime} мс` : '—';

    // Matched / Unmatched
    const matchedBlock   = document.getElementById('reqMatchedBlock');
    const unmatchedBadge = document.getElementById('reqUnmatchedBadge');
    if (req.wasMatched && req.matchedStubId?.id) {
        matchedBlock.classList.remove('d-none');
        unmatchedBadge.classList.add('d-none');
        const link = document.getElementById('reqMatchedLink');
        link.textContent = req.matchedStubId.id;
        link.href = `/stubs?selectedId=${req.matchedStubId.id}`;
    } else {
        matchedBlock.classList.add('d-none');
        unmatchedBadge.classList.toggle('d-none', !!req.wasMatched);
    }

    // ── Headers ──
    const headersBody = document.getElementById('reqHeadersBody');
    const headers = req.headers || {};
    const headerEntries = Object.entries(headers);
    document.getElementById('reqHeadersCount').textContent = headerEntries.length || '';
    if (headerEntries.length === 0) {
        headersBody.innerHTML = '<tr><td colspan="2" class="text-muted small">Нет заголовков</td></tr>';
    } else {
        headersBody.innerHTML = headerEntries
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `
                <tr>
                    <td class="font-monospace small text-info fw-semibold">${escHtml(k)}</td>
                    <td class="font-monospace small text-break">${escHtml(String(v))}</td>
                </tr>`)
            .join('');
    }

    // ── Body ──
    const bodyContent = document.getElementById('reqBodyContent');
    if (req.body && req.body.trim()) {
        bodyContent.textContent = tryBeautify(req.body);
    } else {
        bodyContent.textContent = '(пустое тело)';
        bodyContent.style.color = '#6c757d';
    }

    // ── Timing ──
    renderTiming(req.timing);

    // ── Cookies ──
    const cookiesBody = document.getElementById('reqCookiesBody');
    const cookies = req.cookies || {};
    const cookieEntries = Object.entries(cookies);
    if (cookieEntries.length === 0) {
        cookiesBody.innerHTML = '<tr><td colspan="2" class="text-muted small">Нет cookies</td></tr>';
    } else {
        cookiesBody.innerHTML = cookieEntries
            .map(([k, v]) => `
                <tr>
                    <td class="font-monospace small text-info">${escHtml(k)}</td>
                    <td class="font-monospace small">${escHtml(String(v))}</td>
                </tr>`)
            .join('');
    }

    // Сбрасываем на первую вкладку
    switchReqTab('headers');
}

// ─── Timing render ────────────────────────────────────────────
function renderTiming(timing) {
    const body = document.getElementById('reqTimingBody');
    const bar  = document.getElementById('reqTimingBar');
    if (!timing) {
        body.innerHTML = '<tr><td colspan="2" class="text-muted small">Нет данных</td></tr>';
        bar.innerHTML  = '';
        return;
    }

    const rows = [
        ['Добавленная задержка (addedDelay)',     timing.addedDelay,        'bg-info'],
        ['Обработка запроса (processTime)',        timing.processTime,       'bg-primary'],
        ['Отправка ответа (responseSendTime)',     timing.responseSendTime,  'bg-success'],
        ['Общее время (totalTime)',                timing.totalTime,         'bg-warning text-dark'],
    ];

    body.innerHTML = rows.map(([label, val]) => `
        <tr>
            <td class="small text-muted">${label}</td>
            <td class="small font-monospace fw-semibold">${val != null ? val + ' мс' : '—'}</td>
        </tr>`).join('');

    // Визуальные полоски — пропорционально totalTime
    const total = timing.totalTime || 1;
    bar.innerHTML = rows
        .filter(([, val]) => val != null && val > 0)
        .map(([label, val, cls]) => {
            const pct = Math.min(100, Math.round((val / total) * 100));
            return `
            <div class="d-flex align-items-center gap-2 mb-1" style="font-size:0.75rem">
                <div class="text-muted" style="width:260px;white-space:nowrap;overflow:hidden;
                                               text-overflow:ellipsis">${label}</div>
                <div class="flex-grow-1 bg-light rounded" style="height:14px">
                    <div class="${cls} rounded" style="height:14px;width:${pct}%;
                                                       transition:width 0.3s"></div>
                </div>
                <div class="font-monospace" style="width:55px;text-align:right">${val} мс</div>
            </div>`;
        }).join('');
}

// ─── Tabs ─────────────────────────────────────────────────────
function initReqTabs() {
    document.getElementById('reqTabs')?.addEventListener('click', e => {
        const btn = e.target.closest('[data-req-tab]');
        if (!btn) return;
        switchReqTab(btn.dataset.reqTab);
    });
}

function switchReqTab(tab) {
    const tabs = ['headers', 'body', 'timing', 'cookies'];
    document.querySelectorAll('#reqTabs .nav-link').forEach(b => {
        b.classList.toggle('active', b.dataset.reqTab === tab);
    });
    tabs.forEach(t => {
        document.getElementById('req-tab-' + t)
                ?.classList.toggle('d-none', t !== tab);
    });
}

// ─── Quick search (клиентский, без перезагрузки) ──────────────
function initQuickSearch() {
    const input = document.getElementById('quickSearch');
    if (!input) return;
    input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        document.querySelectorAll('#requestsBody .request-row').forEach(row => {
            const id  = row.dataset.id;
            const req = requestsMap.get(id);
            if (!req) { row.style.display = ''; return; }

            const inUrl  = (req.url || '').toLowerCase().includes(q);
            const inBody = (req.body || '').toLowerCase().includes(q);
            const inHdr  = JSON.stringify(req.headers || {}).toLowerCase().includes(q);
            row.style.display = (!q || inUrl || inBody || inHdr) ? '' : 'none';
        });
    });
}

// ─── Кнопки обновить / очистить ───────────────────────────────
function initButtons() {
    document.getElementById('btnBeautifyReqBody')?.addEventListener('click', () => {
        const pre = document.getElementById('reqBodyContent');
        pre.textContent = tryBeautify(pre.textContent);
    });

    document.getElementById('btnRefreshLog')?.addEventListener('click', async () => {
        try {
            const params = new URLSearchParams(location.search);
            const data   = await Api.get(`/requests/data?${params.toString()}`);
            rebuildTable(data);
            // Обновляем MAP
            requestsMap.clear();
            data.forEach(r => requestsMap.set(r.id, r));
            Toast.show(`Обновлено: ${data.length} записей`, 'info');
        } catch (e) { Toast.show('Ошибка: ' + e.message, 'danger'); }
    });

    document.getElementById('btnClearLog')?.addEventListener('click', async () => {
        if (!confirm('Очистить журнал запросов WireMock?')) return;
        try {
            await Api.delete('/requests');
            Toast.show('Журнал очищен', 'success');
            setTimeout(() => location.reload(), 600);
        } catch (e) { Toast.show('Ошибка: ' + e.message, 'danger'); }
    });
}

// ─── Rebuild table after AJAX refresh ────────────────────────
function rebuildTable(requests) {
    const tbody = document.getElementById('requestsBody');
    if (!requests || requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-5">
            <i class="bi bi-inbox display-6 d-block mb-2 opacity-25"></i>
            Нет запросов</td></tr>`;
        return;
    }
    const methodColors = {
        GET: 'bg-success', POST: 'bg-primary', PUT: 'bg-warning text-dark',
        DELETE: 'bg-danger', PATCH: 'bg-info text-dark'
    };
    tbody.innerHTML = requests.map(r => {
        const cls     = methodColors[r.method] || 'bg-secondary';
        const matched = r.wasMatched
            ? '<i class="bi bi-check-circle-fill text-success"></i>'
            : '<i class="bi bi-x-circle-fill text-warning"></i>';
        const total = r.timing?.totalTime ? r.timing.totalTime + ' мс' : '—';
        const warn  = !r.wasMatched ? 'table-warning' : '';
        return `<tr class="request-row ${warn}" data-id="${r.id}">
            <td><span class="badge ${cls}">${r.method}</span></td>
            <td class="font-monospace small req-url-cell">${escHtml(r.url || '')}</td>
            <td class="text-center">${matched}</td>
            <td class="small text-muted">${r.loggedDateString || ''}</td>
            <td class="small text-muted font-monospace">${total}</td>
        </tr>`;
    }).join('');
    initRowClick();
}

// ─── Utils ────────────────────────────────────────────────────
function tryBeautify(str) {
    if (!str) return '';
    try { return JSON.stringify(JSON.parse(str), null, 2); }
    catch { return str; }
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
