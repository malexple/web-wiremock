'use strict';

const APPDATA = JSON.parse(document.getElementById('appdata').textContent);

const TOTAL_STEPS = 5;
let currentStep = 0;

// ─── Константы ────────────────────────────────────────────────────────────────

const METHODS_WITH_BODY  = ['POST', 'PUT', 'PATCH', 'DELETE', 'ANY'];
const METHODS_NO_BODY    = ['GET', 'HEAD', 'OPTIONS'];
const METHODS_WARN_BODY  = ['DELETE'];
const METHODS_HINT_BODY  = ['ANY'];

const OP_HINTS = {
    equalTo:        { desc: 'Значение совпадает точно',                            ex: 'admin' },
    contains:       { desc: 'Значение содержит текст где угодно',                  ex: 'Bearer' },
    startsWith:     { desc: 'Значение начинается с указанного текста',             ex: 'Bearer ' },
    endsWith:       { desc: 'Значение заканчивается на указанный текст',           ex: '.json' },
    oneOf:          { desc: 'Любое из перечисленных — через запятую, макс. 7',     ex: 'ACTIVE, PENDING, DRAFT' },
    doesNotContain: { desc: 'Значение НЕ содержит этот текст',                     ex: 'forbidden' },
    matches:        { desc: 'Значение совпадает с регулярным выражением',          ex: '[0-9]{4}' },
};

const BODY_TYPE_HINTS = {
    equalTo:         { desc: 'Тело точно совпадает со строкой',                    ex: 'hello world' },
    contains:        { desc: 'Тело содержит текст где угодно',                     ex: 'error' },
    doesNotContain:  { desc: 'Тело НЕ содержит текст',                             ex: 'forbidden' },
    startsWith:      { desc: 'Тело начинается с указанного текста',                ex: '{"type"' },
    endsWith:        { desc: 'Тело заканчивается на указанный текст',              ex: '"}' },
    oneOf:           { desc: 'Тело совпадает с одним из значений через запятую',   ex: 'yes, no, maybe' },
    equalToJson:     { desc: 'Тело — JSON, совпадающий с шаблоном',                ex: '{"amount": 100}' },
    matchesJsonPath: { desc: 'Поле JSON-тела соответствует условию',               ex: '$.amount равно 100' },
    matches:         { desc: 'Тело совпадает с регулярным выражением',             ex: '.*amount.*' },
};

