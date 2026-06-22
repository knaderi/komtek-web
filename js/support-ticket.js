// ============================================================
// KomTek Support Ticket — Submission Logic
// ============================================================

(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────
  const form        = document.getElementById('ticketForm');
  const submitBtn   = document.getElementById('submitBtn');
  const errorBox    = document.getElementById('formError');
  const successPanel= document.getElementById('successPanel');
  const formWrap    = document.getElementById('formWrap');
  const ticketNumEl = document.getElementById('ticketNum');
  const categoryCards = document.querySelectorAll('.category-card');
  const categoryInput = document.getElementById('category');

  // ── Category card selection ───────────────────────────────
  categoryCards.forEach(card => {
    card.addEventListener('click', () => {
      categoryCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      categoryInput.value = card.dataset.category;
      clearFieldError(categoryInput);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
  });

  // ── Validation helpers ────────────────────────────────────
  function showFieldError(input, msg) {
    input.classList.add('error');
    const existing = input.parentElement.querySelector('.form-error');
    if (!existing) {
      const el = document.createElement('span');
      el.className = 'form-error';
      el.textContent = msg;
      input.parentElement.appendChild(el);
    }
  }

  function clearFieldError(input) {
    input.classList.remove('error');
    const el = input.parentElement.querySelector('.form-error');
    if (el) el.remove();
  }

  function validateForm() {
    let valid = true;
    const required = form.querySelectorAll('[required]');
    required.forEach(field => {
      clearFieldError(field);
      if (!field.value.trim()) {
        showFieldError(field, 'This field is required.');
        valid = false;
      }
    });

    // Category
    if (!categoryInput.value) {
      const categorySection = document.getElementById('categorySection');
      let existing = categorySection.querySelector('.form-error');
      if (!existing) {
        const el = document.createElement('p');
        el.className = 'form-error';
        el.style.marginTop = '-.5rem';
        el.style.marginBottom = '1rem';
        el.textContent = 'Please select a service category.';
        categorySection.appendChild(el);
      }
      valid = false;
    } else {
      const categorySection = document.getElementById('categorySection');
      const existing = categorySection.querySelector('.form-error');
      if (existing) existing.remove();
    }

    // Email format
    const emailField = document.getElementById('email');
    if (emailField.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
      showFieldError(emailField, 'Please enter a valid email address.');
      valid = false;
    }

    return valid;
  }

  // ── Show / hide global error ──────────────────────────────
  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    errorBox.style.display = 'none';
  }

  // ── Loading state ─────────────────────────────────────────
  function setLoading(loading) {
    if (loading) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg style="width:18px;height:18px;animation:spin 1s linear infinite" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Submitting…`;
    } else {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit Ticket';
    }
  }

  // ── Send emails via server-side PHP ──────────────────────
  async function sendEmails(data) {
    try {
      const fd = new FormData();
      fd.append('ticket_number', data.ticket_number);
      fd.append('company_name',  data.company_name);
      fd.append('contact_name',  data.contact_name);
      fd.append('email',         data.email);
      fd.append('phone',         data.phone || '');
      fd.append('category',      data.category);
      fd.append('subject',       data.subject);
      fd.append('description',   data.description);
      const res = await fetch('ticket-mail.php', { method: 'POST', body: fd });
      const json = await res.json();
      console.log('Email result:', json);
    } catch (err) {
      console.error('Email send error:', err);
    }
  }

  // ── Main submit handler ───────────────────────────────────
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError();

    if (!validateForm()) return;

    const payload = {
      company_name: document.getElementById('companyName').value.trim(),
      contact_name: document.getElementById('contactName').value.trim(),
      email:        document.getElementById('email').value.trim().toLowerCase(),
      phone:        document.getElementById('phone').value.trim() || null,
      category:     categoryInput.value,
      subject:      document.getElementById('subject').value.trim(),
      description:  document.getElementById('description').value.trim(),
    };

    setLoading(true);

    try {
      // Insert ticket via secure function (bypasses RLS)
      const { data: rows, error: insertErr } = await db.rpc('submit_ticket', {
        p_company_name: payload.company_name,
        p_contact_name: payload.contact_name,
        p_email:        payload.email,
        p_phone:        payload.phone || '',
        p_category:     payload.category,
        p_subject:      payload.subject,
        p_description:  payload.description,
      });

      if (insertErr) throw insertErr;
      const inserted = rows[0];

      // Add initial system update via secure function
      await db.rpc('add_ticket_update', {
        p_ticket_id:   inserted.id,
        p_author_name: 'System',
        p_message:     `Ticket created by ${payload.contact_name} (${payload.company_name}). Category: ${payload.category}.`,
        p_is_internal: true,
      }).then(() => {});

      // Send emails to client and admin
      await sendEmails({ ...payload, ticket_number: inserted.ticket_number });

      // Show success
      ticketNumEl.textContent = inserted.ticket_number;
      formWrap.style.display = 'none';
      successPanel.style.display = 'block';
      successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error('Ticket submission error:', err);
      const isNetworkErr = err instanceof TypeError && (
        err.message.includes('NetworkError') || err.message.includes('Failed to fetch')
      );
      const msg = isNetworkErr
        ? 'Unable to connect to our ticketing system. Please try again in a moment, or contact us directly at support@komtek.co.uk or 0333 305 6676.'
        : 'Something went wrong submitting your ticket. Please try again or contact us at support@komtek.co.uk.';
      showError(msg);
      setLoading(false);
    }
  });

  // ── Inline spin keyframe (no extra CSS file needed) ──────
  if (!document.getElementById('spinStyle')) {
    const style = document.createElement('style');
    style.id = 'spinStyle';
    style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }
})();
