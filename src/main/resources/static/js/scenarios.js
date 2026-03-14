'use strict';

// ─── State ────────────────────────────────────────────────────
let currentScenarioName = null;
let pollingTimer        = null;
let importModalInst     = null;
let newScenarioModalInst = null;
let availableStubs      = [];
let wizardCurrentStep   = 1;

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    importModalInst      = new bootstrap.Modal(document.getElementById('importScenarioModal'));
    newScenarioModalInst = new bootstrap.Modal(document.getElementById('newScenarioModal'));

    initSearch();
    initListClick();
    initButtons();
    initWizard();
    startPolling();

    const first = document.querySelector('.scenario-card');
    if (first) first.closest('.scenario-item').click();
});

// ─── Поиск ────────────────────────────────────────────────────
function initSearch() {
    document.getElementById('scenarioSearch').addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        document.querySelectorAll('#scenariosList .scenario-item').forEach(item => {
            item.style.display = !q || item.dataset.name.toLowerCase().includes(q) ? '' : 'none';
        });
    });
}

// ─── Клик по карточке ─────────────────────────────────────────
function initListClick() {
    document.getElementById('scenariosList').addEventListener('click', e => {
        const item = e.target.closest('.scenario-item');
        if (!item) return;
        selectScenario(item.dataset.name);
    });
}

function selectScenario(name) {
    document.querySelectorAll('.scenario-card').forEach(c =>
        c.classList.remove('border-primary', 'bg-primary-subtle'));
    const active = document.querySelector(
        `.scenario-item[data-name="${CSS.escape(name)}"] .scenario-card`);
    if (active) active.classList.add('border-primary', 'bg-primary-subtle');
    currentScenarioName = name;
    loadScenarioDetail(name);
}

// ─── Загрузка деталей ─────────────────────────────────────────
async function loadScenarioDetail(name) {
    try {
        const data = await Api.get(`/scenarios/${encodeURIComponent(name)}/state`);
        renderDetail(data);
        updateListCard(data);
    } catch (e) {
        Toast.show(e.message, 'danger');
    }
}

// ─── Рендер правой панели ─────────────────────────────────────
function renderDetail(sc) {
    document.getElementById('scenarioEmptyState').classList.add('d-none');
    document.getElementById('scenarioDetailContent').classList.remove('d-none');

    document.getElementById('detailName').textContent = sc.name;
    document.getElementById('detailCurrentState').textContent = sc.currentState;

    const globalBadge    = document.getElementById('detailGlobalBadge');
    const clientBadge    = document.getElementById('detailClientBadge');
    const completedBadge = document.getElementById('detailCompletedBadge');

    if (sc.global) {
        globalBadge.classList.remove('d-none');
        clientBadge.classList.add('d-none');
    } else {
        globalBadge.classList.add('d-none');
        clientBadge.classList.remove('d-none');
        clientBadge.textContent = sc.externalId;
    }
    completedBadge.classList.toggle('d-none', !sc.completed);

    const btnPrev = document.getElementById('btnStepPrev');
    const btnNext = document.getElementById('btnStepNext');
    btnPrev.disabled = !sc.prevState;
    btnNext.disabled = !sc.nextState && !sc.completed;
    btnPrev.dataset.state = sc.prevState || '';
    btnNext.dataset.state = sc.nextState || '';

    renderStepsChain(sc.steps, sc.currentState, sc.completed);
    renderStateSelect(sc.possibleStates, sc.currentState);
}