const REGEX_PRESETS = [
    { label: 'Выбрать шаблон...',  pattern: null },
    { label: 'Целое число',        pattern: '[0-9]+' },
    { label: 'Дробное число',      pattern: '[0-9]+\\.[0-9]+' },
    { label: 'UUID',               pattern: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' },
    { label: 'Email',              pattern: '[^@]+@[^@]+\\.[^@]+' },
    { label: 'Телефон RU',         pattern: '\\+7[0-9]{10}' },
    { label: 'Дата ISO',           pattern: '[0-9]{4}-[0-9]{2}-[0-9]{2}' },
    { label: 'Непустая строка',    pattern: '.+' },
    { label: 'Только буквы',       pattern: '[a-zA-Z]+' },
    { label: 'Только цифры',       pattern: '\\d+' },
    { label: '✏️ Свой вариант',    pattern: '' },
];

const OP_OPTIONS_HTML = `
    <option value="equalTo">равно</option>
    <option value="contains">содержит</option>
    <option value="startsWith">начинается с</option>
    <option value="endsWith">заканчивается на</option>
    <option value="oneOf">одно из</option>
    <option value="doesNotContain">не содержит</option>
    <option value="matches">regex</option>`;

const REGEX_PRESETS_OPTIONS_HTML = REGEX_PRESETS
    .map(p => `<option value="${escHtml(p.pattern ?? '__null__')}">${escHtml(p.label)}</option>`)
    .join('');

// ─── Утилиты ──────────────────────────────────────────────────────────────────

function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function opHintHtml(op, hints) {
    const h = hints[op];
    if (!h) return '';
    return `<span class="text-muted">${h.desc}.</span> Пример: <code>${escHtml(h.ex)}</code>`;
}

// ─── Body Patterns visibility ─────────────────────────────────────────────────

function updateBodyPatternsVisibility(method) {
    const section      = document.getElementById('bodyPatternsSection');
    const warnDelete   = document.getElementById('bodyPatternsDeleteWarning');
    const hintAny      = document.getElementById('bodyPatternsAnyHint');
    const warnEdit     = document.getElementById('bodyPatternsEditWarning');

    const allowed = METHODS_WITH_BODY.includes(method);

    // Показываем/скрываем всю секцию
    section.classList.toggle('d-none', !allowed);

    if (!allowed) {
        // Скрываем все баннеры — секция и так скрыта
        warnDelete.classList.add('d-none');
        hintAny.classList.add('d-none');
        // edit-warning оставляем видимым если он уже был показан при prefill
        return;
    }

    // Баннер DELETE
    warnDelete.classList.toggle('d-none', !METHODS_WARN_BODY.includes(method));
    // Подсказка ANY
    hintAny.classList.toggle('d-none', !METHODS_HINT_BODY.includes(method));
}

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    updateStepView();

    // Инициализируем видимость Body Patterns по текущему методу
    updateBodyPatternsVisibility(document.getElementById('wMethod').value);

    document.getElementById('wMethod').addEventListener('change', e => {
        updateBodyPatternsVisibility(e.target.value);
        // edit-warning сбрасываем при смене метода вручную
        document.getElementById('bodyPatternsEditWarning').classList.add('d-none');
    });

    document.getElementById('wClientSelect').addEventListener('change', e => {
        document.getElementById('newClientSection')
            .classList.toggle('d-none', e.target.value !== '__new__');
    });

    document.getElementById('wCreateProxy').addEventListener('change', e => {
        document.getElementById('proxySection').classList.toggle('d-none', !e.target.checked);
    });

    document.getElementById('wFaultType').addEventListener('change', e => {
        const val = e.target.value;
        document.getElementById('wChunkedFields').classList.toggle('d-none', val !== 'CHUNKED_DRIBBLE');
        const isFault = val !== 'NORMAL' && val !== 'CHUNKED_DRIBBLE';
        document.getElementById('wNormalResponseGroup').classList.toggle('d-none', isFault);
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
        err.classList.toggle('d-none', !JsonUtil.isValid(document.getElementById('wBody').value));
    });

    document.getElementById('btnAddQueryParam').addEventListener('click', () => {
        addKvRow('queryParamsContainer', true);
    });
    document.getElementById('btnAddRequestHeader').addEventListener('click', () => {
        addKvRow('requestHeadersContainer', true);
    });
    document.getElementById('btnAddBodyPattern').addEventListener('click', () => {
        addBodyPatternRow(null);
    });

    document.getElementById('btnWizSave').addEventListener('click', saveStub);

    if ((APPDATA.editMode || APPDATA.cloneMode) && APPDATA.stub) {
        prefillWizard(APPDATA.stub);
    }
});

// ─── Навигация по шагам ───────────────────────────────────────────────────────

