const logTypes = ['Software', 'CAD', 'Outreach', 'Portfolio', 'Parts', 'Parts order', 'Meetings'];
const colors = ['cyan', 'violet', 'lime', 'amber', 'coral', 'blue', 'meeting'];
const storageKey = 'trace-log-entries';
const homeView = document.querySelector('#home-view');
const formView = document.querySelector('#form-view');
const sheetView = document.querySelector('#sheet-view');
const lockView = document.querySelector('#lock-view');
const formType = document.querySelector('#form-type');
const entryTitle = document.querySelector('#entry-title');
const toast = document.querySelector('#toast');
let selectedType = 'Software';
let logsUnlocked = sessionStorage.getItem('trace-log-unlocked') === 'true';

function getEntries() {
  try {
    const entries = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(storageKey, JSON.stringify(entries));
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

function openLogForm(type) {
  selectedType = type;
  formType.textContent = type;
  showOnly(formView);
  entryTitle.focus();
}

function openSheet(type) {
  selectedType = type;
  if (!logsUnlocked) {
    showOnly(lockView);
    document.querySelector('#unlock-password').focus();
    return;
  }
  renderSheet();
  showOnly(sheetView);
}

function renderActivity() {
  const activityList = document.querySelector('#activity-list');
  const entries = getEntries().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  document.querySelector('#total-count').textContent = String(entries.length).padStart(2, '0');
  if (!entries.length) {
    activityList.innerHTML = '<div class="empty-activity">Your saved entries will appear here.</div>';
    return;
  }
  activityList.innerHTML = entries.slice(0, 4).map((entry) => `<article><span class="activity-dot ${entry.color}"></span><div><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.type)} <span>·</span> ${timeAgo(entry.createdAt)}</p></div><button class="activity-arrow" type="button" data-open-sheet="${escapeHtml(entry.type)}" aria-label="Open ${escapeHtml(entry.type)} log">↗</button></article>`).join('');
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
  saveEntries(getEntries().filter((entry) => entry.id !== id));
  renderSheet();
  renderActivity();
  renderStreak();
  showToast('Entry removed from your log.');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2800);
}

document.querySelectorAll('.type-card').forEach((button) => button.addEventListener('click', () => openLogForm(button.dataset.type)));
document.querySelectorAll('.type-links button').forEach((button) => button.addEventListener('click', () => openSheet(button.dataset.type)));
document.querySelector('#back-button').addEventListener('click', () => showOnly(homeView));
document.querySelector('#sheet-back').addEventListener('click', () => showOnly(homeView));
document.querySelector('#sheet-new').addEventListener('click', () => openLogForm(selectedType));
document.querySelector('#empty-new').addEventListener('click', () => openLogForm(selectedType));
document.querySelector('#timeline-button').addEventListener('click', () => openSheet(selectedType));
document.querySelector('#lock-logs').addEventListener('click', () => {
  logsUnlocked = false;
  sessionStorage.removeItem('trace-log-unlocked');
  showOnly(lockView);
  document.querySelector('#unlock-password').focus();
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
  openSheet(selectedType);
});
document.querySelector('#log-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const title = String(formData.get('title')).trim();
  const details = String(formData.get('details')).trim();
  if (!title || !details) return;
  const entries = getEntries();
  entries.push({ id: crypto.randomUUID(), type: selectedType, title, details, context: String(formData.get('context')).trim(), time: String(formData.get('time')), createdAt: new Date().toISOString(), color: colors[logTypes.indexOf(selectedType)] });
  saveEntries(entries);
  event.target.reset();
  renderActivity();
  renderStreak();
  showToast(`${selectedType} entry saved to your log.`);
  openSheet(selectedType);
});
document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((navItem) => navItem.classList.remove('active'));
  item.classList.add('active');
  if (item.dataset.view === 'home') showOnly(homeView);
  if (item.dataset.view === 'timeline') openSheet(selectedType);
  if (item.dataset.view === 'insights') showToast('Insights will appear as your log grows.');
}));

renderActivity();
renderStreak();