// ─── Цепочка шагов ────────────────────────────────────────────
function renderStepsChain(steps, currentState, completed) {
    const container = document.getElementById('stepsChain');
    if (!steps || steps.length === 0) {
        container.innerHTML = '<div class="text-muted small">Шаги не найдены</div>';
        return;
    }
    container.innerHTML = steps.map((step, idx) => {
        const isActive = step.requiredState === currentState;
        const isPast   = !isActive && isStepPast(step, steps, currentState, completed);
        const cardClass = isActive
            ? 'border-primary bg-primary-subtle'
            : isPast ? 'border-success bg-success-subtle opacity-75'
            : 'border-secondary-subtle';
        const iconHtml = isActive
            ? '<i class="bi bi-play-circle-fill text-primary"></i>'
            : isPast ? '<i class="bi bi-check-circle-fill text-success"></i>'
            : '<i class="bi bi-circle text-secondary"></i>';
        const methodClass = methodBadgeClass(step.method);
        const statusHtml  = step.responseStatus ? statusBadgeHtml(step.responseStatus) : '';
        const connector   = idx < steps.length - 1
            ? `<div class="d-flex justify-content-start ps-3 my-0">
                   <div style="width:2px;height:20px;background:var(--bs-border-color)"></div>
               </div>` : '';
        return `
            <div class="step-card rounded border p-2 ${cardClass}">
                <div class="d-flex align-items-start gap-2">
                    <div class="mt-1 flex-shrink-0">${iconHtml}</div>
                    <div class="flex-grow-1 min-w-0">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <span class="badge bg-secondary" style="font-size:0.65rem">Шаг ${step.index}</span>
                            <span class="small fw-semibold text-truncate"
                                  title="${escHtml(step.requiredState)}">${escHtml(step.requiredState)}</span>
                            ${isActive ? '<span class="badge bg-primary ms-auto" style="font-size:0.6rem">▶ Активен</span>' : ''}
                        </div>
                        <div class="d-flex align-items-center gap-2 flex-wrap">
                            <span class="badge ${methodClass}">${escHtml(step.method || '—')}</span>
                            <code class="small text-truncate" style="max-width:250px"
                                  title="${escHtml(step.url)}">${escHtml(step.url || '—')}</code>
                            ${statusHtml}
                        </div>
                        <div class="mt-1 text-muted" style="font-size:0.7rem">
                            ${step.newState
                                ? `→ <span class="font-monospace">${escHtml(step.newState)}</span>`
                                : '→ конец'}
                        </div>
                    </div>
                </div>
            </div>${connector}`;
    }).join('');
}

function isStepPast(step, steps, currentState, completed) {
    if (completed) return true;
    const cur  = steps.findIndex(s => s.requiredState === currentState);
    const self = steps.findIndex(s => s.requiredState === step.requiredState);
    return self < cur;
}

function renderStateSelect(possibleStates, currentState) {
    const sel = document.getElementById('manualStateSelect');
    sel.innerHTML = (possibleStates || [])
        .map(s => `<option value="${escHtml(s)}" ${s === currentState ? 'selected' : ''}>
                       ${escHtml(s)}</option>`)
        .join('');
}

function updateListCard(sc) {
    const item = document.querySelector(`.scenario-item[data-name="${CSS.escape(sc.name)}"]`);
    if (!item) return;
    const badge = item.querySelector('.badge.bg-primary, .badge.bg-success');
    if (!badge) return;
    if (sc.completed) {
        badge.className = 'badge bg-success';
        badge.innerHTML = '<i class="bi bi-check2-all"></i> Завершён';
    } else {
        badge.className = 'badge bg-primary';
        badge.style.fontSize = '0.65rem';
        badge.textContent = sc.currentState;
    }
}

