// ── contacts.js ──────────────────────────────────────────────────────────────
// Emergency Contacts: CRUD, localStorage persistence, Firebase sync, call/SMS

const CONTACTS_KEY = 'safeguard_contacts';

// ── Load contacts from localStorage ─────────────────────────────────────────
function loadContacts() {
  try {
    return JSON.parse(localStorage.getItem(CONTACTS_KEY)) || [];
  } catch {
    return [];
  }
}

// ── Save contacts to localStorage (+ optional Firebase) ──────────────────────
function persistContacts(contacts) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));

  // Sync to Firebase if available
  if (window.db && window.addDoc && window.collection) {
    try {
      // We store the whole list as a single "snapshot" doc under user id
      // (For a real multi-user system you'd use a user uid as the doc id)
      window.addDoc(window.collection(window.db, 'contacts'), {
        snapshot: contacts,
        updatedAt: new Date().toISOString(),
      }).catch(() => {}); // silently ignore offline errors
    } catch (_) {}
  }
}

// ── Render contacts list ─────────────────────────────────────────────────────
function renderContacts() {
  const contacts = loadContacts();
  const list = document.getElementById('contacts-list');
  const countEl = document.getElementById('contact-count');
  if (countEl) countEl.textContent = contacts.length;
  if (!list) return;

  if (contacts.length === 0) {
    list.innerHTML = `<div class="placeholder-text">No emergency contacts added yet.</div>`;
    return;
  }

  list.innerHTML = contacts.map((c, i) => `
    <div class="contact-card" id="contact-${i}">
      <div class="contact-avatar">${avatarLetter(c.name)}</div>
      <div class="contact-info">
        <div class="contact-name">${escHtml(c.name)}</div>
        <div class="contact-phone">${escHtml(c.phone)}</div>
        ${c.email ? `<div class="contact-email">${escHtml(c.email)}</div>` : ''}
      </div>
      <div class="contact-actions">
        <a class="btn btn-ghost btn-xs icon-btn" href="tel:${encodeURIComponent(c.phone)}" title="Call">📞</a>
        <a class="btn btn-ghost btn-xs icon-btn" href="sms:${encodeURIComponent(c.phone)}" title="SMS">💬</a>
        <button class="btn btn-ghost btn-xs icon-btn danger" onclick="deleteContact(${i})" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

// ── Show add-contact form ────────────────────────────────────────────────────
function showAddContact() {
  const form = document.getElementById('add-contact-form');
  if (form) {
    form.style.display = 'block';
    document.getElementById('c-name').focus();
  }
}

// ── Save new contact ─────────────────────────────────────────────────────────
function saveContact() {
  const name  = (document.getElementById('c-name')?.value  || '').trim();
  const phone = (document.getElementById('c-phone')?.value || '').trim();
  const email = (document.getElementById('c-email')?.value || '').trim();

  if (!name)  { showContactError('Please enter a name.'); return; }
  if (!phone) { showContactError('Please enter a phone number.'); return; }
  if (!isValidPhone(phone)) { showContactError('Please enter a valid phone number.'); return; }

  const contacts = loadContacts();
  contacts.push({ name, phone, email, addedAt: new Date().toISOString() });
  persistContacts(contacts);

  // Reset form
  ['c-name','c-phone','c-email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('add-contact-form').style.display = 'none';

  renderContacts();
  logEvent(`👤 Contact added: ${name}`);
}

// ── Delete contact ───────────────────────────────────────────────────────────
function deleteContact(index) {
  const contacts = loadContacts();
  const removed = contacts.splice(index, 1);
  persistContacts(contacts);
  renderContacts();
  if (removed.length) logEvent(`🗑️ Contact removed: ${removed[0].name}`);
}

// ── Notify all contacts (called from sos.js during SOS) ──────────────────────
function getEmergencyContacts() {
  return loadContacts();
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function avatarLetter(name) {
  return (name || '?')[0].toUpperCase();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidPhone(phone) {
  // Accept + prefix, digits, spaces, dashes, parens — at least 7 digits
  return /^[\+\d\s\-\(\)]{7,20}$/.test(phone);
}

function showContactError(msg) {
  // Reuse logEvent if available, else alert
  if (typeof logEvent === 'function') {
    logEvent(`⚠️ ${msg}`);
  } else {
    alert(msg);
  }
}

// ── Inline CSS for contact cards (injected once) ──────────────────────────────
(function injectContactStyles() {
  if (document.getElementById('contact-styles')) return;
  const style = document.createElement('style');
  style.id = 'contact-styles';
  style.textContent = `
    .contact-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .contact-card:last-child { border-bottom: none; }
    .contact-avatar {
      width: 42px; height: 42px;
      background: linear-gradient(135deg,#E8271A,#ff6b57);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 18px; color: #fff;
      flex-shrink: 0;
    }
    .contact-info { flex: 1; min-width: 0; }
    .contact-name  { font-weight: 600; font-size: 15px; }
    .contact-phone { font-size: 13px; opacity: .7; margin-top: 2px; }
    .contact-email { font-size: 12px; opacity: .5; }
    .contact-actions { display: flex; gap: 6px; }
    .icon-btn { font-size: 16px; padding: 6px 8px !important; }
    .icon-btn.danger:hover { color: #E8271A; }
    .btn-xs { font-size: 12px; padding: 4px 10px; }
  `;
  document.head.appendChild(style);
})();

// ── Export ────────────────────────────────────────────────────────────────────
window.renderContacts      = renderContacts;
window.showAddContact      = showAddContact;
window.saveContact         = saveContact;
window.deleteContact       = deleteContact;
window.getEmergencyContacts = getEmergencyContacts;
