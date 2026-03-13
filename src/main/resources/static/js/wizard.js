'use strict';

const TOTAL_STEPS = 5;
let currentStep = 0;

document.addEventListener('DOMContentLoaded', () => {
    updateStepView();

    // Клиент: показ/скрытие поля нового клиента
    document.getElementById('wClientSelect').addEventListener('change', e => {
        document.getElementById('newClientSection')
                .classList.toggle('d-none', e.target.value !== '__new__');
    });

    document.getElementById('wCreateProxy').addEventListener('change', e => {
        document.getElementById('proxySection').classList.toggle('d-none', !e.target.checked);
    });

    document.getElementById('btnWizNext').addEventListener('click', () => {
        if (!validateStep(currentStep)) return;
        currentStep++;
        if (currentStep === TOTAL_STEPS - 1) buildPreview();
        updateStepView();
    });

    document.getElementById('btnWizBack').addEventListener('click', () => {
        currentStep--;
        updateStepView();
    });

    document.getElementById('btnBeautifyWizard').addEventListener('click', () => {
        const ta = document.getElementById('wBody');
        ta.value = JsonUtil.beautify(ta.value);
    });

    document.getElementById('wBody').addEventListener('input', () => {
        const err = document.getElementById('wBodyError');
        err.classList.toggle('d-none', JsonUtil.isValid(document.getElementById('wBody').value));
    });

    // KV-кнопки
    document.getElementById('btnAddQueryParam').addEventListener('click',
        () => addKvRow('queryParamsContainer', true));

    document.getElementById('btnAddRequestHeader').addEventListener('click',
        () => addKvRow('requestHeadersContainer', true));

    document.getElementById('btnWizSave').addEventListener('click', saveStubs);

    // Prefill если edit или clone режим
    if ((APP_DATA.editMode || APP_DATA.cloneMode) && APP_DATA.stub) {
        prefillWizard(APP_DATA.stub);
    }
});

// ─── Step navigation ──────────────────────────────────────────
function updateStepView() {
    for (let i = 0; i < TOTAL_STEPS; i++) {
        document.getElementById('wizStep' + i)?.classList.toggle('d-none', i !== currentStep);
    }
    document.getElementById('btnWizBack').classList.toggle('d-none', currentStep === 0);
    document.getElementById('btnWizNext').classList.toggle('d-none', currentStep === TOTAL_STEPS - 1);
    document.getElementById('btnWizSave').classList.toggle('d-none', currentStep !== TOTAL_STEPS - 1);

    document.querySelectorAll('.wizard-step-bubble').forEach((bubble, idx) => {
        bubble.classList.toggle('active', idx === currentStep);
        bubble.classList.toggle('completed', idx < currentStep);
    });
    document.querySelectorAll('.wizard-step-name').forEach((label, idx) => {
        label.classList.toggle('fw-semibold', idx === currentStep);
        label.classList.toggle('text-muted', idx !== currentStep);
    });
}

// ─── Validation ───────────────────────────────────────────────
function validateStep(step) {
    if (step === 0) {
        if (!document.getElementById('wName').value.trim()) {
            Toast.show('Введите название стаба', 'warning'); return false;
        }
        if (!document.getElementById('wUrl').value.trim()) {
            Toast.show('Введите URL', 'warning'); return false;
        }
    }
    if (step === 1) {
        const body = document.getElementById('wBody').value;
        if (body && !JsonUtil.isValid(body)) {
            Toast.show('Невалидный JSON в теле ответа', 'danger'); return false;
        }
    }
    return true;
}