// ─── Кнопки ───────────────────────────────────────────────────
function initButtons() {
    document.getElementById('btnResetAll').addEventListener('click', async () => {
        if (!confirm('Сбросить ВСЕ сценарии в Started?')) return;
        await actionWithToast(() => Api.post('/scenarios/reset-all'), 'Все сценарии сброшены');
        if (currentScenarioName) await loadScenarioDetail(currentScenarioName);
    });

    document.getElementById('btnResetScenario').addEventListener('click', async () => {
        if (!currentScenarioName) return;
        await actionWithToast(
            () => Api.post(`/scenarios/${encodeURIComponent(currentScenarioName)}/reset`),
            `Сценарий '${currentScenarioName}' сброшен`
        );
        await loadScenarioDetail(currentScenarioName);
    });

    document.getElementById('btnStepPrev').addEventListener('click', async () => {
        const state = document.getElementById('btnStepPrev').dataset.state;
        if (!state || !currentScenarioName) return;
        await setStateAndRefresh(state);
    });

    document.getElementById('btnStepNext').addEventListener('click', async () => {
        const state = document.getElementById('btnStepNext').dataset.state;
        if (!state || !currentScenarioName) return;
        await setStateAndRefresh(state);
    });

    document.getElementById('btnSetState').addEventListener('click', async () => {
        const state = document.getElementById('manualStateSelect').value;
        if (!state || !currentScenarioName) return;
        await setStateAndRefresh(state);
    });

    document.getElementById('btnExportScenario').addEventListener('click', () => {
        if (!currentScenarioName) return;
        location.assign(`/scenarios/${encodeURIComponent(currentScenarioName)}/export`);
    });

    document.getElementById('btnDeleteScenario').addEventListener('click', async () => {
        if (!currentScenarioName) return;
        if (!confirm(`Удалить сценарий '${currentScenarioName}' и все его стабы?`)) return;
        try {
            await Api.delete(`/scenarios/${encodeURIComponent(currentScenarioName)}`);
            Toast.show(`Сценарий '${currentScenarioName}' удалён`, 'success');
            document.querySelector(
                `.scenario-item[data-name="${CSS.escape(currentScenarioName)}"]`)?.remove();
            currentScenarioName = null;
            document.getElementById('scenarioDetailContent').classList.add('d-none');
            document.getElementById('scenarioEmptyState').classList.remove('d-none');
        } catch (e) { Toast.show(e.message, 'danger'); }
    });

    // Кнопки открытия мастера
    const openWizard = () => openNewScenarioWizard();
    document.getElementById('btnNewScenario').addEventListener('click', openWizard);
    document.getElementById('btnNewScenarioEmpty').addEventListener('click', openWizard);

    // Импорт
    document.getElementById('btnImportScenario').addEventListener('click', () =>
        importModalInst.show());

    document.getElementById('btnConfirmImportScenario').addEventListener('click', async () => {
        const file = document.getElementById('importScenarioFile').files[0];
        if (!file) { Toast.show('Выберите файл', 'warning'); return; }
        const mode = document.querySelector('input[name="importScenarioMode"]:checked').value;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('mode', mode);
        try {
            const resp = await fetch('/scenarios/import', { method: 'POST', body: formData });
            const json = await resp.json();
            if (!resp.ok) throw new Error(json.message || `HTTP ${resp.status}`);
            importModalInst.hide();
            Toast.show(json.message, 'success');
            setTimeout(() => location.reload(), 800);
        } catch (e) { Toast.show(e.message, 'danger'); }
    });
}

// ═══ Мастер создания сценария ═════════════════════════════════

async function openNewScenarioWizard() {
    // Сбрасываем состояние мастера
    wizardCurrentStep = 1;
    document.getElementById('wizScenarioName').value = '';
    document.getElementById('wizExternalId').value = '';
    document.querySelector('input[name="wizClientMode"][value="client"]').checked = true;
    document.getElementById('wizExternalIdBlock').classList.remove('d-none');
    document.getElementById('wizGlobalWarning').classList.add('d-none');
    updateWizardStep(1);

    // Загружаем доступные стабы для шага 2
    try {
        availableStubs = await Api.get('/scenarios/available-stubs');
    } catch (e) {
        availableStubs = [];
    }

    // Добавляем первый шаг по умолчанию
    document.getElementById('wizStepsList').innerHTML = '';
    addWizardStep();

    newScenarioModalInst.show();
}

