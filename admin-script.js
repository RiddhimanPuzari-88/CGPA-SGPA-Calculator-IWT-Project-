// admin-script.js

// ─── Config ──────────────────────────────────────────────────
const ADMIN_PASSWORD = "ku@admin2024"; // Change this to your preferred password
const STORAGE_KEY = "kuAdminSemesterData";
const SESSION_KEY = "kuAdminLoggedIn";

// ─── State ───────────────────────────────────────────────────
let currentSem = 1;
let adminData  = {};   // working copy
let pendingDeleteIndex = null;
let pendingDeleteSem   = null;

// ─── Init ────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  // Check session
  if (sessionStorage.getItem(SESSION_KEY) === "true") {
    showPanel();
  }

  // Enter key on password input
  document.getElementById("adminPassword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") attemptLogin();
  });
});

// ─── Auth ────────────────────────────────────────────────────
function attemptLogin() {
  const val = document.getElementById("adminPassword").value;
  const err = document.getElementById("loginError");
  const btn = document.getElementById("loginBtn");

  if (val === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "true");
    err.classList.remove("show");
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Access Granted`;
    setTimeout(showPanel, 400);
  } else {
    err.classList.remove("show");
    void err.offsetWidth; // trigger reflow for shake
    err.classList.add("show");
    document.getElementById("adminPassword").value = "";
    document.getElementById("adminPassword").focus();
  }
}

function togglePwVisibility() {
  const inp = document.getElementById("adminPassword");
  const icon = document.getElementById("eyeIcon");
  if (inp.type === "password") {
    inp.type = "text";
    icon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
  } else {
    inp.type = "password";
    icon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  }
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  document.getElementById("adminWrapper").style.display = "none";
  document.getElementById("loginOverlay").style.display = "flex";
  document.getElementById("adminPassword").value = "";
}

function showPanel() {
  document.getElementById("loginOverlay").style.display = "none";
  document.getElementById("adminWrapper").style.display = "flex";
  loadData();
  switchSem(1);
}

// ─── Data Loading / Saving ───────────────────────────────────
function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    adminData = JSON.parse(stored);
  } else {
    // Deep-copy default data
    adminData = {};
    for (let s = 1; s <= 8; s++) {
      adminData[s] = semesterData[s].map(item => ({ ...item }));
    }
  }
  updateAllCounts();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(adminData));
  updateAllCounts();
}

function resetToDefault() {
  openModal(
    "Reset All Data?",
    "This will restore all semesters to the original default subjects. All your custom changes will be lost.",
    "Reset",
    () => {
      adminData = {};
      for (let s = 1; s <= 8; s++) {
        adminData[s] = semesterData[s].map(item => ({ ...item }));
      }
      saveData();
      renderSemester(currentSem);
      showToast("Data reset to defaults", "info");
    }
  );
}

// ─── Semester UI ─────────────────────────────────────────────
function switchSem(sem) {
  currentSem = sem;
  document.querySelectorAll(".sem-tab").forEach(t => {
    t.classList.toggle("active", Number(t.dataset.sem) === sem);
  });
  document.getElementById("topbarTitle").textContent = `Semester ${sem} — Subjects`;
  renderSemester(sem);
  updateTopbarStats(sem);

  // Close mobile sidebar
  if (window.innerWidth <= 900) closeSidebar();
}

function updateAllCounts() {
  for (let s = 1; s <= 8; s++) {
    const el = document.getElementById(`cnt-${s}`);
    if (el && adminData[s]) el.textContent = adminData[s].length;
  }
}

function updateTopbarStats(sem) {
  const subjects = adminData[sem] || [];
  const totalCredits = subjects.reduce((acc, s) => acc + s.credit, 0);
  const el = document.getElementById("topbarStats");
  el.innerHTML = `
    <div class="stat-chip">${subjects.length} Subjects</div>
    <div class="stat-chip green">${totalCredits} Total Credits</div>
  `;
}

// ─── Render Subject List ──────────────────────────────────────
function renderSemester(sem) {
  const subjects = adminData[sem] || [];
  const list = document.getElementById("subjectsList");
  const badge = document.getElementById("listBadge");

  badge.textContent = `${subjects.length} subject${subjects.length !== 1 ? "s" : ""}`;

  if (subjects.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        <p>No subjects in Semester ${sem}. Add one above.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = "";
  subjects.forEach((subj, idx) => {
    const item = document.createElement("div");
    item.className = "subject-item";
    item.id = `item-${idx}`;
    item.style.animationDelay = `${idx * 0.04}s`;
    item.innerHTML = buildItemHTML(subj, idx);
    list.appendChild(item);
  });
}

function buildItemHTML(subj, idx) {
  const isHigh = subj.credit >= 4;
  return `
    <div class="item-num">${idx + 1}</div>
    <div class="item-info">
      <div class="item-name" title="${subj.subject}">${subj.subject}</div>
      <div class="item-credit">${subj.credit} credit${subj.credit !== 1 ? "s" : ""}</div>
    </div>
    <span class="credit-badge ${isHigh ? "high" : ""}">${subj.credit} cr</span>
    <div class="item-actions">
      <button class="item-edit-btn" onclick="enterEditMode(${idx})" title="Edit">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="item-del-btn" onclick="confirmDelete(${idx})" title="Delete">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      </button>
    </div>
  `;
}

// ─── Add Subject ─────────────────────────────────────────────
function addSubject() {
  const nameEl   = document.getElementById("newSubjectName");
  const creditEl = document.getElementById("newSubjectCredit");
  const name     = nameEl.value.trim();
  const credit   = parseInt(creditEl.value);

  if (!name) {
    showToast("Please enter a subject name", "error");
    nameEl.focus();
    return;
  }
  if (isNaN(credit) || credit < 1 || credit > 10) {
    showToast("Credits must be between 1 and 10", "error");
    creditEl.focus();
    return;
  }

  // Check for duplicate in this semester
  const sem = adminData[currentSem];
  if (sem.some(s => s.subject.toLowerCase() === name.toLowerCase())) {
    showToast("Subject already exists in this semester", "error");
    return;
  }

  sem.push({ subject: name, credit });
  saveData();
  renderSemester(currentSem);
  updateTopbarStats(currentSem);

  nameEl.value = "";
  creditEl.value = "";
  nameEl.focus();

  showToast(`"${name}" added to Semester ${currentSem}`, "success");
}

// ─── Edit Subject ─────────────────────────────────────────────
function enterEditMode(idx) {
  const subj = adminData[currentSem][idx];
  const item = document.getElementById(`item-${idx}`);
  if (!item) return;

  item.classList.add("editing");
  item.innerHTML = `
    <div class="item-num">${idx + 1}</div>
    <div class="edit-inputs">
      <input type="text" class="edit-input name" id="edit-name-${idx}" value="${subj.subject}" maxlength="80">
      <input type="number" class="edit-input credit" id="edit-credit-${idx}" value="${subj.credit}" min="1" max="10">
    </div>
    <button class="save-edit-btn" onclick="saveEdit(${idx})">Save</button>
    <div class="item-actions">
      <button class="item-del-btn" onclick="cancelEdit(${idx})" title="Cancel">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;

  const nameInp = document.getElementById(`edit-name-${idx}`);
  nameInp.focus();
  nameInp.select();
  nameInp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveEdit(idx);
    if (e.key === "Escape") cancelEdit(idx);
  });
}

