const CONTACT_COLORS = ['#E8271A', '#F5780A', '#0EC95B', '#7C5CFC', '#F5B50A'];

/** Render all contacts into the contacts list */
function renderContacts() {
  document.getElementById('contact-count').textContent = state.contacts.length;

  const el = document.getElementById('contacts-list');

  if (!state.contacts.length) {
    el.innerHTML = `
      <div class="placeholder-center">
        No emergency contacts yet.<br>
        Add contacts so they receive SOS alerts.
      </div>`;
    return;
  }

  el.innerHTML = state.contacts.map((c, i) => `
    <div class="contact-row">
      <div class="contact-avatar"
        style="background:${CONTACT_COLORS[i % 5]}22; color:${CONTACT_COLORS[i % 5]}">
        ${c.name.charAt(0).toUpperCase()}
      </div>
      <div class="contact-info">
        <div class="contact-name">${c.name}</div>
        <div class="contact-phone">${c.phone || c.email || 'No contact info'}</div>
      </div>
      <span class="contact-status ${state.sosActive ? 'notified' : 'pending'}">
        ${state.sosActive ? 'Notified' : 'Ready'}
      </span>
      <button class="contact-remove" onclick="removeContact(${i})" title="Remove">×</button>
    </div>`
  ).join('');
}

/** Show the add-contact form */
function showAddContact() {
  document.getElementById('add-contact-form').style.display = 'block';
}

/** Save a new contact from form inputs */
function saveContact() {
  const name  = document.getElementById('c-name').value.trim();
  const phone = document.getElementById('c-phone').value.trim();
  const email = document.getElementById('c-email').value.trim();

  if (!name) {
    alert('Name is required');
    return;
  }

  state.contacts.push({ name, phone, email });

  // Clear form
  ['c-name', 'c-phone', 'c-email'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('add-contact-form').style.display = 'none';

  renderContacts();
  addLog('loc-log', '👥', `Contact added: ${name}`, 'Will be notified during SOS');
}

/** Remove a contact by index */
function removeContact(index) {
  const name = state.contacts[index]?.name;
  state.contacts.splice(index, 1);
  renderContacts();
  if (name) addLog('warn-log', '🗑️', `Contact removed: ${name}`, '');
}
