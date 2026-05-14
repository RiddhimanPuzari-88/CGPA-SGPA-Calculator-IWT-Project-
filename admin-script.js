// admin-script.js — Firebase Realtime Database Edition

// ─── Admin Accounts ──────────────────────────────────────────
const ADMIN_ACCOUNTS = [
  { username: "tandrali", password: "tandrali123", displayName: "Tandrali" },
  { username: "riddhi",   password: "riddhi1234",  displayName: "Riddhiman" },
  { username: "priya",    password: "priya1234",   displayName: "Priya" }
];
const STORAGE_KEY    = "kuAdminSemesterData";
const SESSION_KEY    = "kuAdminLoggedIn";
const SESSION_USER   = "kuAdminUser";
const FB_PATH        = "semesterData";

// ─── State ───────────────────────────────────────────────────
let currentSem         = 1;
let adminData          = {};
let db                 = null;
let pendingDeleteIndex = null;
let pendingDeleteSem   = null;

// ─── Firebase Helpers ─────────────────────────────────────────
function initFirebase() {
  if (typeof firebase === "undefined") return false;
  try {
    db = firebase.database();
    return true;
  } catch (e) {
    console.warn("Firebase init error:", e);
    return false;
  }
}

function setFbStatus(state) {
  const el  = document.getElementById("firebaseStatus");
  const txt = document.getElementById("statusText");
  if (!el) return;
  el.className = `firebase-status ${state}`;
  txt.textContent = {
    connecting: "Connecting to Firebase…",
    connected:  "Firebase Connected",
    saving:     "Saving to Firebase…",
    saved:      "All Changes Saved",
    offline:    "Offline — Local Only",
    error:      "Firebase Sync Error"
  }[state] || state;
}

function normalizeFirebaseArray(val) {
  // Firebase may return arrays as {0:{…}, 1:{…}} — normalize back to []
  if (!val) return [];
  return Array.isArray(val) ? val : Object.values(val);
}

function getDefaultData() {
  const data = {};
  for (let s = 1; s <= 8; s++) {
    data[s] = semesterData[s].map(item => ({ ...item }));
  }
  return data;
}

// ─── DOMContentLoaded ─────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem(SESSION_KEY) === "true") showPanel();

  // Enter key support
  ["adminUsername", "adminPassword"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("keydown", e => { if (e.key === "Enter") attemptLogin(); });
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });
  ["newSubjectName", "newSubjectCredit"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("keydown", e => { if (e.key === "Enter") addSubject(); });
  });
});