function updateStepView() {
    for (let i = 0; i < TOTAL_STEPS; i++) {
        document.getElementById(`wizStep${i}`)?.classList.toggle('d-none', i !== currentStep);
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

// ─── Валидация ────────────────────────────────────────────────────────────────

function validateStep(step) {
    if (step === 0) {
        if (!document.getElementById('wName').value.trim()) {
            Toast.show('Укажите название', 'warning'); return false;
        }
        if (!document.getElementById('wUrl').value.trim()) {
            Toast.show('Укажите URL', 'warning'); return false;
        }
    }
    if (step === 1) {
        const faultType = document.getElementById('wFaultType').value;
        const body = document.getElementById('wBody').value;
        if (body && (faultType === 'NORMAL' || faultType === 'CHUNKED_DRIBBLE')) {
            if (!JsonUtil.isValid(body)) {
                Toast.show('Тело ответа — невалидный JSON', 'danger'); return false;
            }
        }
    }
    return true;
}

// ─── addKvRow ─────────────────────────────────────────────────────────────────

function addKvRow(containerId, withOperator = true) {
    const container = document.getElementById(containerId);
    const row = document.createElement('div');
    row.className = 'header-row param-row mb-2';
    row.innerHTML = `
        <div class="d-flex gap-2 align-items-center flex-wrap">
            <input type="text" class="form-control form-control-sm kv-key"
                   style="width:140px" placeholder="Ключ">
            ${withOperator ? `
            <select class="form-select form-select-sm kv-op" style="width:155px">
                ${OP_OPTIONS_HTML}
            </select>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-kv-hint px-2"
                    tabindex="-1" title="Подсказка">?</button>
            ` : ''}
            <input type="text" class="form-control form-control-sm kv-value flex-grow-1" placeholder="Значение">
            <button type="button" class="btn btn-sm btn-outline-danger btn-remove-row">
                <i class="bi bi-x"></i>
            </button>
        </div>
        <div class="kv-hint small mt-1 d-none ps-1 text-muted"></div>
        <div class="kv-regex-presets mt-1 d-none">
            <select class="form-select form-select-sm w-auto d-inline-block kv-regex-preset">
                ${REGEX_PRESETS_OPTIONS_HTML}
            </select>
        </div>
        <div class="kv-oneof-hint small text-muted mt-1 d-none ps-1">
            Введите значения через запятую, максимум 7: <code>val1, val2, val3</code>
        </div>`;

    row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());

    if (withOperator) {
        const opSel     = row.querySelector('.kv-op');
        const hintBtn   = row.querySelector('.btn-kv-hint');
        const valInput  = row.querySelector('.kv-value');
        const hintDiv   = row.querySelector('.kv-hint');
        const presetDiv = row.querySelector('.kv-regex-presets');
        const oneofDiv  = row.querySelector('.kv-oneof-hint');
        const presetSel = row.querySelector('.kv-regex-preset');

        const updateUi = () => {
            const op = opSel.value;
            hintDiv.classList.add('d-none');
            presetDiv.classList.add('d-none');
            oneofDiv.classList.add('d-none');

            if (op === 'startsWith' || op === 'endsWith') {
                const v = valInput.value.trim();
                if (v) {
                    const r = op === 'startsWith' ? `^${escapeRegex(v)}.*` : `.*${escapeRegex(v)}$`;
                    hintDiv.innerHTML = `→ regex: <code class="text-success">${escHtml(r)}</code>`;
                    hintDiv.classList.remove('d-none');
                }
            } else if (op === 'matches') {
                presetDiv.classList.remove('d-none');
            } else if (op === 'oneOf') {
                oneofDiv.classList.remove('d-none');
                const vals = valInput.value.split(',').map(s => s.trim()).filter(Boolean);
                if (vals.length) {
                    hintDiv.innerHTML = `→ regex: <code class="text-success">${escHtml(vals.slice(0, 7).join('|'))}</code>`;
                    hintDiv.classList.remove('d-none');
                }
            }
        };

        opSel.addEventListener('change', updateUi);
        valInput.addEventListener('input', updateUi);

        presetSel.addEventListener('change', () => {
            const v = presetSel.value;
            if (v && v !== '__null__') valInput.value = v;
        });

        hintBtn.addEventListener('click', () => {
            hintDiv.innerHTML = opHintHtml(opSel.value, OP_HINTS);
            hintDiv.classList.remove('d-none');
        });
    }

    container.appendChild(row);
}

// ─── collectKvMap ─────────────────────────────────────────────────────────────

function collectKvMap(containerId) {
    const result = {};
    document.querySelectorAll(`#${containerId} .param-row, #${containerId} .header-row`).forEach(row => {
        const k  = row.querySelector('.kv-key')?.value.trim();
        const op = row.querySelector('.kv-op')?.value ?? 'equalTo';
        const v  = row.querySelector('.kv-value')?.value.trim();
        if (!k || !v) return;

        if (op === 'startsWith') {
            result[k] = { matches: `^${escapeRegex(v)}.*` };
        } else if (op === 'endsWith') {
            result[k] = { matches: `.*${escapeRegex(v)}$` };
        } else if (op === 'oneOf') {
            const vals = v.split(',').map(s => s.trim()).filter(Boolean).slice(0, 7);
            result[k] = { matches: vals.join('|') };
        } else {
            result[k] = { [op]: v };
        }
    });
    return result;
}

// ─── Body Patterns ────────────────────────────────────────────────────────────

function addBodyPatternRow(prefill) {
    const container = document.getElementById('bodyPatternsContainer');
    const row = document.createElement('div');
    row.className = 'body-pattern-row border rounded p-2 mb-2 bg-white';
    row.innerHTML = `
        <div class="d-flex gap-2 align-items-center mb-2">
            <select class="form-select form-select-sm bp-type" style="width:195px">
                <option value="contains">содержит</option>
                <option value="equalTo">равно (строка)</option>
                <option value="doesNotContain">не содержит</option>
                <option value="startsWith">начинается с</option>
                <option value="endsWith">заканчивается на</option>
                <option value="oneOf">одно из</option>
                <option value="equalToJson">equalToJson (JSON)</option>
                <option value="matchesJsonPath">matchesJsonPath</option>
                <option value="matches">regex</option>
            </select>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-bp-hint px-2"
                    tabindex="-1" title="Подсказка">?</button>
            <button type="button" class="btn btn-sm btn-outline-danger btn-remove-row ms-auto">
                <i class="bi bi-x"></i>
            </button>
        </div>
        <div class="bp-fields"></div>
        <div class="bp-hint small text-muted mt-1 d-none ps-1"></div>`;

    row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());

    const typeSel = row.querySelector('.bp-type');
    const hintBtn = row.querySelector('.btn-bp-hint');
    const hintDiv = row.querySelector('.bp-hint');

    typeSel.addEventListener('change', () => {
        hintDiv.classList.add('d-none');
        updateBodyPatternFields(row, null);
    });
    hintBtn.addEventListener('click', () => {
        hintDiv.innerHTML = opHintHtml(typeSel.value, BODY_TYPE_HINTS);
        hintDiv.classList.remove('d-none');
    });

    container.appendChild(row);

    if (prefill) {
        const type = Object.keys(prefill)[0];
        const opt = [...typeSel.options].find(o => o.value === type);
        if (opt) typeSel.value = type;
    }

    updateBodyPatternFields(row, prefill);
}

