// ============================================================
// KomTek Portal — User Management Logic
// ============================================================

(function () {
  'use strict';

  const tbody    = document.getElementById('usersBody');
  const modal    = document.getElementById('addUserModal');
  const modalErr = document.getElementById('modalError');

  // ── Load users ────────────────────────────────────────────
  async function loadUsers() {
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--muted)">Loading…</td></tr>`;

    const { data: users, error } = await db
      .from('profiles')
      .select('*')
      .order('full_name');

    if (error) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:#dc2626;padding:1rem">${error.message}</td></tr>`;
      return;
    }

    if (!users || users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--muted)">No users found.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr id="user-row-${u.id}">
        <td style="font-weight:600">${escHtml(u.full_name)}</td>
        <td>${escHtml(u.email)}</td>
        <td>
          <select onchange="updateRole('${u.id}', this.value)" style="padding:.35rem .6rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.85rem;background:#fff">
            <option value="agent" ${u.role === 'agent' ? 'selected' : ''}>Agent</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </td>
        <td>
          <span class="badge ${u.is_active ? 'badge-resolved' : 'badge-closed'}">
            ${u.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <button onclick="toggleActive('${u.id}', ${u.is_active})"
            class="btn ${u.is_active ? 'btn-outline' : 'btn-primary'}"
            style="padding:.35rem .75rem;font-size:.8rem">
            ${u.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      </tr>`).join('');
  }

  // ── Update role ───────────────────────────────────────────
  window.updateRole = async function (userId, newRole) {
    const { error } = await db.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) alert('Error updating role: ' + error.message);
    else showToast('Role updated successfully.');
  };

  // ── Toggle active ─────────────────────────────────────────
  window.toggleActive = async function (userId, currentlyActive) {
    const { error } = await db.from('profiles').update({ is_active: !currentlyActive }).eq('id', userId);
    if (error) alert('Error updating status: ' + error.message);
    else { showToast('User status updated.'); await loadUsers(); }
  };

  // ── Modal show/hide ───────────────────────────────────────
  window.openAddUserModal = function () {
    if (modal) {
      modal.style.display = 'flex';
      modalErr.style.display = 'none';
      document.getElementById('modalForm')?.reset();
    }
  };

  window.closeAddUserModal = function () {
    if (modal) modal.style.display = 'none';
  };

  // Close on backdrop click
  modal?.addEventListener('click', e => {
    if (e.target === modal) closeAddUserModal();
  });

  // ── Toast ─────────────────────────────────────────────────
  function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 3000);
  }

  // ── Escape html ───────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    const { profile } = await portalAuth.init();

    // Redirect non-admins
    if (!portalAuth.isAdmin()) {
      window.location.href = 'dashboard.html';
      return;
    }

    await loadUsers();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
