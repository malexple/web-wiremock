'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let allRecordedStubs = [];
let pollTimer        = null;
let currentTarget    = '';

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initSourceToggle();
    initProxySelect();
    initProfileSelect();

    document.getElementById('btnStartRecording').addEventListener('click', startRecording);
    document.getElementById('btnStopRecording').addEventListener('click', stopRecording);
    document.getElementById('btnApplyRecording').addEventListener('click', applyRecording);
    document.getElementById('btnNewRecording').addEventListener('click', resetToConfig);
    document.getElementById('btnSelectAll').addEventListener('click', () => setAllChecked(true));
    document.getElementById('btnSelectNone').addEventListener('click', () => setAllChecked(false));

    // Если запись уже идёт (например, страница была перезагружена)
    if (APPDATA.currentStatus === 'Recording') {
        showRecordingState('...');
        startPolling();
    }
});

// ─── Source toggle ────────────────────────────────────────────────────────────
function initSourceToggle() {
    document.querySelectorAll('input[name="sourceType"]').forEach(radio => {
        radio.addEventListener('change', e => {
            const isManual = e.target.value === 'manual';
            document.getElementById('manualUrlSection').classList.toggle('d-none', !isManual);
            document.getElementById('proxySelectSection').classList.toggle('d-none', isManual);
        });
    });
}

function initProxySelect() {
    const select = document.getElementById('proxySelect');
    if (!select) return;
    select.addEventListener('change', () => {
        const stub = APPDATA.proxyStubs.find(s => s.id === select.value);
        if (stub) document.getElementById('targetUrl').value = stub.proxyBaseUrl;
    });
    // Автовыбор если прокси один
    if (APPDATA.proxyStubs.length === 1) {
        select.value = APPDATA.proxyStubs[0].id;
        document.getElementById('targetUrl').value = APPDATA.proxyStubs[0].proxyBaseUrl;
    }
}

function initProfileSelect() {
    document.getElementById('applyProfileSelect').addEventListener('change', e => {
        const isNew = e.target.value === '__new__';
        document.getElementById('applyProfileNew').classList.toggle('d-none', !isNew);
    });
}