function updateBodyPatternFields(row, prefill) {
    const type    = row.querySelector('.bp-type').value;
    const fields  = row.querySelector('.bp-fields');
    const hintDiv = row.querySelector('.bp-hint');
    hintDiv.classList.add('d-none');

    if (type === 'equalToJson') {
        const iaoId = `bp-iao-${Date.now()}`;
        const ieId  = `bp-ie-${Date.now() + 1}`;
        fields.innerHTML = `
            <textarea class="form-control form-control-sm font-monospace bp-value"
                      rows="3" placeholder='{"amount": 100}'></textarea>
            <div class="d-flex gap-4 mt-1 ps-1">
                <div class="form-check">
                    <input class="form-check-input bp-ignore-array-order" type="checkbox" id="${iaoId}">
                    <label class="form-check-label small" for="${iaoId}">Игнорировать порядок массивов</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input bp-ignore-extra" type="checkbox" id="${ieId}" checked>
                    <label class="form-check-label small" for="${ieId}">Игнорировать лишние поля</label>
                </div>
            </div>`;
        if (prefill?.equalToJson !== undefined) {
            const v = prefill.equalToJson;
            fields.querySelector('.bp-value').value =
                typeof v === 'string' ? v : JSON.stringify(v, null, 2);
            if (prefill.ignoreArrayOrder)             fields.querySelector('.bp-ignore-array-order').checked = true;
            if (prefill.ignoreExtraElements === false) fields.querySelector('.bp-ignore-extra').checked = false;
        }

    } else if (type === 'matchesJsonPath') {
        fields.innerHTML = `
            <div class="d-flex gap-2 align-items-center flex-wrap">
                <input type="text" class="form-control form-control-sm bp-jsonpath font-monospace"
                       style="width:160px" placeholder="$.amount">
                <select class="form-select form-select-sm bp-jsonpath-op" style="width:140px">
                    <option value="equalTo">равно</option>
                    <option value="contains">содержит</option>
                    <option value="matches">regex</option>
                    <option value="oneOf">одно из</option>
                </select>
                <input type="text" class="form-control form-control-sm bp-jsonpath-val flex-grow-1"
                       placeholder="Значение (пусто — только проверка существования)">
            </div>
            <div class="kv-oneof-hint small text-muted mt-1 ps-1 d-none">
                Через запятую, макс. 7: <code>ACTIVE, PENDING, DRAFT</code>
            </div>`;
        const opSel = fields.querySelector('.bp-jsonpath-op');
        opSel.addEventListener('change', () => {
            fields.querySelector('.kv-oneof-hint')
                .classList.toggle('d-none', opSel.value !== 'oneOf');
        });
        if (prefill?.matchesJsonPath) {
            const p = prefill.matchesJsonPath;
            if (typeof p === 'string') {
                fields.querySelector('.bp-jsonpath').value = p;
            } else {
                fields.querySelector('.bp-jsonpath').value = p.expression || '';
                const entry = Object.entries(p).find(([k]) => k !== 'expression');
                if (entry) {
                    if ([...opSel.options].some(o => o.value === entry[0])) opSel.value = entry[0];
                    fields.querySelector('.bp-jsonpath-val').value = entry[1];
                }
            }
        }

    } else if (type === 'matches') {
        fields.innerHTML = `
            <div class="d-flex gap-2 align-items-center">
                <select class="form-select form-select-sm bp-regex-preset" style="width:195px">
                    ${REGEX_PRESETS_OPTIONS_HTML}
                </select>
                <input type="text" class="form-control form-control-sm bp-value font-monospace flex-grow-1"
                       placeholder="Регулярное выражение">
            </div>`;
        const presetSel = fields.querySelector('.bp-regex-preset');
        const valInput  = fields.querySelector('.bp-value');
        presetSel.addEventListener('change', () => {
            const v = presetSel.value;
            if (v && v !== '__null__') valInput.value = v;
        });
        if (prefill?.matches) valInput.value = prefill.matches;

    } else if (type === 'oneOf') {
        fields.innerHTML = `
            <input type="text" class="form-control form-control-sm bp-value"
                   placeholder="val1, val2, val3">
            <div class="small text-muted mt-1 ps-1">Через запятую, максимум 7 значений</div>`;
        fields.querySelector('.bp-value').addEventListener('input', e => {
            const vals = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            if (vals.length) {
                hintDiv.innerHTML = `→ regex: <code class="text-success">${escHtml(vals.slice(0, 7).join('|'))}</code>`;
                hintDiv.classList.remove('d-none');
            } else {
                hintDiv.classList.add('d-none');
            }
        });

    } else {
        // contains, equalTo, doesNotContain, startsWith, endsWith
        fields.innerHTML = `
            <input type="text" class="form-control form-control-sm bp-value" placeholder="Значение">`;
        const valInput = fields.querySelector('.bp-value');

        if (type === 'startsWith' || type === 'endsWith') {
            valInput.addEventListener('input', () => {
                const v = valInput.value.trim();
                if (v) {
                    const r = type === 'startsWith' ? `^${escapeRegex(v)}.*` : `.*${escapeRegex(v)}$`;
                    hintDiv.innerHTML = `→ regex: <code class="text-success">${escHtml(r)}</code>`;
                    hintDiv.classList.remove('d-none');
                } else {
                    hintDiv.classList.add('d-none');
                }
            });
        }

        if (prefill) {
            valInput.value = prefill[type] ?? prefill.contains ?? prefill.equalTo ?? '';
        }
    }
}