function saveEdit(idx) {
  const nameEl   = document.getElementById(`edit-name-${idx}`);
  const creditEl = document.getElementById(`edit-credit-${idx}`);
  const name     = nameEl.value.trim();
  const credit   = parseInt(creditEl.value);

  if (!name) { showToast("Subject name cannot be empty", "error"); nameEl.focus(); return; }
  if (isNaN(credit) || credit < 1 || credit > 10) { showToast("Credits must be between 1 and 10", "error"); creditEl.focus(); return; }

  adminData[currentSem][idx] = { subject: name, credit };
  saveData();
  renderSemester(currentSem);
  updateTopbarStats(currentSem);
  showToast("Subject updated", "success");
}

function cancelEdit(idx) {
  const item = document.getElementById(`item-${idx}`);
  if (!item) return;
  item.classList.remove("editing");
  item.innerHTML = buildItemHTML(adminData[currentSem][idx], idx);
}

// ─── Delete Subject ───────────────────────────────────────────
function confirmDelete(idx) {
  const subj = adminData[currentSem][idx];
  pendingDeleteIndex = idx;
  pendingDeleteSem   = currentSem;
  openModal(
    "Delete Subject?",
    `Remove <strong style="color:#e8eaf0">"${subj.subject}"</strong> (${subj.credit} credits) from Semester ${currentSem}?`,
    "Delete",
    () => {
      adminData[pendingDeleteSem].splice(pendingDeleteIndex, 1);
      saveData();
      renderSemester(currentSem);
      updateTopbarStats(currentSem);
      showToast(`"${subj.subject}" deleted`, "error");
    }
  );
}

// ─── Modal ────────────────────────────────────────────────────
let modalCallback = null;

function openModal(title, body, confirmLabel, onConfirm) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = body;
  document.getElementById("modalConfirm").textContent = confirmLabel;
  modalCallback = onConfirm;
  document.getElementById("modalOverlay").classList.add("show");

  document.getElementById("modalConfirm").onclick = () => {
    if (modalCallback) modalCallback();
    closeModal();
  };
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("show");
  modalCallback = null;
}

// ─── Toast ────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b84ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  toast.className = `toast show ${type}`;
  toast.innerHTML = `${icons[type] || ""} ${msg}`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ─── Mobile Sidebar ───────────────────────────────────────────
function toggleSidebar() {
  const sidebar   = document.getElementById("sidebar");
  const mobOverlay = document.getElementById("mobOverlay");
  sidebar.classList.toggle("open");
  mobOverlay.classList.toggle("show");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("mobOverlay").classList.remove("show");
}

// ─── Enter key support for add form ──────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  ["newSubjectName", "newSubjectCredit"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("keydown", e => { if (e.key === "Enter") addSubject(); });
  });

  // Close modal on Escape
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });
});
