'use strict';

const APPDATA = JSON.parse(document.getElementById('appdata').textContent);

let parsedSpec = null;
let allEndpoints = [];
let activeTag = null;

document.addEventListener('DOMContentLoaded', () => {
    initSourceTabs();
    initButtons();
});

// ─── Вкладки источника ────────────────────────────────────────
function initSourceTabs() {
    document.getElementById('specSourceTabs').addEventListener('click', e => {
        const btn = e.target.closest('[data-source-tab]');
        if (!btn) return;
        const tab = btn.dataset.sourceTab;
        document.querySelectorAll('#specSourceTabs .nav-link')
                .forEach(b => b.classList.toggle('active', b === btn));
        ['url','text','file'].forEach(t =>
            document.getElementById('source-tab-' + t)
                    .classList.toggle('d-none', t !== tab));
    });
}

// ─── Кнопки ───────────────────────────────────────────────────
function initButtons() {
    document.getElementById('btnLoadUrl').addEventListener('click', loadFromUrl);
    document.getElementById('btnParseText').addEventListener('click', loadFromText);
    document.getElementById('btnParseFile').addEventListener('click', loadFromFile);

    document.getElementById('btnBackToSpec').addEventListener('click', () => {
        document.getElementById('specInputSection').classList.remove('d-none');
        document.getElementById('endpointsSection').classList.add('d-none');
    });

    document.getElementById('btnSelectAll').addEventListener('click', () => {
        document.querySelectorAll('.endpoint-checkbox').forEach(c => {
            c.checked = true;
        });
        updateSelectedCount();
    });

    document.getElementById('btnDeselectAll').addEventListener('click', () => {
        document.querySelectorAll('.endpoint-checkbox').forEach(c => {
            c.checked = false;
        });
        updateSelectedCount();
    });

    document.getElementById('chkSelectAll').addEventListener('change', e => {
        document.querySelectorAll('.endpoint-checkbox:not([disabled])')
                .forEach(c => { c.checked = e.target.checked; });
        updateSelectedCount();
    });

    document.getElementById('btnCreateStubs').addEventListener('click', createStubs);
}

// ─── Загрузка: URL ────────────────────────────────────────────
async function loadFromUrl() {
    const url = document.getElementById('specUrl').value.trim();
    if (!url) { Toast.show('Укажите URL', 'warning'); return; }

    setLoading(true);
    try {
        const data = await Api.get(`/openapi/fetch?url=${encodeURIComponent(url)}`);
        parseAndRender(data);
    } catch(e) {
        showError('Ошибка загрузки: ' + e.message);
    } finally {
        setLoading(false);
    }
}

// ─── Загрузка: текст ──────────────────────────────────────────
function loadFromText() {
    const text = document.getElementById('specText').value.trim();
    if (!text) { Toast.show('Вставьте JSON или YAML', 'warning'); return; }
    parseAndRender(text);
}

// ─── Загрузка: файл ───────────────────────────────────────────
function loadFromFile() {
    const file = document.getElementById('specFile').files[0];
    if (!file) { Toast.show('Выберите файл', 'warning'); return; }
    const reader = new FileReader();
    reader.onload = e => parseAndRender(e.target.result);
    reader.onerror = () => showError('Ошибка чтения файла');
    reader.readAsText(file, 'UTF-8');
}

// ─── Парсинг спецификации (JSON или YAML) ────────────────────
function parseAndRender(raw) {
    hideError();
    try {
        // Пробуем JSON, затем YAML
        if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
            parsedSpec = JSON.parse(raw);
        } else {
            if (typeof jsyaml === 'undefined') {
                showError('js-yaml не подключён. Скачайте js-yaml.min.js в static/js/');
                return;
            }
            parsedSpec = jsyaml.load(raw);
        }
        buildEndpointsList();
        renderEndpointsTable();
        document.getElementById('specInputSection').classList.add('d-none');
        document.getElementById('endpointsSection').classList.remove('d-none');
    } catch(e) {
        showError('Ошибка парсинга: ' + e.message);
    }
}

// ─── Построение списка эндпоинтов ────────────────────────────
function buildEndpointsList() {
    allEndpoints = [];
    const paths = parsedSpec.paths || {};

    for (const [path, methods] of Object.entries(paths)) {
        const httpMethods = ['get','post','put','delete','patch','head','options'];
        for (const method of httpMethods) {
            if (!methods[method]) continue;
            const op = methods[method];
            allEndpoints.push({
                path,
                method: method.toUpperCase(),
                operationId: op.operationId || '',
                summary:     op.summary || op.description || '',
                tags:        op.tags || ['default'],
                responses:   extractResponses(op, path, method)
            });
        }
    }

    // Заголовок спека
    const info = parsedSpec.info || {};
    document.getElementById('specTitle').textContent =
        info.title || 'OpenAPI Spec';
    document.getElementById('specVersion').textContent =
        info.version ? `v${info.version}` : '';
}