function collectBodyPatterns() {
    // Если метод не поддерживает тело — возвращаем пустой массив, в JSON не попадёт
    const method = document.getElementById('wMethod').value;
    if (METHODS_NO_BODY.includes(method)) return [];

    const patterns = [];
    document.querySelectorAll('#bodyPatternsContainer .body-pattern-row').forEach(row => {
        const type   = row.querySelector('.bp-type').value;
        const fields = row.querySelector('.bp-fields');

        if (type === 'equalToJson') {
            const val = fields.querySelector('.bp-value')?.value.trim();
            if (!val) return;
            const p = { equalToJson: val };
            if (fields.querySelector('.bp-ignore-array-order')?.checked) p.ignoreArrayOrder = true;
            if (fields.querySelector('.bp-ignore-extra')?.checked)        p.ignoreExtraElements = true;
            patterns.push(p);

        } else if (type === 'matchesJsonPath') {
            const expr = fields.querySelector('.bp-jsonpath')?.value.trim();
            if (!expr) return;
            const op  = fields.querySelector('.bp-jsonpath-op')?.value ?? 'equalTo';
            const val = fields.querySelector('.bp-jsonpath-val')?.value.trim();
            if (!val) {
                patterns.push({ matchesJsonPath: expr });
            } else if (op === 'oneOf') {
                const vals = val.split(',').map(s => s.trim()).filter(Boolean).slice(0, 7);
                patterns.push({ matchesJsonPath: { expression: expr, matches: vals.join('|') } });
            } else {
                patterns.push({ matchesJsonPath: { expression: expr, [op]: val } });
            }

        } else if (type === 'matches') {
            const val = fields.querySelector('.bp-value')?.value.trim();
            if (val) patterns.push({ matches: val });

        } else if (type === 'oneOf') {
            const val = fields.querySelector('.bp-value')?.value.trim();
            if (!val) return;
            const vals = val.split(',').map(s => s.trim()).filter(Boolean).slice(0, 7);
            if (vals.length) patterns.push({ matches: vals.join('|') });

        } else if (type === 'startsWith') {
            const val = fields.querySelector('.bp-value')?.value.trim();
            if (val) patterns.push({ matches: `^${escapeRegex(val)}.*` });

        } else if (type === 'endsWith') {
            const val = fields.querySelector('.bp-value')?.value.trim();
            if (val) patterns.push({ matches: `.*${escapeRegex(val)}$` });

        } else {
            // contains, equalTo, doesNotContain
            const val = fields.querySelector('.bp-value')?.value.trim();
            if (val) patterns.push({ [type]: val });
        }
    });
    return patterns;
}

