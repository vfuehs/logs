const homeView = document.querySelector('#home-view');
const formView = document.querySelector('#form-view');
const formType = document.querySelector('#form-type');
const entryTitle = document.querySelector('#entry-title');
const toast = document.querySelector('#toast');

function openLogForm(type) {
  formType.textContent = type;
  formType.dataset.type = type;
  homeView.hidden = true;
  formView.hidden = false;
  entryTitle.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-type]').forEach((button) => {
  button.addEventListener('click', () => openLogForm(button.dataset.type));
});

document.querySelector('#back-button').addEventListener('click', () => {
  formView.hidden = true;
  homeView.hidden = false;
});

document.querySelector('#log-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const title = entryTitle.value.trim();
  if (!title) return;
  formView.hidden = true;
  homeView.hidden = false;
  event.target.reset();
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2800);
});

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((navItem) => navItem.classList.remove('active'));
    item.classList.add('active');
  });
});