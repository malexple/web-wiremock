'use strict';

let saveModalInst, importModalInst, exportModalInst;
let currentStubCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    saveModalInst   = new bootstrap.Modal(document.getElementById('saveProfileModal'));
    importModalInst = new bootstrap.Modal(document.getElementById('importModal'));
    exportModalInst = new bootstrap.Modal(document.getElementById('exportModal'));
    loadCurrentStubCount();
    initProfileActions();
    initTopButtons();
    initImportModeHighlight();
});

async function loadCurrentStubCount() {
    try {
        const data = await Api.get(CTX + 'stubs/count');
        currentStubCount = data?.total || 0;
        document.getElementById('currentStubCount').textContent = currentStubCount;
        document.getElementById('stubCountForSave').textContent = currentStubCount;
    } catch {
        document.getElementById('currentStubCount').textContent = '?';
    }
}

function initProfileActions() {
    document.getElementById('profilesList').addEventListener('click', async e => {
        const card = e.target.closest('.profile-card');
        if (!card) return;
        const name = card.dataset.name;

        if (e.target.closest('.btn-apply-replace')) {
            if (!confirm(`Заменить все стабы профилем «${name}»? Текущие стабы будут удалены.`)) return;
            await applyProfile(name, 'replace');
        } else if (e.target.closest('.btn-apply-merge')) {
            await applyProfile(name, 'merge');
        } else if (e.target.closest('.btn-export-profile')) {
            location.assign(CTX + `profiles/${encodeURIComponent(name)}/export`);
        } else if (e.target.closest('.btn-overwrite-profile')) {
            if (!confirm(`Перезаписать профиль «${name}» текущими стабами?`)) return;
            await saveProfile(name, null);
        } else if (e.target.closest('.btn-delete-profile')) {
            if (!confirm(`Удалить профиль «${name}»?`)) return;
            await deleteProfile(name, card);
        }
    });
}

function initTopButtons() {
    document.getElementById('btnSaveProfile').addEventListener('click', () => {
        document.getElementById('saveProfileName').value = '';
        document.getElementById('saveProfileDesc').value = '';
        saveModalInst.show();
    });

    document.getElementById('btnConfirmSaveProfile').addEventListener('click', async () => {
        const name = document.getElementById('saveProfileName').value.trim();
        const desc = document.getElementById('saveProfileDesc').value.trim();
        if (!name) { Toast.show('Укажите название', 'warning'); return; }
        saveModalInst.hide();
        await saveProfile(name, desc);
        setTimeout(() => location.reload(), 800);
    });

    document.getElementById('btnImportFile').addEventListener('click', () => importModalInst.show());

    document.getElementById('btnConfirmImport').addEventListener('click', async () => {
        const file = document.getElementById('importFile').files[0];
        if (!file) { Toast.show('Выберите файл', 'warning'); return; }
        const mode = document.querySelector('input[name=importMode]:checked').value;
        const save = document.getElementById('importSaveAsProfile').checked;
        importModalInst.hide();
        await importFromFile(file, mode, save);
    });

    document.getElementById('btnExportCurrent').addEventListener('click', () => {
        const today = new Date().toISOString().slice(0, 10);
        document.getElementById('exportName').value = `stubs-${today}`;
        document.getElementById('exportDesc').value = '';
        exportModalInst.show();
    });

    document.getElementById('btnConfirmExport').addEventListener('click', () => {
        const name = document.getElementById('exportName').value.trim() || 'stubs-export';
        const desc = encodeURIComponent(document.getElementById('exportDesc').value.trim());
        document.getElementById('btnConfirmExport').href =
            `${CTX}profiles/export?name=${encodeURIComponent(name)}&description=${desc}`;
        exportModalInst.hide();
    });
}

function initImportModeHighlight() {
    document.querySelectorAll('input[name=importMode]').forEach(radio => {
        radio.addEventListener('change', () => {
            document.getElementById('modeReplacePicker')
                .classList.toggle('border-success', radio.value === 'replace' && radio.checked);
            document.getElementById('importModeCard')
                .classList.toggle('border-primary', radio.value === 'merge' && radio.checked);
        });
    });
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function applyProfile(name, mode) {
    const modeLabel = mode === 'replace' ? 'применён (replace)' : 'применён (merge)';
    const btn = event.target.closest('button');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }
    try {
        await Api.post(`${CTX}profiles/${encodeURIComponent(name)}/apply?mode=${mode}`);
        Toast.show(`Профиль «${name}» ${modeLabel}`, 'success');
        setTimeout(() => location.assign(CTX + 'stubs'), 800);
    } catch(e) {
        Toast.show(e.message, 'danger');
    }
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = mode === 'replace'
            ? '<i class="bi bi-arrow-repeat"></i>'
            : '<i class="bi bi-plus-circle"></i>';
    }
}

async function saveProfile(name, description) {
    try {
        await Api.post(CTX + 'profiles/save', { name, description });
        Toast.show(`Профиль «${name}» сохранён`, 'success');
    } catch(e) {
        Toast.show(e.message, 'danger');
    }
}

async function deleteProfile(name, cardEl) {
    try {
        await Api.delete(`${CTX}profiles/${encodeURIComponent(name)}`);
        cardEl.remove();
        Toast.show(`Профиль «${name}» удалён`, 'success');
        if (!document.querySelector('.profile-card')) {
            document.getElementById('emptyProfiles')?.classList.remove('d-none');
        }
    } catch(e) {
        Toast.show(e.message, 'danger');
    }
}

async function importFromFile(file, mode, saveAsProfile) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    formData.append('saveAsProfile', saveAsProfile);
    try {
        const resp = await fetch(CTX + 'profiles/import', { method: 'POST', body: formData });
        const json = await resp.json().catch(() => null);
        if (!resp.ok || json?.success === false) throw new Error(json?.message || `HTTP ${resp.status}`);
        Toast.show(json?.message || 'Импорт выполнен', 'success');
        setTimeout(() => location.assign(CTX + 'stubs'), 800);
    } catch(e) {
        Toast.show('Ошибка импорта: ' + e.message, 'danger');
    }
}
