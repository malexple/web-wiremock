'use strict';

const APPDATA = JSON.parse(document.getElementById('appdata').textContent);
// ─── State ────────────────────────────────────────────────────
let currentStubId = null;
let proxyModalInst = null;

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initSplitter('treeSplitter', 'treeSidebar');
    renderTree(APPDATA.tree);
    initTabSwitcher();
    initStubButtons();
    initRunTest();
    proxyModalInst = new bootstrap.Modal(document.getElementById('proxyModal'));

    document.getElementById('btnExpandAll').addEventListener('click',
        () => document.querySelectorAll('.tree-children.d-none')
                      .forEach(el => el.classList.remove('d-none')));

    document.getElementById('btnCollapseAll').addEventListener('click',
        () => document.querySelectorAll('.tree-children:not(.d-none)')
                      .forEach(el => el.classList.add('d-none')));

    if (APPDATA.selectedStubId) selectStub(APPDATA.selectedStubId);
});

// ─── Tree render ──────────────────────────────────────────────
function renderTree(nodes) {
    const container = document.getElementById('apiTree');
    container.innerHTML = '';
    if (!nodes || nodes.length === 0) {
        container.innerHTML = '<p class="text-muted small px-2 py-3">Стабов нет</p>';
        return;
    }
    container.appendChild(buildTreeNodes(nodes, 0));
}

function buildTreeNodes(nodes, depth) {
    const ul = document.createElement('ul');
    ul.className = 'list-unstyled mb-0' + (depth > 0 ? ' tree-children' : '');

    for (const node of nodes) {
        const li = document.createElement('li');
        li.className = 'tree-node';

        if (node.leaf) {
            li.innerHTML = buildLeafHtml(node);
            li.querySelector('.tree-node-row').addEventListener('click',
                () => selectStub(node.stubId));
        } else {
            const hasChildren = node.children && node.children.length > 0;
            li.innerHTML = buildBranchHtml(node, hasChildren);
            const row = li.querySelector('.tree-node-row');
            const childrenDiv = li.querySelector('.tree-children-wrapper');
            const toggle = li.querySelector('.tree-toggle');

            if (hasChildren) {
                row.addEventListener('click', () => {
                    const hidden = childrenDiv.classList.toggle('d-none');
                    toggle.classList.toggle('open', !hidden);
                });
                // Разворачиваем первый уровень
                if (depth === 0) toggle.classList.add('open');
                else childrenDiv.classList.add('d-none');

                childrenDiv.appendChild(buildTreeNodes(node.children, depth + 1));
            }
        }
        ul.appendChild(li);
    }
    return ul;
}

function buildLeafHtml(node) {
    const isAny = (node.method || '').toUpperCase() === 'ANY';
    const badgeCls = 'badge-method badge-' + (node.method || 'ANY').toUpperCase();
    const outline = isAny ? 'outline-method-any' : '';
    return `
        <div class="tree-node-row ${outline}" data-stub-id="${node.stubId}">
            <span class="${badgeCls}">${node.method || 'ANY'}</span>
            <span class="tree-segment" title="${node.stubName}">${node.stubName}</span>
        </div>`;
}

function buildBranchHtml(node, hasChildren) {
    return `
        <div class="tree-node-row">
            <i class="bi ${hasChildren ? 'bi-chevron-right tree-toggle' : 'bi-dash'} tree-toggle"></i>
            <i class="bi bi-folder2 text-warning" style="font-size:0.8rem"></i>
            <span class="tree-segment fw-semibold">${node.segment}</span>
        </div>
        <div class="tree-children-wrapper"></div>`;
}