// ─── Build stub JSON ──────────────────────────────────────────
function buildStubJson() {
    const method    = document.getElementById('wMethod').value;
    const urlType   = document.getElementById('wUrlType').value;
    const urlValue  = document.getElementById('wUrl').value.trim();
    const status    = parseInt(document.getElementById('wStatus').value);
    const ct        = document.getElementById('wContentType').value;
    const delay     = parseInt(document.getElementById('wDelay').value) || null;
    const bodyStr   = document.getElementById('wBody').value.trim();
    const handlebars = document.getElementById('wHandlebars').checked;

    // Клиент
    const clientSelect = document.getElementById('wClientSelect').value;
    let clientId   = clientSelect === '__new__' ? document.getElementById('wNewClientId').value.trim() : clientSelect;
    let clientName = clientSelect === '__new__' ? document.getElementById('wNewClientName').value.trim() : null;

    // Response body
    let responseBody = {};
    if (bodyStr) {
        if (ct === 'application/json') {
            try { responseBody.jsonBody = JSON.parse(bodyStr); }
            catch { responseBody.body = bodyStr; }
        } else {
            responseBody.body = bodyStr;
        }
    }
    if (delay) responseBody.fixedDelayMilliseconds = delay;
    if (handlebars) responseBody.transformers = ['response-template'];
    responseBody.headers = { 'Content-Type': ct };
    responseBody.status  = status;

    // Query params
    const queryParams = collectKvMap('queryParamsContainer');
    // Request headers
    const reqHeaders = collectKvMap('requestHeadersContainer');

    // Request
    const request = { method, [urlType]: urlValue };
    if (Object.keys(queryParams).length) request.queryParameters = queryParams;
    if (Object.keys(reqHeaders).length)  request.headers = reqHeaders;

    // Если выбран клиент — добавляем customMatcher
    if (clientId) {
        request.customMatcher = {
            name: 'jwt-matcher',
            parameters: {
                header:  { alg: 'HS256', typ: 'JWT' },
                payload: { externalId: clientId }
            }
        };
    }

    const stub = {
        name:     document.getElementById('wName').value.trim(),
        priority: clientId ? 1 : 5,
        persistent: true,
        request,
        response: responseBody
    };

    if (clientId) {
        stub.metadata = { clientId, ...(clientName ? { clientName } : {}) };
    }

    return stub;
}

function buildProxyJson(stub) {
    const proxyUrl    = document.getElementById('wProxyUrl').value.trim();
    const proxyMethod = document.getElementById('wProxyMethod').value;
    const urlType = document.getElementById('wUrlType').value;
    const urlValue = document.getElementById('wUrl').value.trim();
    return {
        name:       'PROXY → ' + stub.name,
        priority:   10,
        persistent: true,
        request:    { method: proxyMethod, [urlType]: urlValue },
        response:   { proxyBaseUrl: proxyUrl },
        metadata:   { proxyStub: true, description: 'Auto-proxy for: ' + stub.name }
    };
}

// ─── Preview ─────────────────────────────────────────────────
function buildPreview() {
    const stub = buildStubJson();
    document.getElementById('wPreviewJson').textContent = JSON.stringify(stub, null, 2);

    const createProxy = document.getElementById('wCreateProxy').checked;
    const proxyCard   = document.getElementById('wizProxyPreviewCard');
    proxyCard.classList.toggle('d-none', !createProxy);

    if (createProxy) {
        document.getElementById('wPreviewProxyJson').textContent =
            JSON.stringify(buildProxyJson(stub), null, 2);
    }
}

