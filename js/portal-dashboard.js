// ============================================================
// KomTek Portal — Dashboard Logic
// ============================================================

(function () {
  'use strict';

  const STATUS_MAP = {
    'open':            { label: 'Open',            css: 'badge-open' },
    'in-progress':     { label: 'In Progress',     css: 'badge-in-progress' },
    'awaiting-client': { label: 'Awaiting Client', css: 'badge-awaiting' },
    'resolved':        { label: 'Resolved',        css: 'badge-resolved' },
    'closed':          { label: 'Closed',          css: 'badge-closed' },
  };

  const PRIORITY_MAP = {
    'low':    { label: 'Low',    css: 'badge-low' },
    'normal': { label: 'Normal', css: 'badge-normal' },
    'high':   { label: 'High',   css: 'badge-high' },
    'urgent': { label: 'Urgent', css: 'badge-urgent' },
  };

  const CATEGORY_MAP = {
    'voip':              { label: 'VoIP',             css: 'badge-voip' },
    'it-support':        { label: 'IT Support',       css: 'badge-it' },
    'digital-marketing': { label: 'Digital Marketing',css: 'badge-marketing' },
    'web-design':        { label: 'Web Design',       css: 'badge-web' },
  };

  const PAGE_SIZE = 10;
  let currentPage = 1;
  let totalCount  = 0;
  let agents      = [];

  // ── Filters ──────────────────────────────────────────────
  const filterStatus   = document.getElementById('filterStatus');
  const filterCategory = document.getElementById('filterCategory');
  const filterAssigned = document.getElementById('filterAssigned');
  const searchInput    = document.getElementById('searchInput');
  const tbody          = document.getElementById('ticketsBody');
  const paginationEl   = document.getElementById('pagination');

  // ── Load agents for filter dropdown ──────────────────────
  async function loadAgents() {
    const { data } = await db.from('profiles').select('id, full_name').eq('is_active', true).order('full_name');
    agents = data || [];

    if (filterAssigned) {
      agents.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.full_name;
        filterAssigned.appendChild(opt);
      });
    }
  }

  // ── Load stats ────────────────────────────────────────────
  async function loadStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [open, inProgress, resolvedToday, total] = await Promise.all([
      db.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      db.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'in-progress'),
      db.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'resolved').gte('updated_at', todayISO),
      db.from('tickets').select('id', { count: 'exact', head: true }),
    ]);

    document.getElementById('statOpen').textContent        = open.count ?? 0;
    document.getElementById('statInProgress').textContent  = inProgress.count ?? 0;
    document.getElementById('statResolved').textContent    = resolvedToday.count ?? 0;
    document.getElementById('statTotal').textContent       = total.count ?? 0;
  }

  // ── Load tickets ──────────────────────────────────────────
  async function loadTickets() {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20M2 12h20"/></svg>Loading…</td></tr>`;

    let query = db
      .from('tickets')
      .select('id, ticket_number, company_name, category, subject, status, priority, assigned_name, created_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    const status   = filterStatus?.value;
    const category = filterCategory?.value;
    const assigned = filterAssigned?.value;
    const search   = searchInput?.value.trim();

    if (status)   query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (assigned) query = query.eq('assigned_to', assigned);
    if (search)   query = query.or(`ticket_number.ilike.%${search}%,company_name.ilike.%${search}%,subject.ilike.%${search}%,contact_name.ilike.%${search}%`);

    // Pagination
    const from = (currentPage - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data: tickets, error, count } = await query;

    if (error) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-state" style="color:#dc2626">Error loading tickets: ${error.message}</td></tr>`;
      return;
    }

    totalCount = count || 0;

    if (!tickets || tickets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9">
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h4"/></svg>
          <p>No tickets found</p>
        </div>
      </td></tr>`;
      renderPagination();
      return;
    }

    tbody.innerHTML = tickets.map(t => {
      const s = STATUS_MAP[t.status]   || { label: t.status,   css: 'badge-open' };
      const p = PRIORITY_MAP[t.priority]|| { label: t.priority, css: 'badge-normal' };
      const c = CATEGORY_MAP[t.category]|| { label: t.category, css: 'badge-voip' };
      const created = new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      return `
        <tr>
          <td><a href="ticket.html?id=${t.id}" style="color:var(--primary);font-weight:600;font-size:.82rem">${escHtml(t.ticket_number)}</a></td>
          <td style="font-weight:500">${escHtml(t.company_name)}</td>
          <td><span class="badge ${c.css}">${c.label}</span></td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.subject)}</td>
          <td><span class="badge ${s.css}">${s.label}</span></td>
          <td><span class="badge ${p.css}">${p.label}</span></td>
          <td>${t.assigned_name ? escHtml(t.assigned_name) : '<span style="color:var(--muted)">—</span>'}</td>
          <td style="white-space:nowrap">${created}</td>
          <td><a href="ticket.html?id=${t.id}" class="btn btn-primary" style="padding:.35rem .75rem;font-size:.8rem">View</a></td>
        </tr>`;
    }).join('');

    renderPagination();
  }

  // ── Pagination ────────────────────────────────────────────
  function renderPagination() {
    if (!paginationEl) return;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

    let html = '';
    if (currentPage > 1) html += `<button class="page-btn" data-page="${currentPage - 1}">&laquo;</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (i === currentPage || Math.abs(i - currentPage) <= 2 || i === 1 || i === totalPages) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (Math.abs(i - currentPage) === 3) {
        html += `<span style="padding:.4rem .5rem;color:var(--muted)">…</span>`;
      }
    }
    if (currentPage < totalPages) html += `<button class="page-btn" data-page="${currentPage + 1}">&raquo;</button>`;

    paginationEl.innerHTML = html;
    paginationEl.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        loadTickets();
        document.getElementById('ticketsTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ── Utility ───────────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Wire filter events ────────────────────────────────────
  let searchTimer;
  [filterStatus, filterCategory, filterAssigned].forEach(el => {
    el?.addEventListener('change', () => { currentPage = 1; loadTickets(); });
  });
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { currentPage = 1; loadTickets(); }, 350);
  });

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    await portalAuth.init();
    await Promise.all([loadStats(), loadAgents()]);
    await loadTickets();

    // Refresh stats + table every 60s
    setInterval(() => { loadStats(); loadTickets(); }, 60000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