// ─── Auth ─────────────────────────────────────────────────────
function attemptLogin() {
  const username = (document.getElementById("adminUsername").value || "").trim().toLowerCase();
  const password = document.getElementById("adminPassword").value;
  const err = document.getElementById("loginError");
  const btn = document.getElementById("loginBtn");

  const match = ADMIN_ACCOUNTS.find(
    a => a.username === username && a.password === password
  );

  if (match) {
    sessionStorage.setItem(SESSION_KEY, "true");
    sessionStorage.setItem(SESSION_USER, JSON.stringify({ username: match.username, displayName: match.displayName }));
    err.classList.remove("show");
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Welcome, ${match.displayName}!`;
    setTimeout(showPanel, 420);
  } else {
    err.classList.remove("show");
    void err.offsetWidth;
    err.classList.add("show");
    document.getElementById("adminPassword").value = "";
    document.getElementById("adminPassword").focus();
  }
}

function togglePwVisibility() {
  const inp  = document.getElementById("adminPassword");
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
  sessionStorage.removeItem(SESSION_USER);
  document.getElementById("adminWrapper").style.display = "none";
  document.getElementById("loginOverlay").style.display = "flex";
  document.getElementById("adminUsername").value = "";
  document.getElementById("adminPassword").value = "";
}

async function showPanel() {
  document.getElementById("loginOverlay").style.display = "none";
  document.getElementById("adminWrapper").style.display = "flex";

  // Show logged-in user in sidebar
  const userRaw = sessionStorage.getItem(SESSION_USER);
  if (userRaw) {
    const user = JSON.parse(userRaw);
    const nameEl   = document.getElementById("userNameDisplay");
    const avatarEl = document.getElementById("userAvatar");
    if (nameEl)   nameEl.textContent   = user.displayName;
    if (avatarEl) avatarEl.textContent = user.displayName.charAt(0).toUpperCase();
  }

  const fbOk = initFirebase();
  await loadData(fbOk);
  switchSem(1);
}

// ─── Load Data ────────────────────────────────────────────────
async function loadData(fbOk = false) {
  // 1. Apply localStorage cache instantly (fast)
  const stored = localStorage.getItem(STORAGE_KEY);
  adminData = stored ? JSON.parse(stored) : getDefaultData();
  updateAllCounts();

  // 2. Fetch from Firebase (authoritative source)
  if (fbOk && db) {
    setFbStatus("connecting");
    try {
      const snap = await db.ref(FB_PATH).once("value");
      const fbData = snap.val();
      if (fbData) {
        // Firebase has data — use it
        adminData = {};
        for (let s = 1; s <= 8; s++) {
          adminData[s] = fbData[s] ? normalizeFirebaseArray(fbData[s]) : (semesterData[s] || []).map(i => ({...i}));
        }
      } else {
        // First run — push defaults to Firebase
        await db.ref(FB_PATH).set(adminData);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adminData));
      updateAllCounts();
      setFbStatus("connected");
    } catch (e) {
      console.warn("Firebase load error:", e);
      setFbStatus("error");
      showToast("Firebase unavailable — using local data", "error");
    }
  } else {
    setFbStatus("offline");
  }
}

// ─── Save Data ────────────────────────────────────────────────
async function saveData() {
  updateAllCounts();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(adminData));

  if (db) {
    setFbStatus("saving");
    try {
      await db.ref(FB_PATH).set(adminData);
      setFbStatus("saved");
      setTimeout(() => setFbStatus("connected"), 2000);
    } catch (e) {
      console.warn("Firebase save error:", e);
      setFbStatus("error");
      showToast("Saved locally — Firebase sync failed", "error");
    }
  }
}

// ─── Reset to Default ─────────────────────────────────────────
function resetToDefault() {
  openModal(
    "Reset All Data?",
    "This will restore all semesters to the original default subjects. All custom changes will be lost.",
    "Reset",
    async () => {
      adminData = getDefaultData();
      await saveData();
      renderSemester(currentSem);
      showToast("Reset to defaults", "info");
    }
  );
}

// ─── Semester UI ──────────────────────────────────────────────
function switchSem(sem) {
  currentSem = sem;
  document.querySelectorAll(".sem-tab").forEach(t =>
    t.classList.toggle("active", Number(t.dataset.sem) === sem)
  );
  document.getElementById("topbarTitle").textContent = `Semester ${sem} — Subjects`;
  renderSemester(sem);
  updateTopbarStats(sem);
  if (window.innerWidth <= 900) closeSidebar();
}

function updateAllCounts() {
  for (let s = 1; s <= 8; s++) {
    const el = document.getElementById(`cnt-${s}`);
    if (el && adminData[s]) el.textContent = adminData[s].length;
  }
}

function updateTopbarStats(sem) {
  const subjects     = adminData[sem] || [];
  const totalCredits = subjects.reduce((a, s) => a + s.credit, 0);
  document.getElementById("topbarStats").innerHTML = `
    <div class="stat-chip">${subjects.length} Subjects</div>
    <div class="stat-chip green">${totalCredits} Total Credits</div>
  `;
}

// ─── Render Subject List ──────────────────────────────────────
function renderSemester(sem) {
  const subjects = adminData[sem] || [];
  const list     = document.getElementById("subjectsList");
  const badge    = document.getElementById("listBadge");
  badge.textContent = `${subjects.length} subject${subjects.length !== 1 ? "s" : ""}`;

  if (subjects.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
        <p>No subjects in Semester ${sem}. Add one above.</p>
      </div>`;
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
    </div>`;
}

// ─── Add Subject ──────────────────────────────────────────────
async function addSubject() {
  const nameEl  = document.getElementById("newSubjectName");
  const creditEl = document.getElementById("newSubjectCredit");
  const name    = nameEl.value.trim();
  const credit  = parseInt(creditEl.value);

  if (!name)                              { showToast("Enter a subject name", "error"); nameEl.focus(); return; }
  if (isNaN(credit) || credit < 1 || credit > 10) { showToast("Credits must be 1–10", "error"); creditEl.focus(); return; }
  if (adminData[currentSem].some(s => s.subject.toLowerCase() === name.toLowerCase())) {
    showToast("Subject already exists in this semester", "error"); return;
  }

  adminData[currentSem].push({ subject: name, credit });
  await saveData();
  renderSemester(currentSem);
  updateTopbarStats(currentSem);
  nameEl.value = ""; creditEl.value = ""; nameEl.focus();
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
      <input type="text"   class="edit-input name"   id="edit-name-${idx}"   value="${subj.subject}" maxlength="80">
      <input type="number" class="edit-input credit" id="edit-credit-${idx}" value="${subj.credit}" min="1" max="10">
    </div>
    <button class="save-edit-btn" onclick="saveEdit(${idx})">Save</button>
    <div class="item-actions">
      <button class="item-del-btn" onclick="cancelEdit(${idx})" title="Cancel">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`;
  const ni = document.getElementById(`edit-name-${idx}`);
  ni.focus(); ni.select();
  ni.addEventListener("keydown", e => { if (e.key === "Enter") saveEdit(idx); if (e.key === "Escape") cancelEdit(idx); });
}

async function saveEdit(idx) {
  const name   = document.getElementById(`edit-name-${idx}`).value.trim();
  const credit = parseInt(document.getElementById(`edit-credit-${idx}`).value);
  if (!name)                              { showToast("Name cannot be empty", "error"); return; }
  if (isNaN(credit) || credit < 1 || credit > 10) { showToast("Credits must be 1–10", "error"); return; }
  adminData[currentSem][idx] = { subject: name, credit };
  await saveData();
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
  openModal(
    "Delete Subject?",
    `Remove <strong style="color:#e8eaf0">"${subj.subject}"</strong> (${subj.credit} cr) from Semester ${currentSem}?`,
    "Delete",
    async () => {
      const name = adminData[currentSem][idx].subject;
      adminData[currentSem].splice(idx, 1);
      await saveData();
      renderSemester(currentSem);
      updateTopbarStats(currentSem);
      showToast(`"${name}" deleted`, "error");
    }
  );
}

// ─── Modal ────────────────────────────────────────────────────
let modalCallback = null;
function openModal(title, body, confirmLabel, onConfirm) {
  document.getElementById("modalTitle").textContent  = title;
  document.getElementById("modalBody").innerHTML     = body;
  document.getElementById("modalConfirm").textContent = confirmLabel;
  modalCallback = onConfirm;
  document.getElementById("modalOverlay").classList.add("show");
  document.getElementById("modalConfirm").onclick = () => { if (modalCallback) modalCallback(); closeModal(); };
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
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

// ─── Mobile Sidebar ───────────────────────────────────────────
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("mobOverlay").classList.toggle("show");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("mobOverlay").classList.remove("show");
}