// ─── Recording lifecycle ──────────────────────────────────────────────────────
async function startRecording() {
    const sourceType = document.querySelector('input[name="sourceType"]:checked')?.value;
    let targetBaseUrl = '';

    if (sourceType === 'proxy') {
        const proxyId = document.getElementById('proxySelect').value;
        const stub = APPDATA.proxyStubs.find(s => s.id === proxyId);
        targetBaseUrl = stub?.proxyBaseUrl || '';
    } else {
        targetBaseUrl = document.getElementById('targetUrl').value.trim();
    }

    if (!targetBaseUrl) {
        Toast.show('Укажите Target URL', 'warning');
        return;
    }

    const urlPathPattern    = document.getElementById('urlPathPattern').value.trim() || null;
    const repeatsAsScenarios = document.getElementById('repeatsAsScenarios').checked;

    const btn = document.getElementById('btnStartRecording');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Запуск...';

    try {
        await Api.post('/recording/start', { targetBaseUrl, urlPathPattern, repeatsAsScenarios });
        currentTarget = targetBaseUrl;
        showRecordingState(targetBaseUrl);
        startPolling();
        Toast.show('Запись запущена', 'success');
    } catch (e) {
        Toast.show(e.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-record-circle me-1"></i>Начать запись';
    }
}

async function stopRecording() {
    const btn = document.getElementById('btnStopRecording');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Остановка...';

    stopPolling();

    try {
        const stubs = await Api.post('/recording/stop', {});
        allRecordedStubs = stubs || [];
        showResultsState(allRecordedStubs);
        Toast.show(`Запись остановлена. Захвачено стабов: ${allRecordedStubs.length}`, 'success');
    } catch (e) {
        Toast.show(e.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-stop-circle me-1"></i>Остановить';
    }
}

async function applyRecording() {
    const checkedIds   = [...document.querySelectorAll('.stub-checkbox:checked')].map(cb => cb.value);
    const uncheckedIds = [...document.querySelectorAll('.stub-checkbox:not(:checked)')].map(cb => cb.value);

    if (checkedIds.length === 0 && uncheckedIds.length === 0) {
        Toast.show('Нет стабов для обработки', 'warning');
        return;
    }

    const clientId   = document.getElementById('applyClientSelect').value || null;
    const clientObj  = clientId ? APPDATA.clients.find(c => c.clientId === clientId) : null;
    const clientName = clientObj?.clientName || null;

    const profileSelectVal = document.getElementById('applyProfileSelect').value;
    let profileName = null;
    if (profileSelectVal === '__new__') {
        profileName = document.getElementById('applyProfileNew').value.trim() || null;
        if (!profileName) {
            Toast.show('Введите имя нового профиля', 'warning');
            return;
        }
    } else if (profileSelectVal) {
        profileName = profileSelectVal;
    }

    const btn = document.getElementById('btnApplyRecording');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Применение...';

    try {
        await Api.post('/recording/apply', {
            keepIds:    checkedIds,
            deleteIds:  uncheckedIds,
            clientId,
            clientName,
            profileName
        });

        const detail = [
            `сохранено ${checkedIds.length} стабов`,
            clientId   ? `привязаны к ${clientId}` : null,
            profileName ? `профиль «${profileName}»` : null
        ].filter(Boolean).join(', ');

        Toast.show(`Применено: ${detail}`, 'success');
        setTimeout(() => location.assign('/stubs'), 1500);
    } catch (e) {
        Toast.show(e.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Применить выбранные';
    }
}

// ─── Polling ──────────────────────────────────────────────────────────────────
function startPolling() {
    pollTimer = setInterval(async () => {
        try {
            const status = await Api.get('/recording/status');
            if (status !== 'Recording') {
                stopPolling();
            }
        } catch (_) { /* ignore */ }
    }, 2000);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

// ─── Phase transitions ────────────────────────────────────────────────────────
function showRecordingState(targetUrl) {
    document.getElementById('configSection').classList.add('d-none');
    document.getElementById('recordingSection').classList.remove('d-none');
    document.getElementById('resultsSection').classList.add('d-none');
    document.getElementById('recordingTargetLabel').textContent = targetUrl;
}

function showResultsState(stubs) {
    document.getElementById('configSection').classList.add('d-none');
    document.getElementById('recordingSection').classList.add('d-none');
    const section = document.getElementById('resultsSection');
    section.classList.remove('d-none');
    document.getElementById('recordedCount').textContent = stubs.length;
    renderStubList(stubs);
}

function resetToConfig() {
    allRecordedStubs = [];
    stopPolling();
    document.getElementById('configSection').classList.remove('d-none');
    document.getElementById('recordingSection').classList.add('d-none');
    document.getElementById('resultsSection').classList.add('d-none');

    const btn = document.getElementById('btnStartRecording');
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-record-circle me-1"></i>Начать запись';
}

// ─── Stub list ────────────────────────────────────────────────────────────────
function renderStubList(stubs) {
    const container = document.getElementById('stubListContainer');
    if (!stubs.length) {
        container.innerHTML = '<p class="text-muted text-center py-3">Нет записанных стабов</p>';
        return;
    }
    container.innerHTML = stubs.map(stub => {
        const methodCls  = methodBadgeClass(stub.method);
        const statusBadge = stub.responseStatus ? statusBadgeHtml(stub.responseStatus) : '';
        const scenarioBadge = stub.hasScenario
            ? `<span class="badge bg-info text-dark ms-1">
                   <i class="bi bi-arrow-repeat me-1"></i>Scenario: ${escHtml(stub.scenarioName || '')}
               </span>`
            : '';
        return `
            <div class="stub-row d-flex align-items-center gap-2 px-3 py-2">
                <input class="stub-checkbox" type="checkbox"
                       value="${escHtml(stub.id)}"
                       id="stub-${escHtml(stub.id)}" checked>
                <label class="flex-grow-1 d-flex align-items-center flex-wrap gap-1"
                       for="stub-${escHtml(stub.id)}">
                    <span class="badge ${methodCls}">${escHtml(stub.method)}</span>
                    <code class="small">${escHtml(stub.url)}</code>
                    ${statusBadge}
                    ${scenarioBadge}
                </label>
            </div>`;
    }).join('');
}

function setAllChecked(checked) {
    document.querySelectorAll('.stub-checkbox').forEach(cb => cb.checked = checked);
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
