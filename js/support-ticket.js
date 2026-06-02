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

  // ── EmailJS emails (optional) ────────────────────────────
  async function sendEmails(data) {
    if (
      typeof emailjs === 'undefined' ||
      EMAILJS_SERVICE_ID === 'YOUR_EMAILJS_SERVICE_ID' ||
      EMAILJS_PUBLIC_KEY === 'YOUR_EMAILJS_PUBLIC_KEY'
    ) return; // Not configured — skip silently

    try {
      emailjs.init(EMAILJS_PUBLIC_KEY);

      // 1. Confirmation email to client
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CONFIRMATION, {
        to_email:      data.email,
        to_name:       data.contact_name,
        ticket_number: data.ticket_number,
        company_name:  data.company_name,
        subject:       data.subject,
        category:      data.category,
        description:   data.description,
      });

      // 2. Notification email to admin
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ADMIN, {
        to_email:      ADMIN_EMAIL,
        to_name:       'Kamran',
        ticket_number: data.ticket_number,
        contact_name:  data.contact_name,
        company_name:  data.company_name,
        email:         data.email,
        phone:         data.phone || 'Not provided',
        category:      data.category,
        subject:       data.subject,
        description:   data.description,
      });

    } catch (err) {
      console.warn('EmailJS send failed (non-fatal):', err);
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
      showError('Error: ' + (err.message || JSON.stringify(err)));
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