// ─── buildStubJson ────────────────────────────────────────────────────────────

function buildStubJson() {
    const method   = document.getElementById('wMethod').value;
    const urlType  = document.getElementById('wUrlType').value;
    const urlValue = document.getElementById('wUrl').value.trim();

    const clientSelect = document.getElementById('wClientSelect').value;
    const clientId   = clientSelect === '__new__'
        ? document.getElementById('wNewClientId').value.trim()
        : clientSelect;
    const clientName = clientSelect === '__new__'
        ? document.getElementById('wNewClientName').value.trim()
        : null;

    const responseBody = {};
    const faultType    = document.getElementById('wFaultType').value;
    const delay        = parseInt(document.getElementById('wDelay').value) || null;
    if (delay) responseBody.fixedDelayMilliseconds = delay;

    if (faultType === 'NORMAL' || faultType === 'CHUNKED_DRIBBLE') {
        const status     = parseInt(document.getElementById('wStatus').value);
        const ct         = document.getElementById('wContentType').value;
        const bodyStr    = document.getElementById('wBody').value.trim();
        const handlebars = document.getElementById('wHandlebars').checked;

        responseBody.status = status;
        if (ct) responseBody.headers = { 'Content-Type': ct };

        if (bodyStr) {
            if (ct === 'application/json') {
                try { responseBody.jsonBody = JSON.parse(bodyStr); }
                catch (e) { responseBody.body = bodyStr; }
            } else {
                responseBody.body = bodyStr;
            }
        }

        if (handlebars) responseBody.transformers = ['response-template'];

        if (faultType === 'CHUNKED_DRIBBLE') {
            responseBody.chunkedDribbleDelay = {
                numberOfChunks: parseInt(document.getElementById('wChunkNumber').value) || 5,
                totalDuration:  parseInt(document.getElementById('wChunkDuration').value) || 1000
            };
        }
    } else {
        responseBody.fault = faultType;
    }

    const queryParams  = collectKvMap('queryParamsContainer');
    const reqHeaders   = collectKvMap('requestHeadersContainer');
    const bodyPatterns = collectBodyPatterns();

    const request = { method };
    request[urlType] = urlValue;

    if (Object.keys(queryParams).length)  request.queryParameters = queryParams;
    if (Object.keys(reqHeaders).length)   request.headers         = reqHeaders;
    if (bodyPatterns.length)              request.bodyPatterns     = bodyPatterns;

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
        name:       document.getElementById('wName').value.trim(),
        priority:   clientId ? 1 : 5,
        persistent: true,
        request,
        response:   responseBody
    };

    if (clientId) {
        stub.metadata = { clientId, ...(clientName ? { clientName } : {}) };
    }

    return stub;
}

