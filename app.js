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
      { key: 'revision', label: 'Revision', prompt: 'e.g. v2.1, prototype B' },

    ]
  },
  Outreach: {
    color: 'lime',
    fields: [
      { key: 'title', label: 'Contact or organization', prompt: 'Who did you connect with?', required: true },
      { key: 'details', label: 'Who did it?', prompt: 'In format "Rookie/Veteran, Name"', type: 'textarea', required: true },
      { key: 'followUp', label: 'Date', prompt: 'e.g. Friday, Sep 4' },
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
    fields: []
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
const supabaseConfig = {
  table: 'logs',
  primaryKey: 'id',
  timestampKey: 'created_at',
  payloadShape: {
    id: 'id',
    type: 'type',
    title: 'title',
    details: 'details',
    values: 'values',
    color: 'color',
    createdAt: 'created_at'
  }
};
const supabaseClient = window.supabase.createClient(
  'https://kbaxgocmumrzlhynrquv.supabase.co',
  'sb_publishable_QAUBzkbVoQg9a0FUQGtJEQ_nUSPz7f9'
);
const databaseTable = supabaseConfig.table;
const storageKey = 'trace-log-entries';
const deletedKey = 'trace-log-deleted-entries';
const easternTimeZone = 'America/New_York';
const easternDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: easternTimeZone,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});
const easternDateKeyFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: easternTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
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

function setConnectionState(error) {
  const notice = document.querySelector('#connection-notice');
  const message = document.querySelector('#connection-message');
  const syncStatus = document.querySelector('.sync-status strong');
  notice.hidden = !error;
  if (error) {
    message.textContent = error.message || 'Check your Supabase URL, key, table, and RLS policies.';
    syncStatus.textContent = 'Connection issue';
  } else {
    syncStatus.textContent = 'All synced';
  }
}

async function loadEntries() {
  try {
    const { data, error } = await supabaseClient.from(databaseTable).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    entries = (Array.isArray(data) ? data : []).map((entry) => normalizeSupabaseRow(entry));
    setConnectionState(null);
  } catch (error) {
    entries = [];
    setConnectionState(error);
    showToast('Could not connect to the shared log database.');
  }
}

function getEntries() {
  return entries;
}

function normalizeSupabaseRow(row = {}) {
  const type = typeof row.type === 'string' && row.type ? row.type : 'Software';
  const sourceValues = row.values && typeof row.values === 'object' && !Array.isArray(row.values) ? row.values : {};
  const values = {
    ...sourceValues,
    ...(typeof sourceValues.context === 'undefined' && typeof row.context === 'string' ? { context: row.context } : {}),
    ...(typeof sourceValues.time === 'undefined' && typeof row.time === 'string' ? { time: row.time } : {})
  };
  const titleValue = typeof values.title === 'string' ? values.title.trim() : '';
  const rowTitle = typeof row.title === 'string' ? row.title.trim() : '';
  const title = titleValue || rowTitle || 'Untitled entry';
  const details = typeof row.details === 'string' ? row.details : '';
  const createdAt = row.created_at || row.createdAt || new Date().toISOString();
  const color = row.color || logTypeConfig[type]?.color || 'cyan';

  return {
    id: row.id || crypto.randomUUID(),
    type,
    title,
    details,
    context: typeof values.context === 'string' ? values.context : '',
    time: typeof values.time === 'string' ? values.time : 'Not specified',
    values,
    createdAt,
    color
  };
}