// ─── Select stub ─────────────────────────────────────────────
async function selectStub(stubId) {
    if (!stubId) return;

    // Подсвечиваем выбранный узел
    document.querySelectorAll('.tree-node-row.selected')
            .forEach(el => el.classList.remove('selected'));
    const row = document.querySelector(`[data-stub-id="${stubId}"]`);
    if (row) row.classList.add('selected');

    try {
        const stub = await Api.get(CTX + `stubs/${stubId}/json`);
        currentStubId = stub.id;
        showStubPanel(stub);
    } catch (e) {
        Toast.show('Ошибка загрузки стаба: ' + e.message, 'danger');
    }
}

function showStubPanel(stub) {
    document.getElementById('emptyState').classList.add('d-none');
    document.getElementById('stubPanel').classList.remove('d-none');

    const method = stub.request?.method || 'ANY';
    const path = stub.request?.urlPath || stub.request?.urlPattern
              || stub.request?.url || stub.request?.urlPathPattern || '/';

    // Метод-бейдж
    const badge = document.getElementById('stubMethodBadge');
    badge.textContent = method;
    badge.className = 'badge badge-method badge-' + method.toUpperCase();

    document.getElementById('stubTitle').textContent = stub.name || path;
    document.getElementById('stubIdBadge').textContent = stub.id;

    // Заполняем JSON-редактор
    document.getElementById('jsonEditor').value = JsonUtil.beautify(JSON.stringify(stub));

    // Заполняем Run Test
    const rtMethod = document.getElementById('rtMethod');
    rtMethod.value = ['GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS'].includes(method)
        ? method : 'GET';
    document.getElementById('rtUrl').value = APPDATA.wiremockHost + path;

    // Скрываем ответ от предыдущего теста
    document.getElementById('rtResponseSection').classList.add('d-none');
    document.getElementById('rtBodySection').style.display =
        ['POST','PUT','PATCH'].includes(rtMethod.value) ? '' : 'none';
}

// ─── Tabs ─────────────────────────────────────────────────────
function initTabSwitcher() {
    document.getElementById('stubTabs').addEventListener('click', e => {
        const btn = e.target.closest('[data-tab]');
        if (!btn) return;
        const tab = btn.dataset.tab;
        document.querySelectorAll('#stubTabs .nav-link')
                .forEach(b => b.classList.toggle('active', b === btn));
        document.getElementById('tab-json').classList.toggle('d-none', tab !== 'json');
        document.getElementById('tab-run-test').classList.toggle('d-none', tab !== 'run-test');
    });
}

// ─── Stub action buttons ──────────────────────────────────────
function initStubButtons() {
    document.getElementById('btnBeautify').addEventListener('click', () => {
        const ta = document.getElementById('jsonEditor');
        ta.value = JsonUtil.beautify(ta.value);
    });

    document.getElementById('btnSave').addEventListener('click', async () => {
        if (!currentStubId) return;
        const ta = document.getElementById('jsonEditor');
        if (!JsonUtil.isValid(ta.value)) {
            Toast.show('Невалидный JSON — сохранение невозможно', 'danger'); return;
        }
        try {
            const stub = JSON.parse(ta.value);
            await Api.put(`${CTX}stubs/${currentStubId}`, stub);
            Toast.show('Стаб сохранён', 'success');
            location.reload();
        } catch (e) { Toast.show('Ошибка: ' + e.message, 'danger'); }
    });

    document.getElementById('btnDelete').addEventListener('click', async () => {
        if (!currentStubId) return;
        if (!confirm('Удалить стаб?')) return;
        try {
            await Api.delete(`${CTX}stubs/${currentStubId}`);
            Toast.show('Стаб удалён', 'success');
            setTimeout(() => location.assign(CTX + 'stubs'), 800);
        } catch (e) { Toast.show('Ошибка: ' + e.message, 'danger'); }
    });

    document.getElementById('btnCreateProxy').addEventListener('click',
        () => proxyModalInst.show());

    document.getElementById('btnConfirmProxy').addEventListener('click',
        async () => {
            const url = document.getElementById('proxyBaseUrl').value.trim();
            if (!url) { Toast.show('Укажите URL сервиса', 'warning'); return; }
            try {
                await fetch(`${CTX}proxy/from-stub/${currentStubId}?proxyBaseUrl=${encodeURIComponent(url)}`,
                            { method: 'POST' });
                proxyModalInst.hide();
                Toast.show('Прокси-стаб создан', 'success');
                setTimeout(() => location.reload(), 800);
            } catch (e) { Toast.show('Ошибка: ' + e.message, 'danger'); }
        });

    document.getElementById('btnEdit').addEventListener('click', () => {
        if (!currentStubId) return;
        location.assign(`${CTX}stubs/${currentStubId}/edit`);
    });

    document.getElementById('btnClone').addEventListener('click', () => {
        if (!currentStubId) return;
        location.assign(`${CTX}stubs/${currentStubId}/clone`);
    });

}