// ─── Извлечение ответов из операции ─────────────────────────
function extractResponses(op, path, method) {
    const result = [];
    const specResponses = op.responses || {};

    // Фиксированный набор + ответы из спека
    const fixedStatuses = ['200','201','204','400','401','403','404','422','500'];
    const allStatuses   = new Set([...Object.keys(specResponses), ...fixedStatuses]);

    for (const status of allStatuses) {
        const specResp = specResponses[status];
        const body     = specResp ? extractBodyExample(specResp) : null;
        const desc     = specResp?.description || '';
        const fromSpec = !!specResponses[status];

        result.push({ status, body, desc, fromSpec });
    }

    // Сортируем: сначала из спека, потом фиксированные
    return result.sort((a, b) => {
        if (a.fromSpec && !b.fromSpec) return -1;
        if (!a.fromSpec && b.fromSpec) return 1;
        return parseInt(a.status) - parseInt(b.status);
    });
}

// ─── Генерация тела из примера или схемы ─────────────────────
function extractBodyExample(response) {
    if (!response || !response.content) return null;

    const ct = response.content['application/json']
            || response.content['application/xml']
            || Object.values(response.content)[0];
    if (!ct) return null;

    // Прямой example
    if (ct.example !== undefined) {
        return JSON.stringify(ct.example, null, 2);
    }

    // Первый из examples
    if (ct.examples) {
        const first = Object.values(ct.examples)[0];
        if (first?.value !== undefined) {
            return JSON.stringify(first.value, null, 2);
        }
    }

    // Генерируем из schema
    if (ct.schema) {
        const generated = generateFromSchema(ct.schema, parsedSpec);
        if (generated !== null) {
            return JSON.stringify(generated, null, 2);
        }
    }

    return null;
}

// ─── Генерация примера из JSON Schema ────────────────────────
function generateFromSchema(schema, spec, depth = 0) {
    if (!schema || depth > 6) return null;

    // Разрешаем $ref
    if (schema.$ref) {
        const resolved = resolveRef(schema.$ref, spec);
        return resolved ? generateFromSchema(resolved, spec, depth + 1) : null;
    }

    if (schema.example !== undefined) return schema.example;
    if (schema.default  !== undefined) return schema.default;
    if (schema.enum && schema.enum.length > 0) return schema.enum[0];

    // allOf / oneOf / anyOf — берём первый вариант
    const combined = schema.allOf || schema.oneOf || schema.anyOf;
    if (combined && combined.length > 0) {
        return generateFromSchema(combined[0], spec, depth + 1);
    }

    switch (schema.type) {
        case 'string':  return schema.format === 'date-time'
                               ? new Date().toISOString()
                               : schema.format === 'uuid'
                               ? '00000000-0000-0000-0000-000000000000'
                               : 'string';
        case 'integer':
        case 'number':  return 0;
        case 'boolean': return false;
        case 'null':    return null;
        case 'array': {
            const item = schema.items
                ? generateFromSchema(schema.items, spec, depth + 1)
                : 'item';
            return item !== null ? [item] : [];
        }
        case 'object':
        default: {
            if (!schema.properties) return {};
            const obj = {};
            for (const [key, prop] of Object.entries(schema.properties)) {
                const val = generateFromSchema(prop, spec, depth + 1);
                if (val !== null) obj[key] = val;
            }
            return obj;
        }
    }
}

// ─── Разрешение $ref ──────────────────────────────────────────
function resolveRef(ref, spec) {
    if (!ref.startsWith('#/')) return null;
    const parts = ref.slice(2).split('/');
    let current = spec;
    for (const part of parts) {
        current = current?.[decodeURIComponent(part.replace(/~1/g, '/').replace(/~0/g, '~'))];
        if (current === undefined) return null;
    }
    return current;
}

// ─── Рендер таблицы эндпоинтов ───────────────────────────────
function renderEndpointsTable(filterTag = null) {
    activeTag = filterTag;
    const tbody = document.getElementById('endpointsBody');

    const filtered = filterTag
        ? allEndpoints.filter(e => e.tags.includes(filterTag))
        : allEndpoints;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">
            Нет эндпоинтов</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((ep, idx) => {
        const methodCls = {
            GET:'bg-success', POST:'bg-primary', PUT:'bg-warning text-dark',
            DELETE:'bg-danger', PATCH:'bg-info text-dark'
        }[ep.method] || 'bg-secondary';

        const statusesHtml = ep.responses.map(r => `
            <div class="form-check form-check-inline mb-1">
                <input class="form-check-input status-check"
                       type="checkbox"
                       id="status_${idx}_${r.status}"
                       data-ep-idx="${allEndpoints.indexOf(ep)}"
                       data-status="${r.status}"
                       ${r.fromSpec ? 'checked' : ''}>
                <label class="form-check-label small" for="status_${idx}_${r.status}">
                    <span class="badge ${statusBadgeCls(r.status)}"
                          title="${r.desc}">${r.status}</span>
                    ${r.fromSpec ? '<i class="bi bi-file-earmark-check text-muted" title="Из спека"></i>' : ''}
                </label>
            </div>`).join('');

        return `<tr>
            <td>
                <input type="checkbox" class="form-check-input endpoint-checkbox"
                       data-ep-idx="${allEndpoints.indexOf(ep)}"/>
            </td>
            <td><span class="badge ${methodCls}">${ep.method}</span></td>
            <td class="font-monospace small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                title="${ep.path}">${ep.path}</td>
            <td class="small text-muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                title="${ep.summary}">${ep.summary}</td>
            <td><div class="d-flex flex-wrap">${statusesHtml}</div></td>
        </tr>`;
    }).join('');

    // Слушатели для счётчика
    document.querySelectorAll('.endpoint-checkbox').forEach(c =>
        c.addEventListener('change', updateSelectedCount));

    updateSelectedCount();
    renderTagFilters();
}

