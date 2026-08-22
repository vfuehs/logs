const logTypeConfig = {
  // Edit each section to change the prompts for that log type.
  Software: {
    color: 'cyan',
    fields: [
      { key: 'title', label: 'New or Bug fix', prompt: 'What did you build or fix or did you do both?', required: true },
      { key: 'details', label: 'What changed?', prompt: 'Capture the change, bug, breakthrough, or next step...', type: 'textarea', required: true },
      { key: 'status', label: 'Current status', type: 'select', options: ['In progress', 'Done'] },
    ]
  },
  CAD: {
    color: 'violet',
    fields: [
      { key: 'title', label: 'Design focus', prompt: 'What did you design?', required: true },
      { key: 'details', label: 'What did you iterate?', prompt: 'Capture the iteration, measurements, or design decision...', type: 'textarea', required: true },
      { key: 'material', label: 'Material or process', prompt: 'e.g. PLA, aluminum, CNC' },
      { key: 'revision', label: 'Revision', prompt: 'e.g. v2.1, prototype B' },
      { key: 'context', label: 'Model / project', prompt: 'e.g. enclosure, bracket, client model' }
    ]
  },
  Outreach: {
    color: 'lime',
    fields: [
      { key: 'title', label: 'Contact or organization', prompt: 'Who did you connect with?', required: true },
      { key: 'details', label: 'What happened?', prompt: 'Capture the conversation, response, or follow-up...', type: 'textarea', required: true },
      { key: 'followUp', label: 'Follow-up date', prompt: 'e.g. Friday, Sep 4' },
      { key: 'nextStep', label: 'Next step', prompt: 'What needs to happen next?' },
      { key: 'context', label: 'Relationship / event', prompt: 'e.g. company, contact, event' }
    ]
  },
  Portfolio: {
    color: 'amber',
    fields: [
      { key: 'title', label: 'Work sample', prompt: 'What work is worth remembering?', required: true },
      { key: 'details', label: 'Why does it matter?', prompt: 'Capture what you made, learned, or want to show...', type: 'textarea', required: true },
      { key: 'achievement', label: 'Strongest result', prompt: 'What result or detail should stand out?' },
      { key: 'link', label: 'Link', prompt: 'e.g. URL, file path, or repository' },
      { key: 'context', label: 'Collection / project', prompt: 'e.g. case study, project, application' }
    ]
  },
  Parts: {
    color: 'coral',
    fields: [
      { key: 'title', label: 'Component', prompt: 'Which component needs a note?', required: true },
      { key: 'details', label: 'Inventory note', prompt: 'Capture the part, quantity, location, or compatibility note...', type: 'textarea', required: true },
      { key: 'partNumber', label: 'Part number', prompt: 'e.g. M3-014, 608ZZ' },
      { key: 'quantity', label: 'Quantity', prompt: 'How many are available?' },
      { key: 'context', label: 'Assembly / location', prompt: 'e.g. bin A3, robot arm, assembly' }
    ]
  },
  'Parts order': {
    color: 'blue',
    fields: [
      { key: 'title', label: 'Order item', prompt: 'What did you order?', required: true },
      { key: 'details', label: 'Order details', prompt: 'Capture the vendor, order status, cost, or tracking detail...', type: 'textarea', required: true },
      { key: 'vendor', label: 'Vendor', prompt: 'Who is supplying it?' },
      { key: 'orderStatus', label: 'Order status', type: 'select', options: ['To order', 'Ordered', 'Shipped', 'Received'] },
      { key: 'context', label: 'Vendor / project', prompt: 'e.g. vendor, purchase order, project' }
    ]
  },
  Meetings: {
    color: 'meeting',
    fields: [
      { key: 'title', label: 'Meeting topic', prompt: 'What was the meeting about?', required: true },
      { key: 'details', label: 'Decisions and next steps', prompt: 'Capture the decisions, action items, and owners...', type: 'textarea', required: true },
      { key: 'attendees', label: 'Attendees', prompt: 'Who was there?' },
      { key: 'nextStep', label: 'Next meeting or follow-up', prompt: 'What happens next, and when?' },
      { key: 'context', label: 'People / project', prompt: 'e.g. team, client, project' }
    ]
  }
};
const logTypes = Object.keys(logTypeConfig);
const supabaseClient = window.supabase.createClient(
  'https://kbaxgocmumrzlhynrquv.supabase.co',
  'sb_publishable_QAUBzkbVoQg9a0FUQGtJEQ_nUSPz7f9'
);
const databaseTable = 'logs';
const storageKey = 'trace-log-entries';
const deletedKey = 'trace-log-deleted-entries';
const homeView = document.querySelector('#home-view');
const formView = document.querySelector('#form-view');
const sheetView = document.querySelector('#sheet-view');
const lockView = document.querySelector('#lock-view');
const formType = document.querySelector('#form-type');
const logForm = document.querySelector('#log-form');
const formFields = document.querySelector('#form-fields');
const toast = document.querySelector('#toast');
let selectedType = 'Software';
let logsUnlocked = sessionStorage.getItem('trace-log-unlocked') === 'true';
let deletedEntries = JSON.parse(sessionStorage.getItem(deletedKey) || '[]');
let entries = [];