function initWizard() {
    // Переключение client/global
    document.querySelectorAll('input[name="wizClientMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const isGlobal = radio.value === 'global' && radio.checked;
            document.getElementById('wizExternalIdBlock')
                .classList.toggle('d-none', isGlobal);
            document.getElementById('wizGlobalWarning')
                .classList.toggle('d-none', !isGlobal);
        });
    });

    // Навигация мастера
    document.getElementById('btnWizNext').addEventListener('click', () => {
        if (!validateWizardStep(wizardCurrentStep)) return;
        if (wizardCurrentStep === 2) renderWizardSummary();
        updateWizardStep(wizardCurrentStep + 1);
    });

    document.getElementById('btnWizPrev').addEventListener('click', () =>
        updateWizardStep(wizardCurrentStep - 1));

    // Добавить шаг
    document.getElementById('btnAddStep').addEventListener('click', addWizardStep);

    // Создать сценарий
    document.getElementById('btnWizCreate').addEventListener('click', submitNewScenario);
}

function updateWizardStep(step) {
    wizardCurrentStep = step;

    // Показываем/скрываем панели
    document.getElementById('wizardStep1').classList.toggle('d-none', step !== 1);
    document.getElementById('wizardStep2').classList.toggle('d-none', step !== 2);
    document.getElementById('wizardStep3').classList.toggle('d-none', step !== 3);

    // Кнопки
    document.getElementById('btnWizPrev').classList.toggle('d-none', step === 1);
    document.getElementById('btnWizNext').classList.toggle('d-none', step === 3);
    document.getElementById('btnWizCreate').classList.toggle('d-none', step !== 3);

    // Индикатор шагов
    document.querySelectorAll('.wizard-step-dot').forEach(dot => {
        const n = parseInt(dot.dataset.step);
        dot.classList.toggle('active', n === step);
        dot.classList.toggle('done', n < step);
    });
}

function validateWizardStep(step) {
    if (step === 1) {
        const name = document.getElementById('wizScenarioName').value.trim();
        if (!name) {
            document.getElementById('wizScenarioName').focus();
            Toast.show('Введите название сценария', 'warning');
            return false;
        }
        const isClient = document.querySelector(
            'input[name="wizClientMode"][value="client"]').checked;
        if (isClient && !document.getElementById('wizExternalId').value.trim()) {
            document.getElementById('wizExternalId').focus();
            Toast.show('Введите externalId или выберите "Глобальный"', 'warning');
            return false;
        }
    }
    if (step === 2) {
        const stepsRows = document.querySelectorAll('#wizStepsList .wiz-step-row');
        if (stepsRows.length === 0) {
            Toast.show('Добавьте хотя бы один шаг', 'warning');
            return false;
        }
        for (const row of stepsRows) {
            const srcType = row.querySelector('.wiz-src-type').value;
            if (srcType === 'new') {
                const urlPath = row.querySelector('.wiz-url').value.trim();
                if (!urlPath) {
                    row.querySelector('.wiz-url').focus();
                    Toast.show('Укажите URL для нового стаба', 'warning');
                    return false;
                }
            }
        }
    }
    return true;
}