function buildSupabaseRecord(entry) {
  const sourceValues = entry.values && typeof entry.values === 'object' && !Array.isArray(entry.values) ? entry.values : {};
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    details: entry.details,
    values: sourceValues,
    color: entry.color || logTypeConfig[entry.type]?.color || 'cyan',
    created_at: entry.createdAt || new Date().toISOString()
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function getEasternDateParts(value = new Date()) {
  return Object.fromEntries(easternDateFormatter.formatToParts(value).filter(({ type }) => type !== 'literal').map(({ type, value: partValue }) => [type, partValue]));
}

function getEasternDateKey(value) {
  const parts = Object.fromEntries(easternDateKeyFormatter.formatToParts(value).filter(({ type }) => type !== 'literal').map(({ type, value: partValue }) => [type, partValue]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatDate(value) {
  return easternDateFormatter.format(new Date(value)).replace(/^\w+,\s*/, '');
}

function updateDateDisplays() {
  const parts = getEasternDateParts();
  document.querySelector('#date-stamp').textContent = `${parts.weekday}, ${parts.month} ${parts.day}, ${parts.year}`.toUpperCase();
  document.querySelector('#day-number').textContent = parts.day;
  document.querySelector('#day-label').innerHTML = `${parts.weekday.toUpperCase()}<br />${parts.month.toUpperCase()} ${parts.year}`;
  document.querySelector('#form-date').textContent = `${parts.month} ${parts.day}, ${parts.year}`.toUpperCase();
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
  if (type === 'Parts') {
    const partNames = [...new Set(getEntries()
      .filter((entry) => entry.type === 'Parts')
      .map((entry) => entry.title)
      .filter(Boolean))].sort((first, second) => first.localeCompare(second));
    formFields.innerHTML = `<label>Availability<select name="inventoryStatus" id="parts-availability" required><option value="">Choose one...</option><option value="already in stock">Already in stock</option><option value="new">New</option></select></label><div id="stock-part-fields" hidden><label>Search parts<input id="part-search" type="search" placeholder="Search by part name" /></label><label>Part name<select name="existingPart" id="existing-part" required><option value="">Choose a part...</option>${partNames.map((partName) => `<option>${escapeHtml(partName)}</option>`).join('')}</select></label></div><div id="new-part-fields" hidden><label>Part number<input name="partNumber" placeholder="e.g. M3-014, 608ZZ" required /></label><label>Part name<input name="title" placeholder="What is the part called?" required /></label><label>Brand<input name="brand" placeholder="Who makes it?" required /></label><label>Where<input name="where" placeholder="Where is it located or from?" required /></label></div>`;
    const availability = formFields.querySelector('#parts-availability');
    const stockFields = formFields.querySelector('#stock-part-fields');
    const newFields = formFields.querySelector('#new-part-fields');
    const partSearch = formFields.querySelector('#part-search');
    const existingPart = formFields.querySelector('#existing-part');
    const updatePartFields = () => {
      const isStock = availability.value === 'already in stock';
      const isNew = availability.value === 'new';
      stockFields.hidden = !isStock;
      newFields.hidden = !isNew;
      existingPart.required = isStock;
      formFields.querySelectorAll('#new-part-fields input').forEach((input) => { input.required = isNew; });
    };
    availability.addEventListener('change', updatePartFields);
    partSearch.addEventListener('input', () => {
      const query = partSearch.value.trim().toLowerCase();
      [...existingPart.options].forEach((option, index) => {
        if (index === 0) return;
        option.hidden = query && !option.textContent.toLowerCase().includes(query);
      });
      if (existingPart.value && !existingPart.value.toLowerCase().includes(query)) existingPart.value = '';
    });
    updatePartFields();
    return;
  }
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
  const dates = new Set(getEntries().map((entry) => getEasternDateKey(entry.createdAt)));
  let streak = 0;
  const cursor = new Date();
  while (dates.has(getEasternDateKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
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
  document.querySelector('#sheet-body').innerHTML = entries.map((entry) => `<tr><td><strong class="editable-title" contenteditable="true" data-edit-title="${entry.id}" aria-label="Edit ${escapeHtml(entry.title)}">${escapeHtml(entry.title)}</strong></td><td class="details-cell">${escapeHtml(entry.details)}</td><td>${escapeHtml(entry.context || '-')}</td><td>${escapeHtml(entry.time)}</td><td>${formatDate(entry.createdAt)}</td><td><button class="delete-entry" type="button" data-delete="${entry.id}" aria-label="Delete ${escapeHtml(entry.title)}">×</button></td></tr>`).join('');
  document.querySelector('#empty-sheet').hidden = entries.length > 0;
  renderTabs();
  document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteEntry(button.dataset.delete)));
  document.querySelectorAll('[data-edit-title]').forEach((titleElement) => {
    titleElement.addEventListener('blur', () => updateEntryTitle(titleElement.dataset.editTitle, titleElement.textContent));
    titleElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        titleElement.blur();
      }
    });
  });
}

function updateEntryTitle(id, nextTitle) {
  const entry = getEntries().find((candidate) => candidate.id === id);
  const title = String(nextTitle || '').trim();
  if (!entry || !title) {
    renderSheet();
    return;
  }
  const values = { ...(entry.values || {}), title };
  supabaseClient.from(databaseTable).update({ title, values }).eq('id', id).then(({ error }) => {
    if (error) {
      showToast(databaseErrorMessage(error, 'Could not update that title.'));
      renderSheet();
      return;
    }
    entry.title = title;
    entry.values = values;
    renderActivity();
    renderSheet();
    showToast('Title updated.');
  });
}

function deleteEntry(id) {
  const deletedEntry = getEntries().find((entry) => entry.id === id);
  if (!deletedEntry) return;
  supabaseClient.from(databaseTable).delete().eq('id', id).then(({ error }) => {
    if (error) {
      showToast(databaseErrorMessage(error, 'Could not remove that entry.'));
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
  supabaseClient.from(databaseTable).insert(buildSupabaseRecord(entry)).then(({ error }) => {
    if (error) {
      deletedEntries.push(entry);
      showToast(databaseErrorMessage(error, 'Could not restore that entry.'));
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

function databaseErrorMessage(error, fallback) {
  if (error?.code === '42501') return 'Supabase blocked this write. Add the INSERT policy from README.md.';
  if (error?.code === 'PGRST204') return error.message;
  return fallback;
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
document.querySelector('#retry-connection').addEventListener('click', async () => {
  const retryButton = document.querySelector('#retry-connection');
  retryButton.disabled = true;
  await loadEntries();
  renderActivity();
  renderStreak();
  retryButton.disabled = false;
});
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
updateDateDisplays();
window.setInterval(updateDateDisplays, 60000);
logForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const values = selectedType === 'Parts'
    ? Object.fromEntries(['inventoryStatus', 'existingPart', 'partNumber', 'title', 'brand', 'where'].map((key) => [key, String(formData.get(key) || '').trim()]))
    : Object.fromEntries(logTypeConfig[selectedType].fields.map((field) => [field.key, String(formData.get(field.key) || '').trim()]));
  if (selectedType === 'Parts' && values.inventoryStatus === 'already in stock') values.title = values.existingPart;
  const title = values.title;
  const details = selectedType === 'Parts'
    ? values.inventoryStatus === 'new'
      ? `${values.brand} / ${values.where}`
      : 'Already in stock'
    : values.details;
  if (!title || !details) return;
  const newEntry = { id: crypto.randomUUID(), type: selectedType, title, details, context: values.context || '', time: values.time || 'Not specified', values, createdAt: new Date().toISOString(), color: logTypeConfig[selectedType].color };
  supabaseClient.from(databaseTable).insert(buildSupabaseRecord(newEntry)).select().single().then(({ error }) => {
    if (error) {
      showToast(databaseErrorMessage(error, 'Could not save entry to the shared database.'));
      return;
    }
    entries = [normalizeSupabaseRow(newEntry), ...getEntries()];
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
