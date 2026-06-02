// ============================================================
// KomTek My Ticket — Client Lookup Logic
// ============================================================

(function () {
  'use strict';

  const form        = document.getElementById('lookupForm');
  const errorBox    = document.getElementById('lookupError');
  const resultPanel = document.getElementById('ticketResult');
  const lookupWrap  = document.getElementById('lookupWrap');
  const lookupBtn   = document.getElementById('lookupBtn');

  // Status label + badge class map
  const STATUS_MAP = {
    'open':            { label: 'Open',            css: 'badge-open' },
    'in-progress':     { label: 'In Progress',     css: 'badge-in-progress' },
    'awaiting-client': { label: 'Awaiting You',    css: 'badge-awaiting' },
    'resolved':        { label: 'Resolved',        css: 'badge-resolved' },
    'closed':          { label: 'Closed',          css: 'badge-closed' },
  };

  const CATEGORY_MAP = {
    'voip':              'VoIP',
    'it-support':        'IT Support',
    'digital-marketing': 'Digital Marketing',
    'web-design':        'Web Design',
  };

  function setLoading(on) {
    if (on) {
      lookupBtn.disabled = true;
      lookupBtn.innerHTML = `
        <svg style="width:18px;height:18px;animation:spin 1s linear infinite" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Looking up…`;
    } else {
      lookupBtn.disabled = false;
      lookupBtn.textContent = 'Track Ticket';
    }
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
    resultPanel.style.display = 'none';
  }

  function hideError() {
    errorBox.style.display = 'none';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function buildTimeline(updates) {
    if (!updates || updates.length === 0) {
      return '<p style="color:var(--muted);font-size:.9rem">No updates yet. We\'ll be in touch soon!</p>';
    }
    return updates.map(u => `
      <div class="timeline-item">
        <div class="timeline-avatar">${getInitials(u.author_name)}</div>
        <div class="timeline-body">
          <div class="timeline-meta">
            <strong>${escapeHtml(u.author_name)}</strong> &middot; ${formatDate(u.created_at)}
          </div>
          <div class="timeline-msg">${escapeHtml(u.message)}</div>
        </div>
      </div>
    `).join('');
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError();

    const email        = document.getElementById('lookupEmail').value.trim();
    const ticketNumber = document.getElementById('lookupTicket').value.trim().toUpperCase();

    if (!email || !ticketNumber) {
      showError('Please enter both your email address and ticket number.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      // Use the RPC function to bypass RLS (it's SECURITY DEFINER)
      const { data: tickets, error: ticketErr } = await db
        .rpc('get_my_ticket', { p_email: email, p_ticket_number: ticketNumber });

      if (ticketErr) throw ticketErr;

      if (!tickets || tickets.length === 0) {
        showError('No ticket found matching those details. Please check your email and ticket number.');
        setLoading(false);
        return;
      }

      const ticket = tickets[0];

      // Fetch public updates
      const { data: updates, error: updatesErr } = await db
        .rpc('get_ticket_updates_public', { p_ticket_number: ticketNumber, p_email: email });

      if (updatesErr) console.warn('Could not load updates:', updatesErr);

      // Build status badge
      const statusInfo = STATUS_MAP[ticket.status] || { label: ticket.status, css: 'badge-open' };
      const catLabel   = CATEGORY_MAP[ticket.category] || ticket.category;

      // Populate result panel
      document.getElementById('resTicketNum').textContent  = ticket.ticket_number;
      document.getElementById('resCategory').textContent   = catLabel;
      document.getElementById('resStatus').textContent     = statusInfo.label;
      document.getElementById('resStatus').className       = `badge ${statusInfo.css}`;
      document.getElementById('resCreated').textContent    = formatDate(ticket.created_at);
      document.getElementById('resUpdated').textContent    = formatDate(ticket.updated_at);
      document.getElementById('resCompany').textContent    = ticket.company_name;
      document.getElementById('resContact').textContent    = ticket.contact_name;
      document.getElementById('resSubject').textContent    = ticket.subject;
      document.getElementById('resDescription').textContent= ticket.description;
      document.getElementById('resTimeline').innerHTML     = buildTimeline(updates || []);
      if (ticket.assigned_name) {
        document.getElementById('resAssigned').textContent = ticket.assigned_name;
      } else {
        document.getElementById('resAssigned').textContent = 'Unassigned';
      }

      resultPanel.style.display = 'block';
      resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error('Ticket lookup error:', err);
      showError('Unable to look up your ticket right now. Please try again or call us on 0333 305 6676.');
    } finally {
      setLoading(false);
    }
  });

  // Inline spin keyframe
  if (!document.getElementById('spinStyle')) {
    const style = document.createElement('style');
    style.id = 'spinStyle';
    style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }
})();
