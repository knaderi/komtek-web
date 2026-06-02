// ============================================================
// KomTek Portal — Ticket Detail Logic
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
    'voip':              { label: 'VoIP',              css: 'badge-voip' },
    'it-support':        { label: 'IT Support',        css: 'badge-it' },
    'digital-marketing': { label: 'Digital Marketing', css: 'badge-marketing' },
    'web-design':        { label: 'Web Design',        css: 'badge-web' },
  };

  let ticketId = null;
  let ticketData = null;

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  }

  // ── Load ticket ───────────────────────────────────────────
  async function loadTicket() {
    const { data: ticket, error } = await db
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error || !ticket) {
      document.getElementById('ticketContent').innerHTML =
        '<div class="alert alert-error">Ticket not found or you do not have access.</div>';
      return;
    }

    ticketData = ticket;

    const s = STATUS_MAP[ticket.status]    || { label: ticket.status,   css: 'badge-open' };
    const p = PRIORITY_MAP[ticket.priority]|| { label: ticket.priority, css: 'badge-normal' };
    const c = CATEGORY_MAP[ticket.category]|| { label: ticket.category, css: 'badge-voip' };

    // Header
    document.getElementById('ticketNumTitle').textContent = ticket.ticket_number;
    document.getElementById('ticketCatBadge').textContent = c.label;
    document.getElementById('ticketCatBadge').className   = `badge ${c.css}`;
    document.getElementById('ticketStatusBadge').textContent = s.label;
    document.getElementById('ticketStatusBadge').className   = `badge ${s.css}`;

    // Info grid
    document.getElementById('infoCompany').textContent = ticket.company_name;
    document.getElementById('infoContact').textContent = ticket.contact_name;
    document.getElementById('infoEmail').innerHTML     = `<a href="mailto:${escHtml(ticket.email)}" style="color:var(--primary)">${escHtml(ticket.email)}</a>`;
    document.getElementById('infoPhone').textContent   = ticket.phone || '—';

    // Subject + description
    document.getElementById('ticketSubject').textContent     = ticket.subject;
    document.getElementById('ticketDescription').textContent = ticket.description;

    // Sidebar
    document.getElementById('sideStatus').value   = ticket.status;
    document.getElementById('sidePriority').value = ticket.priority;
    document.getElementById('sideCreated').textContent = formatDate(ticket.created_at);
    document.getElementById('sideUpdated').textContent = formatDate(ticket.updated_at);

    // Set page title
    document.title = `${ticket.ticket_number} — KomTek Portal`;

    await Promise.all([loadUpdates(), loadAgents()]);
  }

  // ── Load updates / timeline ───────────────────────────────
  async function loadUpdates() {
    const { data: updates, error } = await db
      .from('ticket_updates')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    const timelineEl = document.getElementById('timeline');
    if (error || !updates || updates.length === 0) {
      timelineEl.innerHTML = '<p style="color:var(--muted);font-size:.9rem;padding:1.5rem">No updates yet.</p>';
      return;
    }

    timelineEl.innerHTML = updates.map(u => {
      const isInternal = u.is_internal;
      return `
        <div class="timeline-item">
          <div class="timeline-avatar" style="${isInternal ? 'background:#ca8a04' : ''}">${getInitials(u.author_name)}</div>
          <div class="timeline-body">
            <div class="timeline-meta">
              <strong>${escHtml(u.author_name)}</strong>
              ${isInternal ? '<span class="badge badge-awaiting" style="margin-left:.4rem;font-size:.7rem">Internal Note</span>' : ''}
              &middot; ${formatDate(u.created_at)}
            </div>
            <div class="timeline-msg ${isInternal ? 'internal' : ''}">${escHtml(u.message).replace(/\n/g,'<br>')}</div>
          </div>
        </div>`;
    }).join('');
  }

  // ── Load agents for assign dropdown ──────────────────────
  async function loadAgents() {
    const { data: agents } = await db
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name');

    const sideAssign = document.getElementById('sideAssign');
    if (!sideAssign || !agents) return;

    sideAssign.innerHTML = '<option value="">— Unassigned —</option>';
    agents.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.full_name;
      if (ticketData && ticketData.assigned_to === a.id) opt.selected = true;
      sideAssign.appendChild(opt);
    });
  }

  // ── Update status ─────────────────────────────────────────
  document.getElementById('btnUpdateStatus')?.addEventListener('click', async () => {
    const newStatus = document.getElementById('sideStatus').value;
    const profile   = portalAuth.getProfile();
    const btn = document.getElementById('btnUpdateStatus');

    btn.disabled = true;
    btn.textContent = 'Updating…';

    const { error } = await db.from('tickets').update({ status: newStatus }).eq('id', ticketId);

    if (!error) {
      // Add internal note
      await db.from('ticket_updates').insert({
        ticket_id:   ticketId,
        author_id:   portalAuth.getUser()?.id,
        author_name: profile?.full_name || 'Staff',
        message:     `Status updated to: ${STATUS_MAP[newStatus]?.label || newStatus}`,
        is_internal: true,
      });

      const s = STATUS_MAP[newStatus] || { label: newStatus, css: 'badge-open' };
      document.getElementById('ticketStatusBadge').textContent = s.label;
      document.getElementById('ticketStatusBadge').className   = `badge ${s.css}`;
      await loadUpdates();
      showSidebarMsg('Status updated.', 'success');
    } else {
      showSidebarMsg('Error updating status.', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Update Status';
  });

  // ── Update priority ───────────────────────────────────────
  document.getElementById('btnUpdatePriority')?.addEventListener('click', async () => {
    const newPriority = document.getElementById('sidePriority').value;
    const profile = portalAuth.getProfile();
    const btn = document.getElementById('btnUpdatePriority');

    btn.disabled = true;
    btn.textContent = 'Updating…';

    const { error } = await db.from('tickets').update({ priority: newPriority }).eq('id', ticketId);

    if (!error) {
      await db.from('ticket_updates').insert({
        ticket_id:   ticketId,
        author_id:   portalAuth.getUser()?.id,
        author_name: profile?.full_name || 'Staff',
        message:     `Priority updated to: ${PRIORITY_MAP[newPriority]?.label || newPriority}`,
        is_internal: true,
      });
      await loadUpdates();
      showSidebarMsg('Priority updated.', 'success');
    } else {
      showSidebarMsg('Error updating priority.', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Update Priority';
  });

  // ── Assign ticket ─────────────────────────────────────────
  document.getElementById('btnAssign')?.addEventListener('click', async () => {
    const agentId = document.getElementById('sideAssign').value;
    const select  = document.getElementById('sideAssign');
    const agentName = agentId ? select.options[select.selectedIndex].text : null;
    const profile = portalAuth.getProfile();
    const btn = document.getElementById('btnAssign');

    btn.disabled = true;
    btn.textContent = 'Assigning…';

    const { error } = await db.from('tickets').update({
      assigned_to:   agentId || null,
      assigned_name: agentName || null,
    }).eq('id', ticketId);

    if (!error) {
      await db.from('ticket_updates').insert({
        ticket_id:   ticketId,
        author_id:   portalAuth.getUser()?.id,
        author_name: profile?.full_name || 'Staff',
        message:     agentName ? `Ticket assigned to ${agentName}.` : 'Ticket unassigned.',
        is_internal: true,
      });
      await loadUpdates();
      showSidebarMsg('Assignment updated.', 'success');
    } else {
      showSidebarMsg('Error updating assignment.', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Assign';
  });

  // ── Add update / note ─────────────────────────────────────
  document.getElementById('btnAddUpdate')?.addEventListener('click', async () => {
    const message    = document.getElementById('updateMessage').value.trim();
    const isInternal = document.getElementById('isInternal').checked;
    const profile    = portalAuth.getProfile();

    if (!message) {
      document.getElementById('updateMessage').classList.add('error');
      return;
    }
    document.getElementById('updateMessage').classList.remove('error');

    const btn = document.getElementById('btnAddUpdate');
    btn.disabled = true;
    btn.textContent = 'Posting…';

    const { error } = await db.from('ticket_updates').insert({
      ticket_id:   ticketId,
      author_id:   portalAuth.getUser()?.id,
      author_name: profile?.full_name || 'Staff',
      message,
      is_internal: isInternal,
    });

    if (!error) {
      document.getElementById('updateMessage').value = '';
      document.getElementById('isInternal').checked  = false;

      // If not internal, also update ticket updated_at
      if (!isInternal) {
        await db.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticketId);
        document.getElementById('sideUpdated').textContent = formatDate(new Date().toISOString());
      }

      await loadUpdates();
      document.getElementById('timeline').lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      alert('Error posting update: ' + error.message);
    }

    btn.disabled = false;
    btn.textContent = 'Add Update';
  });

  // ── Sidebar flash message ─────────────────────────────────
  function showSidebarMsg(msg, type) {
    const el = document.getElementById('sidebarMsg');
    if (!el) return;
    el.textContent = msg;
    el.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
  }

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    await portalAuth.init();

    ticketId = getParam('id');
    if (!ticketId) {
      document.getElementById('ticketContent').innerHTML =
        '<div class="alert alert-error">No ticket ID specified. <a href="dashboard.html">Back to Dashboard</a></div>';
      return;
    }

    await loadTicket();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
