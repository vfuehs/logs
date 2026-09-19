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
      { key: 'title', label: 'Contact or organizations', prompt: 'Who did you connect with?', required: true },
      { key: 'details', label: 'Who did it?', prompt: 'In format "Rookie/Veteran, Name"', type: 'textarea', required: true },
      { key: 'followUp', label: 'Date', prompt: 'e.g. Friday, Sep 4' },
      { key: 'nextStep', label: 'Next step', prompt: 'What needs to happen next?' },
      { key: 'context', label: 'Relationship/event', prompt: 'e.g. company, contact, event' }
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
const insightsView = document.querySelector('#insights-view');
const formType = document.querySelector('#form-type');
const logForm = document.querySelector('#log-form');
const formFields = document.querySelector('#form-fields');
const toast = document.querySelector('#toast');
let selectedType = 'Software';
let logsUnlocked = sessionStorage.getItem('trace-log-unlocked') === 'true';
let deletedEntries = JSON.parse(sessionStorage.getItem(deletedKey) || '[]');
let entries = [];
const partsChartFields = [
  { key: 'inventoryStatus', label: 'Availability' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'partNumber', label: 'Part number' },
  { key: 'title', label: 'Part name' },
  { key: 'brand', label: 'Brand' },
  { key: 'where', label: 'Where' }
];
const routeTypes = {
  software: 'Software',
  cad: 'CAD',
  outreach: 'Outreach',
  portfolio: 'Portfolio',
  parts: 'Parts',
  'parts-order': 'Parts order',
  meetings: 'Meetings'
};

function getRouteInfo() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const baseIndex = segments.indexOf('logs');
  const route = baseIndex >= 0 ? segments[baseIndex + 1]?.toLowerCase() : '';
  return { type: routeTypes[route] || '', view: segments[baseIndex + 2] === 'logs' ? 'sheet' : 'form' };
}

function getHomeUrl() {
  const segments = window.location.pathname.split('/');
  const logsIndex = segments.indexOf('logs');
  const basePath = segments.slice(0, logsIndex + 1).join('/');
  return `${window.location.origin}${basePath}/`;
}

const navigationEntry = performance.getEntriesByType('navigation')[0];
if (navigationEntry?.type === 'reload' && getRouteInfo().type) window.location.replace(getHomeUrl());

function updateRoute(type, view = 'sheet', replace = false) {
  const route = Object.entries(routeTypes).find(([, routeType]) => routeType === type)?.[0];
  if (!route) return;
  const segments = window.location.pathname.split('/');
  const basePath = segments.slice(0, segments.indexOf('logs') + 1).join('/');
  const suffix = view === 'sheet' ? 'logs/' : '';
  const url = `${window.location.origin}${basePath}/${route}/${suffix}`;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
}