// ─── Run Test ─────────────────────────────────────────────────
function initRunTest() {
    document.getElementById('rtMethod').addEventListener('change', e => {
        const visible = ['POST','PUT','PATCH'].includes(e.target.value);
        document.getElementById('rtBodySection').style.display = visible ? '' : 'none';
    });

    document.getElementById('btnAddRtHeader').addEventListener('click',
        () => addKvRow('rtHeadersContainer', false));

    document.getElementById('btnRunTest').addEventListener('click', async () => {
        const method  = document.getElementById('rtMethod').value;
        const url     = document.getElementById('rtUrl').value.trim();
        const body    = document.getElementById('rtBody').value;

        if (!url) { Toast.show('Укажите URL', 'warning'); return; }

        // Собираем заголовки
        const headers = {};
        document.querySelectorAll('#rtHeadersContainer .header-row').forEach(row => {
            const k = row.querySelector('.kv-key').value.trim();
            const v = row.querySelector('.kv-value').value.trim();
            if (k) headers[k] = v;
        });

        const btn = document.getElementById('btnRunTest');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        try {
            const result = await Api.post(CTX + 'run-test', { method, url, headers, body });
            showRunTestResult(result);
        } catch (e) {
            Toast.show('Ошибка выполнения: ' + e.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-play-fill"></i> Execute';
        }
    });
}

function showRunTestResult(r) {
    const section = document.getElementById('rtResponseSection');
    section.classList.remove('d-none');

    document.getElementById('rtStatusLine').innerHTML =
        `${statusBadgeHtml(r.statusCode)} <span class="text-muted small ms-1">${r.statusText}</span>`;
    document.getElementById('rtDuration').textContent = r.durationMs + ' мс';

    // Заголовки ответа
    const hdrs = Object.entries(r.responseHeaders || {})
        .map(([k,v]) => `<span class="text-info">${k}</span>: ${v}`)
        .join('\n');
    document.getElementById('rtResponseHeaders').innerHTML =
        `<pre class="mb-0 small">${hdrs}</pre>`;

    document.getElementById('rtResponseBody').textContent =
        JsonUtil.beautify(r.responseBody || '');
}

// ─── KV row helper (заголовки / query params) ─────────────────
function addKvRow(containerId, withOperator = true) {
    const container = document.getElementById(containerId);
    const row = document.createElement('div');
    row.className = 'header-row param-row';
    row.innerHTML = `
        <input type="text" class="form-control form-control-sm kv-key" placeholder="Ключ"/>
        ${withOperator ? `
        <select class="form-select form-select-sm kv-op">
            <option value="equalTo">equalTo</option>
            <option value="contains">contains</option>
            <option value="matches">matches (regex)</option>
            <option value="doesNotContain">doesNotContain</option>
        </select>` : ''}
        <input type="text" class="form-control form-control-sm kv-value" placeholder="Значение"/>
        <button type="button" class="btn btn-sm btn-outline-danger btn-remove-row">
            <i class="bi bi-x"></i>
        </button>`;
    row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
    container.appendChild(row);
}