function statusBadgeCls(status) {
    const s = parseInt(status);
    if (s >= 200 && s < 300) return 'bg-success';
    if (s >= 300 && s < 400) return 'bg-info text-dark';
    if (s >= 400 && s < 500) return 'bg-warning text-dark';
    return 'bg-danger';
}

// ─── Теги-фильтры ────────────────────────────────────────────
function renderTagFilters() {
    const tags = new Set(allEndpoints.flatMap(e => e.tags));
    const container = document.getElementById('tagFilters');
    container.innerHTML = `
        <button class="btn btn-sm ${!activeTag ? 'btn-info text-white' : 'btn-outline-info'}"
                onclick="renderEndpointsTable(null)">Все</button>
        ${[...tags].map(tag => `
            <button class="btn btn-sm ${activeTag === tag ? 'btn-info text-white' : 'btn-outline-secondary'}"
                    onclick="renderEndpointsTable('${tag}')">${tag}</button>
        `).join('')}`;
}

function updateSelectedCount() {
    const count = document.querySelectorAll('.endpoint-checkbox:checked').length;
    document.getElementById('selectedCount').textContent = count;
}

// ─── Создание стабов ─────────────────────────────────────────
async function createStubs() {
    const selected = [];

    document.querySelectorAll('.endpoint-checkbox:checked').forEach(chk => {
        const epIdx = parseInt(chk.dataset.epIdx);
        const ep = allEndpoints[epIdx];
        // Собираем выбранные статусы для этого эндпоинта
        const statuses = [];
        document.querySelectorAll(
            `.status-check[data-ep-idx="${epIdx}"]:checked`
        ).forEach(s => statuses.push(s.dataset.status));

        if (statuses.length > 0) {
            statuses.forEach(status => selected.push({ ep, status }));
        } else {
            // Если статусы не выбраны — создаём с дефолтным 200
            selected.push({ ep, status: '200' });
        }
    });

    if (selected.length === 0) {
        Toast.show('Выберите хотя бы один эндпоинт', 'warning');
        return;
    }

    const btn      = document.getElementById('btnCreateStubs');
    const progress = document.getElementById('createProgress');
    const bar      = document.getElementById('createProgressBar');
    const text     = document.getElementById('createProgressText');

    btn.disabled = true;
    progress.classList.remove('d-none');

    let done = 0, errors = 0;
    for (const { ep, status } of selected) {
        const stub = buildStub(ep, status);
        try {
            await Api.post(CTX + 'stubs', stub);
            done++;
        } catch(e) {
            errors++;
            console.error('Failed to create stub:', e);
        }
        const pct = Math.round(((done + errors) / selected.length) * 100);
        bar.style.width = pct + '%';
        text.textContent = `Создано ${done + errors} из ${selected.length}...`;
    }

    if (errors === 0) {
        Toast.show(`Создано стабов: ${done}`, 'success');
        setTimeout(() => location.assign(CTX + 'stubs'), 1000);
    } else {
        Toast.show(`Создано: ${done}, ошибок: ${errors}`, 'warning');
        btn.disabled = false;
    }
}

// ─── Построение StubMapping из эндпоинта + статуса ───────────
function buildStub(ep, status) {
    const respData = ep.responses.find(r => r.status === status);
    const body     = respData?.body || null;
    const statusInt = parseInt(status);

    const response = { status: statusInt };
    if (body) {
        try {
            response.jsonBody = JSON.parse(body);
        } catch {
            response.body = body;
        }
    }
    response.headers = { 'Content-Type': 'application/json' };

    return {
        name:       `${ep.method} ${ep.path} → ${status}`,
        priority:   5,
        persistent: true,
        request: {
            method:  ep.method,
            urlPath: ep.path.replace(/\{[^}]+\}/g, '.*') // {id} → .*
        },
        response
    };
}

// ─── UI helpers ───────────────────────────────────────────────
function setLoading(val) {
    document.getElementById('loadingIndicator').classList.toggle('d-none', !val);
    document.getElementById('btnLoadUrl').disabled = val;
}

function showError(msg) {
    const el = document.getElementById('specError');
    el.textContent = msg;
    el.classList.remove('d-none');
}

function hideError() {
    document.getElementById('specError').classList.add('d-none');
}