// ─── Save ────────────────────────────────────────────────────
async function saveStubs() {
    const btn = document.getElementById('btnWizSave');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сохранение...';
    try {
        const stub = buildStubJson();

        if (APP_DATA.editMode && APP_DATA.stubId) {
            // Редактирование — PUT с сохранением id
            stub.id = APP_DATA.stubId;
            await Api.put(`/stubs/${APP_DATA.stubId}`, stub);
        } else {
            // Создание или клонирование — POST
            await Api.post('/stubs', stub);
        }

        if (!APP_DATA.editMode && document.getElementById('wCreateProxy').checked) {
            const proxyUrl = document.getElementById('wProxyUrl').value.trim();
            if (proxyUrl) await Api.post('/stubs', buildProxyJson(stub));
        }

        Toast.show(APP_DATA.editMode ? 'Стаб обновлён!' : 'Стаб создан!', 'success');
        setTimeout(() => location.assign('/stubs'), 1000);
    } catch(e) {
        Toast.show('Ошибка: ' + e.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = APP_DATA.editMode
            ? '<i class="bi bi-floppy-fill"></i> Обновить'
            : '<i class="bi bi-floppy-fill"></i> Сохранить';
    }
}

// ─── KV Map collector ─────────────────────────────────────────
function collectKvMap(containerId) {
    const result = {};
    document.querySelectorAll(`#${containerId} .param-row, #${containerId} .header-row`).forEach(row => {
        const k  = row.querySelector('.kv-key')?.value.trim();
        const op = row.querySelector('.kv-op')?.value || 'equalTo';
        const v  = row.querySelector('.kv-value')?.value.trim();
        if (k && v) result[k] = { [op]: v };
    });
    return result;
}

function prefillWizard(stub) {
    if (!stub) return;
    const req  = stub.request  || {};
    const resp = stub.response || {};
    const meta = stub.metadata || {};

    // Шаг 0: Запрос
    document.getElementById('wName').value = stub.name || '';

    document.getElementById('wMethod').value =
        ['GET','POST','PUT','DELETE','PATCH','ANY'].includes(req.method)
            ? req.method : 'GET';

    // Определяем тип URL
    let urlType = 'urlPath', urlVal = '';
    if (req.urlPath)         { urlType = 'urlPath';        urlVal = req.urlPath; }
    else if (req.url)        { urlType = 'url';            urlVal = req.url; }
    else if (req.urlPathPattern) { urlType = 'urlPathPattern'; urlVal = req.urlPathPattern; }
    else if (req.urlPattern) { urlType = 'urlPattern';     urlVal = req.urlPattern; }
    else if (req.urlPathTemplate) { urlType = 'urlPathTemplate'; urlVal = req.urlPathTemplate; }

    document.getElementById('wUrlType').value = urlType;
    document.getElementById('wUrl').value     = urlVal;

    // Клиент из customMatcher или metadata
    const clientId = meta.clientId
        || req.customMatcher?.parameters?.payload?.externalId
        || '';

    if (clientId) {
        const select = document.getElementById('wClientSelect');
        // Ищем среди существующих клиентов
        const existing = [...select.options].find(o => o.value === clientId);
        if (existing) {
            select.value = clientId;
        } else {
            // Новый клиент
            select.value = '__new__';
            document.getElementById('newClientSection').classList.remove('d-none');
            document.getElementById('wNewClientId').value   = clientId;
            document.getElementById('wNewClientName').value = meta.clientName || '';
        }
    }

    // Шаг 1: Ответ
    const statusVal = String(resp.status || '200');
    const statusSel = document.getElementById('wStatus');
    if ([...statusSel.options].some(o => o.value === statusVal)) {
        statusSel.value = statusVal;
    }

    // Content-Type
    const ct = resp.headers?.['Content-Type'] || resp.headers?.['content-type'] || 'application/json';
    const ctSel = document.getElementById('wContentType');
    if ([...ctSel.options].some(o => o.value === ct)) ctSel.value = ct;

    // Задержка
    if (resp.fixedDelayMilliseconds) {
        document.getElementById('wDelay').value = resp.fixedDelayMilliseconds;
    }

    // Тело ответа
    let bodyStr = '';
    if (resp.jsonBody !== undefined && resp.jsonBody !== null) {
        bodyStr = JSON.stringify(resp.jsonBody, null, 2);
    } else if (resp.body) {
        bodyStr = resp.body;
    }
    document.getElementById('wBody').value = bodyStr;

    // Handlebars
    const hasHandlebars = Array.isArray(resp.transformers)
        && resp.transformers.includes('response-template');
    document.getElementById('wHandlebars').checked = hasHandlebars;

    // Шаг 2: Query params
    if (req.queryParameters) {
        for (const [key, matcher] of Object.entries(req.queryParameters)) {
            addKvRow('queryParamsContainer', true);
            const rows = document.querySelectorAll('#queryParamsContainer .param-row');
            const row  = rows[rows.length - 1];
            row.querySelector('.kv-key').value = key;
            const opEntry = Object.entries(matcher)[0];
            if (opEntry) {
                const opSel = row.querySelector('.kv-op');
                if (opSel && [...opSel.options].some(o => o.value === opEntry[0])) {
                    opSel.value = opEntry[0];
                }
                row.querySelector('.kv-value').value = opEntry[1] || '';
            }
        }
    }

    // Шаг 2: Request headers
    if (req.headers) {
        for (const [key, matcher] of Object.entries(req.headers)) {
            addKvRow('requestHeadersContainer', true);
            const rows = document.querySelectorAll('#requestHeadersContainer .header-row');
            const row  = rows[rows.length - 1];
            row.querySelector('.kv-key').value = key;
            const opEntry = Object.entries(matcher)[0];
            if (opEntry) {
                const opSel = row.querySelector('.kv-op');
                if (opSel && [...opSel.options].some(o => o.value === opEntry[0])) {
                    opSel.value = opEntry[0];
                }
                row.querySelector('.kv-value').value = opEntry[1] || '';
            }
        }
    }
}