async function loadEntries() {
  try {
    const { data, error } = await supabaseClient.from(databaseTable).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    entries = data.map((entry) => ({
      id: entry.id,
      type: entry.type,
      title: entry.title,
      details: entry.details,
      context: entry.values?.context || '',
      time: entry.values?.time || 'Not specified',
      values: entry.values || {},
      createdAt: entry.created_at,
      color: entry.color || logTypeConfig[entry.type]?.color || 'cyan'
    }));
  } catch (error) {
    showToast('Could not connect to the shared log database.');
  }
}

function getEntries() {
  return entries;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function timeAgo(value) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function showOnly(view) {
  homeView.hidden = view !== homeView;
  formView.hidden = view !== formView;
  sheetView.hidden = view !== sheetView;
  lockView.hidden = view !== lockView;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderFormFields(type) {
  formFields.innerHTML = logTypeConfig[type].fields.map((field) => {
    const required = field.required ? ' required' : '';
    const prompt = field.prompt ? ` placeholder="${escapeHtml(field.prompt)}"` : '';
    if (field.type === 'textarea') {
      return `<label>${escapeHtml(field.label)}<textarea name="${escapeHtml(field.key)}" rows="6"${prompt}${required}></textarea></label>`;
    }
    if (field.type === 'select') {
      return `<label>${escapeHtml(field.label)}<select name="${escapeHtml(field.key)}">${field.options.map((option) => `<option>${escapeHtml(option)}</option>`).join('')}</select></label>`;
    }
    return `<label>${escapeHtml(field.label)}<input name="${escapeHtml(field.key)}"${prompt}${required} /></label>`;
  }).join('');
}

function openLogForm(type) {
  selectedType = type;
  formType.textContent = type;
  renderFormFields(type);
  showOnly(formView);
  formFields.querySelector('input, textarea, select').focus();
}

function openSheet(type) {
  selectedType = type;
  renderSheet();
  showOnly(sheetView);
}

function renderActivity() {
  const activityList = document.querySelector('#activity-list');
  const sortedEntries = getEntries().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  document.querySelector('#total-count').textContent = String(sortedEntries.length).padStart(2, '0');
  if (!sortedEntries.length) {
    activityList.innerHTML = '<div class="empty-activity">Your saved entries will appear here.</div>';
    return;
  }
  activityList.innerHTML = sortedEntries.slice(0, 4).map((entry) => `<article><span class="activity-dot ${entry.color}"></span><div><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.type)} <span>·</span> ${timeAgo(entry.createdAt)}</p></div><button class="activity-arrow" type="button" data-open-sheet="${escapeHtml(entry.type)}" aria-label="Open ${escapeHtml(entry.type)} log">↗</button></article>`).join('');
  activityList.querySelectorAll('[data-open-sheet]').forEach((button) => button.addEventListener('click', () => openSheet(button.dataset.openSheet)));
}

function renderStreak() {
  const dates = new Set(getEntries().map((entry) => new Date(entry.createdAt).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  document.querySelector('#streak-number').innerHTML = `${streak}<span>day${streak === 1 ? '' : 's'}</span>`;
  document.querySelector('#streak-copy').textContent = streak ? 'Keep the signal going.' : 'Start your first entry.';
  document.querySelector('#streak-bars').innerHTML = Array.from({ length: 15 }, (_, index) => `<i class="${index >= 15 - streak ? 'filled' : ''}"></i>`).join('');
}

function renderTabs() {
  document.querySelector('#sheet-tabs').innerHTML = logTypes.map((type) => `<button class="sheet-tab ${type === selectedType ? 'active' : ''}" type="button" role="tab" data-sheet-type="${type}">${type}<span>${getEntries().filter((entry) => entry.type === type).length}</span></button>`).join('');
  document.querySelectorAll('[data-sheet-type]').forEach((button) => button.addEventListener('click', () => openSheet(button.dataset.sheetType)));
}

function renderSheet() {
  const entries = getEntries().filter((entry) => entry.type === selectedType).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  document.querySelector('#sheet-title').innerHTML = `${selectedType} <span>log</span>`;
  document.querySelector('#sheet-count').textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
  document.querySelector('#sheet-body').innerHTML = entries.map((entry) => `<tr><td><strong>${escapeHtml(entry.title)}</strong></td><td class="details-cell">${escapeHtml(entry.details)}</td><td>${escapeHtml(entry.context || '-')}</td><td>${escapeHtml(entry.time)}</td><td>${formatDate(entry.createdAt)}</td><td><button class="delete-entry" type="button" data-delete="${entry.id}" aria-label="Delete ${escapeHtml(entry.title)}">×</button></td></tr>`).join('');
  document.querySelector('#empty-sheet').hidden = entries.length > 0;
  renderTabs();
  document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteEntry(button.dataset.delete)));
}

function deleteEntry(id) {
  const deletedEntry = getEntries().find((entry) => entry.id === id);
  if (!deletedEntry) return;
  supabaseClient.from(databaseTable).delete().eq('id', id).then(({ error }) => {
    if (error) {
      showToast('Could not remove that entry.');
      return;
    }
    deletedEntries.push(deletedEntry);
    sessionStorage.setItem(deletedKey, JSON.stringify(deletedEntries));
    entries = entries.filter((entry) => entry.id !== id);
    renderSheet();
    renderActivity();
    renderStreak();
    showToast('Entry removed. Press Ctrl+Z to restore it.');
  });
}

function undoDelete() {
  const entry = deletedEntries.pop();
  if (!entry) return;
  supabaseClient.from(databaseTable).insert({ id: entry.id, type: entry.type, title: entry.title, details: entry.details, values: entry.values, color: entry.color, created_at: entry.createdAt }).then(({ error }) => {
    if (error) {
      deletedEntries.push(entry);
      showToast('Could not restore that entry.');
      return;
    }
    entries = [...getEntries(), entry];
    sessionStorage.setItem(deletedKey, JSON.stringify(deletedEntries));
    renderSheet();
    renderActivity();
    renderStreak();
    showToast('Entry restored to your log.');
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2800);
}

document.querySelectorAll('.type-card').forEach((button) => button.addEventListener('click', () => openLogForm(button.dataset.type)));
document.querySelector('#log-picker').addEventListener('change', (event) => {
  if (!event.target.value) return;
  openSheet(event.target.value);
  event.target.value = '';
});
document.querySelector('#back-button').addEventListener('click', () => showOnly(homeView));
document.querySelector('#sheet-back').addEventListener('click', () => showOnly(homeView));
document.querySelector('#sheet-new').addEventListener('click', () => openLogForm(selectedType));
document.querySelector('#empty-new').addEventListener('click', () => openLogForm(selectedType));
document.querySelector('#timeline-button').addEventListener('click', () => openSheet(selectedType));
document.addEventListener('keydown', (event) => {
  const target = event.target;
  const isEditing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !isEditing && deletedEntries.length) {
    event.preventDefault();
    undoDelete();
  }
});
document.querySelector('#unlock-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const passwordInput = document.querySelector('#unlock-password');
  const lockError = document.querySelector('#lock-error');
  if (passwordInput.value !== '37216') {
    lockError.classList.add('show');
    passwordInput.select();
    return;
  }
  logsUnlocked = true;
  sessionStorage.setItem('trace-log-unlocked', 'true');
  lockError.classList.remove('show');
  passwordInput.value = '';
  showOnly(homeView);
});
logForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const values = Object.fromEntries(logTypeConfig[selectedType].fields.map((field) => [field.key, String(formData.get(field.key) || '').trim()]));
  const title = values.title;
  const details = values.details;
  if (!title || !details) return;
  const newEntry = { id: crypto.randomUUID(), type: selectedType, title, details, context: values.context || '', time: values.time || 'Not specified', values, createdAt: new Date().toISOString(), color: logTypeConfig[selectedType].color };
  supabaseClient.from(databaseTable).insert({ id: newEntry.id, type: newEntry.type, title: newEntry.title, details: newEntry.details, values: newEntry.values, color: newEntry.color, created_at: newEntry.createdAt }).select().single().then(({ error }) => {
    if (error) {
      showToast('Could not save entry to the shared database.');
      return;
    }
    entries = [newEntry, ...getEntries()];
    event.target.reset();
    renderActivity();
    renderStreak();
    showToast(`${selectedType} entry saved to your log.`);
    openSheet(selectedType);
  });
});
document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((navItem) => navItem.classList.remove('active'));
  item.classList.add('active');
  if (item.dataset.view === 'home') showOnly(homeView);
  if (item.dataset.view === 'timeline') openSheet(selectedType);
  if (item.dataset.view === 'insights') showToast('Insights will appear as your log grows.');
}));

loadEntries().then(() => {
  renderActivity();
  renderStreak();
  if (!logsUnlocked) {
    showOnly(lockView);
    document.querySelector('#unlock-password').focus();
  } else {
    showOnly(homeView);
  }
});