function addWizardStep() {
    const list    = document.getElementById('wizStepsList');
    const index   = list.querySelectorAll('.wiz-step-row').length + 1;
    const isFirst = index === 1;

    // Формируем опции стабов для select
    const stubOptions = availableStubs
        .filter(s => !s.scenarioName) // только стабы не в сценарии
        .map(s => `<option value="${escHtml(s.id)}">${escHtml(s.name || s.id)}</option>`)
        .join('');

    const div = document.createElement('div');
    div.className = 'wiz-step-row card p-2';
    div.innerHTML = `
        <div class="d-flex align-items-center gap-2 mb-2">
            <span class="badge bg-secondary">Шаг ${index}</span>
            <input type="text" class="form-control form-control-sm wiz-state-label"
                   placeholder="${isFirst ? 'Started (фиксировано)' : 'Название состояния (Step ' + index + ')'}"
                   value="${isFirst ? 'Started' : ''}"
                   ${isFirst ? 'disabled' : ''}/>
            ${!isFirst
                ? `<button type="button" class="btn btn-sm btn-outline-danger wiz-btn-remove flex-shrink-0">
                       <i class="bi bi-x-lg"></i>
                   </button>`
                : ''}
        </div>
        <div class="mb-2">
            <select class="form-select form-select-sm wiz-src-type">
                <option value="new">Создать новый стаб</option>
                ${stubOptions ? '<option value="clone">Клонировать существующий стаб</option>' : ''}
            </select>
        </div>
        <!-- Поля нового стаба -->
        <div class="wiz-new-stub-fields">
            <div class="row g-2">
                <div class="col-3">
                    <select class="form-select form-select-sm wiz-method">
                        <option>GET</option><option>POST</option><option>PUT</option>
                        <option>DELETE</option><option>PATCH</option>
                    </select>
                </div>
                <div class="col-9">
                    <input type="text" class="form-control form-control-sm wiz-url"
                           placeholder="/api/v1/resource"/>
                </div>
                <div class="col-4">
                    <input type="number" class="form-control form-control-sm wiz-status"
                           value="200" min="100" max="599" placeholder="Статус"/>
                </div>
                <div class="col-8">
                    <select class="form-select form-select-sm wiz-content-type">
                        <option value="application/json">application/json</option>
                        <option value="text/plain">text/plain</option>
                        <option value="text/xml">text/xml</option>
                    </select>
                </div>
                <div class="col-12">
                    <textarea class="form-control form-control-sm wiz-body font-monospace"
                              rows="3" placeholder='{"key": "value"}'></textarea>
                </div>
            </div>
        </div>
        <!-- Поля клонирования (скрыты по умолчанию) -->
        <div class="wiz-clone-fields d-none">
            <select class="form-select form-select-sm wiz-clone-select">
                ${stubOptions}
            </select>
        </div>`;

    // Переключение new/clone
    div.querySelector('.wiz-src-type').addEventListener('change', e => {
        div.querySelector('.wiz-new-stub-fields')
            .classList.toggle('d-none', e.target.value !== 'new');
        div.querySelector('.wiz-clone-fields')
            .classList.toggle('d-none', e.target.value !== 'clone');
    });

    // Удалить шаг
    div.querySelector('.wiz-btn-remove')?.addEventListener('click', () => {
        div.remove();
        renumberWizardSteps();
    });

    list.appendChild(div);
}

function renumberWizardSteps() {
    document.querySelectorAll('#wizStepsList .wiz-step-row').forEach((row, i) => {
        row.querySelector('.badge').textContent = `Шаг ${i + 1}`;
        if (i > 0) {
            const inp = row.querySelector('.wiz-state-label');
            if (inp && !inp.value) inp.placeholder = `Название состояния (Step ${i + 1})`;
        }
    });
}