// ─── buildProxyJson ───────────────────────────────────────────────────────────

function buildProxyJson(stub) {
    const proxyUrl    = document.getElementById('wProxyUrl').value.trim();
    const proxyMethod = document.getElementById('wProxyMethod').value;
    const urlType     = document.getElementById('wUrlType').value;
    const urlValue    = document.getElementById('wUrl').value.trim();

    return {
        name:       'PROXY ' + stub.name,
        priority:   10,
        persistent: true,
        request: {
            method: proxyMethod,
            [urlType]: urlValue
        },
        response: {
            proxyBaseUrl: proxyUrl
        },
        metadata: {
            proxyStub:   true,
            description: 'Auto-proxy for ' + stub.name
        }
    };
}

// ─── Preview ──────────────────────────────────────────────────────────────────

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

// ─── Save ─────────────────────────────────────────────────────────────────────

async function saveStub() {
    const btn = document.getElementById('btnWizSave');
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    try {
        const stub = buildStubJson();
        if (APPDATA.editMode) {
            stub.id = APPDATA.stubId;
            await Api.put(`${CTX}stubs/${APPDATA.stubId}`, stub);
        } else {
            await Api.post(CTX + 'stubs', stub);
        }
        if (!APPDATA.editMode && document.getElementById('wCreateProxy').checked) {
            const proxyUrl = document.getElementById('wProxyUrl').value.trim();
            if (proxyUrl) await Api.post(CTX + 'stubs', buildProxyJson(stub));
        }
        Toast.show(APPDATA.editMode ? 'Стаб обновлён!' : 'Стаб создан!', 'success');
        setTimeout(() => location.assign(CTX + 'stubs'), 1000);
    } catch (e) {
        Toast.show('Ошибка: ' + e.message, 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

// ─── prefillWizard ────────────────────────────────────────────────────────────

function prefillWizard(stub) {
    if (!stub) return;
    const req  = stub.request;
    const resp = stub.response;
    const meta = stub.metadata || {};

    // 0. Название
    document.getElementById('wName').value = stub.name;

    const method = ['GET','POST','PUT','DELETE','PATCH','ANY'].includes(req.method)
        ? req.method : 'GET';
    document.getElementById('wMethod').value = method;

    let urlType = 'urlPath', urlVal = '';
    if      (req.urlPath)         { urlType = 'urlPath';         urlVal = req.urlPath; }
    else if (req.url)             { urlType = 'url';             urlVal = req.url; }
    else if (req.urlPathPattern)  { urlType = 'urlPathPattern';  urlVal = req.urlPathPattern; }
    else if (req.urlPattern)      { urlType = 'urlPattern';      urlVal = req.urlPattern; }
    else if (req.urlPathTemplate) { urlType = 'urlPathTemplate'; urlVal = req.urlPathTemplate; }
    document.getElementById('wUrlType').value = urlType;
    document.getElementById('wUrl').value     = urlVal;

    const clientId = meta.clientId || req.customMatcher?.parameters?.payload?.externalId;
    if (clientId) {
        const select = document.getElementById('wClientSelect');
        const existing = [...select.options].find(o => o.value === clientId);
        if (existing) {
            select.value = clientId;
        } else {
            select.value = '__new__';
            document.getElementById('newClientSection').classList.remove('d-none');
            document.getElementById('wNewClientId').value   = clientId;
            document.getElementById('wNewClientName').value = meta.clientName || '';
        }
    }

    // 1. Response
    const faultSelect = document.getElementById('wFaultType');
    if (resp.fault) {
        faultSelect.value = resp.fault;
    } else if (resp.chunkedDribbleDelay) {
        faultSelect.value = 'CHUNKED_DRIBBLE';
        document.getElementById('wChunkNumber').value   = resp.chunkedDribbleDelay.numberOfChunks || 5;
        document.getElementById('wChunkDuration').value = resp.chunkedDribbleDelay.totalDuration  || 1000;
    } else {
        faultSelect.value = 'NORMAL';
    }
    faultSelect.dispatchEvent(new Event('change'));

    if (resp.fixedDelayMilliseconds) {
        document.getElementById('wDelay').value = resp.fixedDelayMilliseconds;
    }

    if (resp.status) {
        const statusSel = document.getElementById('wStatus');
        const sv = String(resp.status);
        if ([...statusSel.options].some(o => o.value === sv)) statusSel.value = sv;
    }

    const ct = resp.headers?.['Content-Type'] || resp.headers?.['content-type'] || 'application/json';
    const ctSel = document.getElementById('wContentType');
    if ([...ctSel.options].some(o => o.value === ct)) ctSel.value = ct;

    let bodyStr = '';
    if (resp.jsonBody !== undefined && resp.jsonBody !== null) {
        bodyStr = JSON.stringify(resp.jsonBody, null, 2);
    } else if (resp.body) {
        bodyStr = resp.body;
    }
    document.getElementById('wBody').value         = bodyStr;
    document.getElementById('wHandlebars').checked =
        Array.isArray(resp.transformers) && resp.transformers.includes('response-template');

    // 2. Query params
    document.getElementById('queryParamsContainer').innerHTML = '';
    if (req.queryParameters) {
        for (const [key, matcher] of Object.entries(req.queryParameters)) {
            addKvRow('queryParamsContainer', true);
            const rows = document.querySelectorAll('#queryParamsContainer .param-row');
            const row  = rows[rows.length - 1];
            row.querySelector('.kv-key').value = key;
            const opEntry = Object.entries(matcher)[0];
            if (opEntry) {
                const opSel = row.querySelector('.kv-op');
                if (opSel && [...opSel.options].some(o => o.value === opEntry[0])) opSel.value = opEntry[0];
                row.querySelector('.kv-value').value = opEntry[1];
            }
        }
    }

    // 2. Request headers
    document.getElementById('requestHeadersContainer').innerHTML = '';
    if (req.headers) {
        for (const [key, matcher] of Object.entries(req.headers)) {
            addKvRow('requestHeadersContainer', true);
            const rows = document.querySelectorAll('#requestHeadersContainer .header-row');
            const row  = rows[rows.length - 1];
            row.querySelector('.kv-key').value = key;
            const opEntry = Object.entries(matcher)[0];
            if (opEntry) {
                const opSel = row.querySelector('.kv-op');
                if (opSel && [...opSel.options].some(o => o.value === opEntry[0])) opSel.value = opEntry[0];
                row.querySelector('.kv-value').value = opEntry[1];
            }
        }
    }

    // 2. Body patterns
    document.getElementById('bodyPatternsContainer').innerHTML = '';
    updateBodyPatternsVisibility(method);

    // Edit mode + bodyPatterns при несовместимом методе
    if (APPDATA.editMode && METHODS_NO_BODY.includes(method) && req.bodyPatterns?.length) {
        const warn = document.getElementById('bodyPatternsEditWarning');
        warn.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i>
            Метод <strong>${escHtml(method)}</strong> не поддерживает Body Patterns.
            Они были сохранены в стабе и будут удалены при сохранении.`;
        warn.classList.remove('d-none');
    }

    if (req.bodyPatterns?.length) {
        req.bodyPatterns.forEach(p => addBodyPatternRow(p));
    }
}