function goHome() {
  window.history.pushState({}, '', getHomeUrl());
  showOnly(homeView);
}

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
  insightsView.hidden = view !== insightsView;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderFormFields(type) {
  if (type === 'Parts') {
    const partNames = [...new Set(getEntries()
      .filter((entry) => entry.type === 'Parts')
      .map((entry) => entry.title)
      .filter(Boolean))].sort((first, second) => first.localeCompare(second));
    formFields.innerHTML = `<label>Availability<select name="inventoryStatus" id="parts-availability" required><option value="">Choose one...</option><option value="already in stock">Already in stock</option><option value="new">New</option></select></label><label>Quantity<input name="quantity" id="parts-quantity" type="number" min="1" step="1" placeholder="How many?" required /></label><div id="stock-part-fields" hidden><label>Search parts<input id="part-search" type="search" placeholder="Search by part name" /></label><label>Part name<select name="existingPart" id="existing-part"><option value="">Choose a part...</option>${partNames.map((partName) => `<option>${escapeHtml(partName)}</option>`).join('')}</select></label></div><div id="new-part-fields" hidden><label>Part number<input name="partNumber" placeholder="e.g. M3-014, 608ZZ" /></label><label>Part name<input name="title" placeholder="What is the part called?" /></label><label>Brand<select name="brand"><option value="">Choose a brand...</option><option>Gobilda</option><option>REV</option><option>Andymark</option><option>Other</option></select></label><label>Where<select name="where"><option value="">Choose a location...</option><option>Inventory</option><option>On bot</option></select></label></div>`;
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
      formFields.querySelector('#parts-quantity').required = isStock || isNew;
      formFields.querySelectorAll('#new-part-fields input, #new-part-fields select').forEach((input) => { input.required = isNew; });
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
  updateRoute(type, 'form');
  formType.textContent = type;
  renderFormFields(type);
  showOnly(formView);
  formFields.querySelector('input, textarea, select').focus();
}

function openSheet(type) {
  selectedType = type;
  updateRoute(type, 'sheet');
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
  document.querySelector('#sheet-tabs').innerHTML = logTypes.map((type) => {
    const typeEntries = getEntries().filter((entry) => entry.type === type);
    const badge = type === 'Parts'
      ? typeEntries.reduce((total, entry) => total + (Number.parseInt(entry.values?.quantity, 10) || 0), 0)
      : typeEntries.length;
    return `<button class="sheet-tab ${type === selectedType ? 'active' : ''}" type="button" role="tab" data-sheet-type="${type}">${type}<span>${badge}</span></button>`;
  }).join('');
  document.querySelectorAll('[data-sheet-type]').forEach((button) => button.addEventListener('click', () => openSheet(button.dataset.sheetType)));
}

function getFieldsForCharts(type) {
  return type === 'Parts' ? partsChartFields : logTypeConfig[type].fields;
}

function renderInsights() {
  const content = document.querySelector('#insights-content');
  content.innerHTML = logTypes.map((type) => {
    const typeEntries = getEntries().filter((entry) => entry.type === type);
    const fields = getFieldsForCharts(type);
    const charts = fields.map((field) => {
      const counts = new Map();
      typeEntries.forEach((entry) => {
        const answer = field.key === 'title' ? entry.title : entry.values?.[field.key];
        const label = answer === undefined || answer === null || String(answer).trim() === '' ? 'Not answered' : String(answer);
        counts.set(label, (counts.get(label) || 0) + 1);
      });
      const sortedAnswers = [...counts.entries()].sort((first, second) => second[1] - first[1]);
      const maximum = sortedAnswers[0]?.[1] || 1;
      return `<div class="chart-block"><div class="chart-question">${escapeHtml(field.label)}</div>${sortedAnswers.length ? sortedAnswers.slice(0, 6).map(([answer, count]) => `<div class="chart-row"><span>${escapeHtml(answer)}</span><i><b style="width:${(count / maximum) * 100}%"></b></i><strong>${count}</strong></div>`).join('') : '<p class="empty-activity">No answers yet.</p>'}</div>`;
    }).join('');
    return `<section class="insight-section"><div class="section-heading"><h2>${escapeHtml(type)}</h2><span>${typeEntries.length} ${typeEntries.length === 1 ? 'ENTRY' : 'ENTRIES'}</span></div><div class="chart-grid">${charts}</div></section>`;
  }).join('');
}

function getPartField(entry, field) {
  const value = entry.values?.[field];
  if (typeof value === 'string' && value.trim()) return value.trim();
  if ((field === 'brand' || field === 'where') && typeof entry.details === 'string') {
    const legacyValues = entry.details.split('/').map((part) => part.trim());
    return field === 'brand' ? legacyValues[0] || '' : legacyValues[1] || '';
  }
  return '';
}

function getEntryField(entry, field) {
  if (field.key === 'title') return entry.title;
  if (field.key === 'details') return entry.details;
  return entry.values?.[field.key] || '';
}

function renderSheet() {
  const entries = getEntries().filter((entry) => entry.type === selectedType).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const displayEntries = selectedType === 'Parts'
    ? [...entries.reduce((groups, entry) => {
      const existing = groups.get(entry.title);
      if (existing) {
        existing.quantity += Number.parseInt(entry.values?.quantity, 10) || 0;
      } else {
        groups.set(entry.title, { ...entry, quantity: Number.parseInt(entry.values?.quantity, 10) || 0 });
      }
      return groups;
    }, new Map()).values()]
    : entries;
  document.querySelector('#sheet-title').innerHTML = `${selectedType} <span>log</span>`;
  document.querySelector('#sheet-head').innerHTML = selectedType === 'Parts'
    ? '<tr><th>Part name</th><th>Part number</th><th>Brand</th><th>Where</th><th>Quantity</th><th>Date</th><th></th></tr>'
    : `<tr>${logTypeConfig[selectedType].fields.map((field) => `<th>${escapeHtml(field.label)}</th>`).join('')}<th>Date</th><th></th></tr>`;
  const totalQuantity = selectedType === 'Parts' ? entries.reduce((total, entry) => total + (Number.parseInt(entry.values?.quantity, 10) || 0), 0) : 0;
  document.querySelector('#sheet-count').textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}${selectedType === 'Parts' ? ` / ${displayEntries.length} unique parts / Total quantity: ${totalQuantity}` : ''}`;
  document.querySelector('#sheet-body').innerHTML = displayEntries.map((entry) => selectedType === 'Parts'
    ? `<tr><td><input class="editable-part" data-edit-part="${entry.id}" data-part-field="title" value="${escapeHtml(entry.title)}" aria-label="Edit part name" /></td><td><input class="editable-part" data-edit-part="${entry.id}" data-part-field="partNumber" value="${escapeHtml(getPartField(entry, 'partNumber'))}" aria-label="Edit part number" /></td><td><select class="editable-part" data-edit-part="${entry.id}" data-part-field="brand" aria-label="Edit brand"><option value="">-</option>${['Gobilda', 'REV', 'Andymark', 'Other'].map((brand) => `<option${getPartField(entry, 'brand') === brand ? ' selected' : ''}>${brand}</option>`).join('')}</select></td><td><select class="editable-part" data-edit-part="${entry.id}" data-part-field="where" aria-label="Edit location"><option value="">-</option>${['Inventory', 'On bot'].map((location) => `<option${getPartField(entry, 'where') === location ? ' selected' : ''}>${location}</option>`).join('')}</select></td><td><input class="editable-part quantity-edit" type="number" min="1" step="1" data-edit-part="${entry.id}" data-part-field="quantity" value="${escapeHtml(entry.quantity)}" aria-label="Edit quantity" /></td><td>${formatDate(entry.createdAt)}</td><td><button class="delete-entry" type="button" data-delete="${entry.id}" aria-label="Delete ${escapeHtml(entry.title)}">×</button></td></tr>`
    : `<tr>${logTypeConfig[selectedType].fields.map((field) => `<td>${escapeHtml(getEntryField(entry, field) || '-')}</td>`).join('')}<td>${formatDate(entry.createdAt)}</td><td><button class="delete-entry" type="button" data-delete="${entry.id}" aria-label="Delete ${escapeHtml(entry.title)}">×</button></td></tr>`).join('');
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
  document.querySelectorAll('[data-edit-part]').forEach((field) => field.addEventListener('change', () => updatePartField(field.dataset.editPart, field.dataset.partField, field.value)));
}

function updatePartField(id, field, nextValue) {
  const entry = getEntries().find((candidate) => candidate.id === id);
  if (!entry) return;
  const value = String(nextValue || '').trim();
  if (field === 'quantity' && (!Number.isInteger(Number(value)) || Number(value) < 1)) {
    renderSheet();
    return;
  }
  const values = { ...(entry.values || {}), [field]: field === 'quantity' ? Number(value) : value };
  const title = field === 'title' ? value : entry.title;
  const details = values.brand || values.where ? `${values.brand || ''} / ${values.where || ''}`.replace(/^\s*\/\s*|\s*\/\s*$/g, '') : entry.details;
  persistEntryUpdate(entry, { title, details, values }).then((error) => {
    if (error) {
      showToast(databaseErrorMessage(error, 'Could not update that part.'));
      return;
    }
    entry.title = title;
    entry.details = details;
    entry.values = values;
    renderActivity();
    renderSheet();
    renderInsights();
    showToast('Part updated.');
  });
}

function persistEntryUpdate(entry, updates) {
  const record = buildSupabaseRecord({ ...entry, ...updates });
  return supabaseClient.from(databaseTable).update(updates).eq('id', entry.id).select('id').maybeSingle().then(async ({ data, error }) => {
    if (!error && data?.id) return null;
    const updateError = error || { code: 'PGRST116', message: 'The entry was not updated.' };
    const { error: deleteError } = await supabaseClient.from(databaseTable).delete().eq('id', entry.id);
    if (deleteError) return updateError;
    const { error: insertError } = await supabaseClient.from(databaseTable).insert(record);
    return insertError || null;
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
  persistEntryUpdate(entry, { title, values }).then((error) => {
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

document.querySelectorAll('.type-card').forEach((button) => button.addEventListener('click', (event) => {
  event.preventDefault();
  openLogForm(button.dataset.type);
}));
document.querySelector('#log-picker').addEventListener('change', (event) => {
  if (!event.target.value) return;
  openSheet(event.target.value);
  event.target.value = '';
});
document.querySelector('#back-button').addEventListener('click', goHome);
document.querySelector('#sheet-back').addEventListener('click', goHome);
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
    ? Object.fromEntries(['inventoryStatus', 'existingPart', 'partNumber', 'title', 'brand', 'where', 'quantity'].map((key) => [key, String(formData.get(key) || '').trim()]))
    : Object.fromEntries(logTypeConfig[selectedType].fields.map((field) => [field.key, String(formData.get(field.key) || '').trim()]));
  if (selectedType === 'Parts' && values.inventoryStatus === 'already in stock') values.title = values.existingPart;
  if (selectedType === 'Parts') values.quantity = Number.parseInt(values.quantity, 10);
  const title = values.title;
  const details = selectedType === 'Parts'
    ? values.inventoryStatus === 'new'
      ? `${values.brand} / ${values.where}`
      : 'Already in stock'
    : values.details;
  if (!title || !details || (selectedType === 'Parts' && (!Number.isInteger(values.quantity) || values.quantity < 1))) return;
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
  if (item.dataset.view === 'home') goHome();
  if (item.dataset.view === 'timeline') openSheet(selectedType);
  if (item.dataset.view === 'insights') {
    renderInsights();
    showOnly(insightsView);
  }
}));

loadEntries().then(() => {
  renderActivity();
  renderStreak();
  const routeInfo = getRouteInfo();
  if (routeInfo.type) {
    selectedType = routeInfo.type;
    if (routeInfo.view === 'sheet') renderSheet();
    else openLogForm(routeInfo.type);
  }
  if (!logsUnlocked) {
    showOnly(lockView);
    document.querySelector('#unlock-password').focus();
  } else {
    if (routeInfo.type && routeInfo.view === 'sheet') showOnly(sheetView);
    else if (routeInfo.type) showOnly(formView);
    else showOnly(homeView);
  }
});

window.addEventListener('popstate', () => {
  const routeInfo = getRouteInfo();
  if (routeInfo.type && routeInfo.view === 'sheet') {
    selectedType = routeInfo.type;
    renderSheet();
    showOnly(sheetView);
  } else if (routeInfo.type) {
    openLogForm(routeInfo.type);
    showOnly(formView);
  } else {
    showOnly(homeView);
  }
});