function renderWizardSummary() {
    const name       = document.getElementById('wizScenarioName').value.trim();
    const isGlobal   = document.querySelector(
        'input[name="wizClientMode"][value="global"]').checked;
    const externalId = isGlobal ? null
        : document.getElementById('wizExternalId').value.trim();

    const rows = document.querySelectorAll('#wizStepsList .wiz-step-row');
    let stateChain = ['Started'];
    rows.forEach((row, i) => {
        if (i === 0) return;
        const label = row.querySelector('.wiz-state-label').value.trim()
                      || `Step ${i + 1}`;
        stateChain.push(label);
    });

    let html = `
        <div class="mb-2">
            <strong>Сценарий:</strong>
            <span class="font-monospace ms-1">${escHtml(name)}</span>
        </div>
        <div class="mb-3">
            <strong>Клиент:</strong>
            ${externalId
                ? `<span class="badge bg-info text-dark ms-1">${escHtml(externalId)}</span>`
                : '<span class="badge bg-warning text-dark ms-1">GLOBAL</span>'}
        </div>
        <div class="small text-muted mb-2 fw-semibold">Цепочка состояний:</div>
        <div class="d-flex align-items-center gap-1 flex-wrap mb-3">`;

    stateChain.forEach((state, i) => {
        html += `<span class="badge ${i === 0 ? 'bg-primary' : 'bg-secondary'}">${escHtml(state)}</span>`;
        if (i < stateChain.length - 1) html += '<i class="bi bi-arrow-right text-muted"></i>';
    });

    html += '</div><div class="small text-muted mb-2 fw-semibold">Стабы:</div><ul class="mb-0 small">';
    rows.forEach((row, i) => {
        const srcType = row.querySelector('.wiz-src-type').value;
        const state   = stateChain[i];
        if (srcType === 'new') {
            const method = row.querySelector('.wiz-method').value;
            const url    = row.querySelector('.wiz-url').value.trim() || '/';
            const status = row.querySelector('.wiz-status').value || '200';
            html += `<li><span class="badge ${methodBadgeClass(method)}">${method}</span>
                         <code class="ms-1">${escHtml(url)}</code>
                         → <strong>${escHtml(status)}</strong>
                         <span class="text-muted ms-1">[${escHtml(state)}]</span></li>`;
        } else {
            const sel  = row.querySelector('.wiz-clone-select');
            const name = sel.options[sel.selectedIndex]?.text || sel.value;
            html += `<li>Клон: <em>${escHtml(name)}</em>
                         <span class="text-muted ms-1">[${escHtml(state)}]</span></li>`;
        }
    });
    html += '</ul>';

    document.getElementById('wizSummary').innerHTML = html;
}

async function submitNewScenario() {
    const name     = document.getElementById('wizScenarioName').value.trim();
    const isGlobal = document.querySelector(
        'input[name="wizClientMode"][value="global"]').checked;
    const externalId = isGlobal
        ? null : document.getElementById('wizExternalId').value.trim() || null;

    const rows = document.querySelectorAll('#wizStepsList .wiz-step-row');
    const steps = Array.from(rows).map((row, i) => {
        const srcType    = row.querySelector('.wiz-src-type').value;
        const stateLabel = i === 0 ? 'Started'
            : (row.querySelector('.wiz-state-label').value.trim() || `Step ${i + 1}`);

        if (srcType === 'clone') {
            return {
                stateLabel,
                sourceStubId: row.querySelector('.wiz-clone-select').value
            };
        }
        return {
            stateLabel,
            method:         row.querySelector('.wiz-method').value,
            urlPath:        row.querySelector('.wiz-url').value.trim(),
            responseStatus: parseInt(row.querySelector('.wiz-status').value) || 200,
            contentType:    row.querySelector('.wiz-content-type').value,
            responseBody:   row.querySelector('.wiz-body').value.trim()
        };
    });

    const btn = document.getElementById('btnWizCreate');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Создаём...';

    try {
        const result = await Api.post('/scenarios', { scenarioName: name, externalId, steps });
        newScenarioModalInst.hide();
        Toast.show(`Сценарий '${name}' создан (${steps.length} шагов)`, 'success');
        setTimeout(() => location.reload(), 800);
    } catch (e) {
        Toast.show(e.message, 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-diagram-3-fill me-1"></i>Создать сценарий';
    }
}

// ─── Polling ──────────────────────────────────────────────────
function startPolling() {
    pollingTimer = setInterval(async () => {
        if (!currentScenarioName) return;
        try {
            const data = await Api.get(
                `/scenarios/${encodeURIComponent(currentScenarioName)}/state`);
            renderDetail(data);
            updateListCard(data);
        } catch { /* тихо */ }
    }, 3000);
}

// ─── Helpers ──────────────────────────────────────────────────
async function setStateAndRefresh(state) {
    try {
        await Api.put(`/scenarios/${encodeURIComponent(currentScenarioName)}/state`, { state });
        await loadScenarioDetail(currentScenarioName);
    } catch (e) { Toast.show(e.message, 'danger'); }
}

async function actionWithToast(fn, successMsg) {
    try { await fn(); Toast.show(successMsg, 'success'); }
    catch (e) { Toast.show(e.message, 'danger'); }
}

function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
