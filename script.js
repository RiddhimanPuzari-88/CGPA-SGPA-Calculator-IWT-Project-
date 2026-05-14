// script.js

// ─── Firebase + localStorage data sync ────────────────────────
const ADMIN_STORAGE_KEY = "kuAdminSemesterData";
let currentActiveSem = null; // tracks which semester the user has open

(function applyLocalCache() {
  // Apply localStorage cache immediately so the page is never blank
  const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      for (let s = 1; s <= 8; s++) {
        if (parsed[s]) semesterData[s] = parsed[s];
      }
    } catch (e) { /* use defaults */ }
  }
})();

function initFirebaseSync() {
  if (typeof firebase === "undefined") return;
  try {
    const db = firebase.database();
    db.ref("semesterData").on("value", (snapshot) => {
      const fbData = snapshot.val();
      if (!fbData) return;

      let changed = false;
      for (let s = 1; s <= 8; s++) {
        if (fbData[s]) {
          const arr = Array.isArray(fbData[s]) ? fbData[s] : Object.values(fbData[s]);
          semesterData[s] = arr;
          changed = true;
        }
      }
      if (!changed) return;

      // Update localStorage cache
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(semesterData));

      // If a semester is currently displayed, refresh it live
      if (currentActiveSem) {
        currentSemSubjects = semesterData[currentActiveSem] || [];
        renderCurrentSemester();
      }
    });
  } catch (e) {
    console.warn("KU Calculator: Firebase sync failed, using cached data.", e);
  }
}

// Called after a semester is rendered — refreshes without resetting scroll
function renderCurrentSemester() {
  const container = document.getElementById("subjectsContainer");
  if (!container || !currentActiveSem) return;
  container.innerHTML = "";
  document.getElementById("sgpaResultBox").classList.add("hidden");
  document.getElementById("impactAnalysis").classList.add("hidden");
  document.getElementById("whatIfBox").classList.add("hidden");

  currentSemSubjects.forEach((item, index) => {
    const isHeavy = item.credit >= 4;
    const row = document.createElement("div");
    row.classList.add("subject-row");
    row.innerHTML = `
      <div class="subject-name-wrap">
        <span class="subject-name">${item.subject}</span>
        ${isHeavy ? `<span class="badge-important">High Credit</span>` : ""}
      </div>
      <span class="credit-tag">${item.credit} Credit</span>
      <div style="display:flex;align-items:center;gap:6px;">
        <input type="number" class="marks-input" id="marks-${index}"
          data-credit="${item.credit}" data-subject="${item.subject}" data-index="${index}"
          min="0" max="100" placeholder="Marks">
        <span class="grade-display grade-na" id="grade-disp-${index}">--</span>
      </div>`;
    container.appendChild(row);

    const inp   = row.querySelector(`#marks-${index}`);
    const gDisp = row.querySelector(`#grade-disp-${index}`);
    inp.addEventListener("input", () => {
      const val = parseFloat(inp.value);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        const g = marksToGrade(val);
        gDisp.textContent = g;
        gDisp.className = `grade-display ${gradeClass(g)}`;
      } else {
        gDisp.textContent = "--";
        gDisp.className = "grade-display grade-na";
      }
      recomputeWhatIf();
    });
  });
  buildWhatIf();
}

// ─── Grade helpers ─────────────────────────────────────────────

function marksToGrade(marks) {
  if (marks >= 90) return "O";
  if (marks >= 80) return "A+";
  if (marks >= 70) return "A";
  if (marks >= 60) return "B+";
  if (marks >= 50) return "B";
  if (marks >= 40) return "C";
  return "F";
}

function gradeClass(g) {
  return { "O": "grade-O", "A+": "grade-Ap", "A": "grade-A", "B+": "grade-Bp", "B": "grade-B", "C": "grade-C", "F": "grade-F" }[g] || "grade-na";
}

function gradeColor(g) {
  return { "O": "#1a7a3a", "A+": "#0055aa", "A": "#006699", "B+": "#3a6600", "B": "#776600", "C": "#884400", "F": "#880000" }[g] || "#aaa";
}

function gradeBarColor(g) {
  return { "O": "#2ecc71", "A+": "#3498db", "A": "#5dade2", "B+": "#82e03a", "B": "#f4d03f", "C": "#e67e22", "F": "#e74c3c" }[g] || "#ccc";
}

function sgpaLabel(sgpa) {
  const s = parseFloat(sgpa);
  if (s >= 9) return "Outstanding";
  if (s >= 8) return "Excellent";
  if (s >= 7) return "Very Good";
  if (s >= 6) return "Good";
  if (s >= 5) return "Satisfactory";
  return "Needs Improvement";
}

// ─── Navbar glass on scroll ───────────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('topnav');
  if (window.scrollY > 10) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});

// ─── Notice toggle ────────────────────────────────────────────
function toggleNotice() {
  const bar = document.getElementById('noticeBar');
  const content = document.getElementById('noticeContent');
  const isOpen = content.classList.contains('open');
  if (isOpen) {
    content.classList.remove('open');
    bar.setAttribute('aria-expanded', 'false');
  } else {
    content.classList.add('open');
    bar.setAttribute('aria-expanded', 'true');
  }
}

// ─── Contact panel toggle ──────────────────────────────────────
function toggleContact() {
  const panel = document.getElementById('contactPanel');
  const fab = document.getElementById('contactFab');
  const overlay = document.getElementById('overlay');
  const isOpen = panel.classList.contains('open');
  if (isOpen) {
    panel.classList.remove('open');
    fab.classList.remove('active');
    overlay.classList.remove('active');
  } else {
    panel.classList.add('open');
    fab.classList.add('active');
    overlay.classList.add('active');
  }
}

// ─── SGPA Section ──────────────────────────────────────────────
const semesterSelect = document.getElementById("semesterSelect");
const subjectsContainer = document.getElementById("subjectsContainer");
const calculateSGPA = document.getElementById("calculateSGPA");
const sgpaResultBox = document.getElementById("sgpaResultBox");
const sgpaScore = document.getElementById("sgpaScore");
const sgpaGradeLabel = document.getElementById("sgpaGradeLabel");
const impactAnalysis = document.getElementById("impactAnalysis");
const impactList = document.getElementById("impactList");
const whatIfBox = document.getElementById("whatIfBox");
const whatIfList = document.getElementById("whatIfList");
const whatIfResult = document.getElementById("whatIfResult");

// ─── Drum Picker Setup ──────────────────────────────────────────
function initDrumPicker(pickerId, callback) {
  const scrollContainer = document.getElementById(pickerId);
  if (!scrollContainer) return;
  const items = scrollContainer.querySelectorAll(".drum-item");
  let activeValue = null;

  items.forEach(item => {
    item.addEventListener("click", () => {
      item.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const val = entry.target.dataset.val;
        if (val !== activeValue) {
          activeValue = val;
          items.forEach(i => i.classList.remove("active"));
          entry.target.classList.add("active");
          if (navigator.vibrate) navigator.vibrate(12);
          callback(val);
        }
      }
    });
  }, {
    root: scrollContainer,
    rootMargin: "0px -50% 0px -50%",
    threshold: 0
  });

  items.forEach(item => observer.observe(item));

  // Init first
  setTimeout(() => {
    scrollContainer.scrollTo({ left: 0, behavior: "instant" });
  }, 100);
}

let currentSemSubjects = [];

initDrumPicker("semesterSelect", (semester) => {
  subjectsContainer.innerHTML = "";
  sgpaResultBox.classList.add("hidden");
  impactAnalysis.classList.add("hidden");
  whatIfBox.classList.add("hidden");

  if (!semester) return;

  currentActiveSem    = Number(semester);
  currentSemSubjects  = semesterData[semester];

  currentSemSubjects.forEach((item, index) => {
    const isHeavy = item.credit >= 4;

    const row = document.createElement("div");
    row.classList.add("subject-row");

    row.innerHTML = `
      <div class="subject-name-wrap">
        <span class="subject-name">${item.subject}</span>
        ${isHeavy ? `<span class="badge-important">High Credit</span>` : ""}
      </div>
      <span class="credit-tag">${item.credit} Credit</span>
      <div style="display:flex;align-items:center;gap:6px;">
        <input
          type="number"
          class="marks-input"
          id="marks-${index}"
          data-credit="${item.credit}"
          data-subject="${item.subject}"
          data-index="${index}"
          min="0" max="100"
          placeholder="Marks"
        >
        <span class="grade-display grade-na" id="grade-disp-${index}">--</span>
      </div>
    `;

    subjectsContainer.appendChild(row);

    // Live grade display
    const inp = row.querySelector(`#marks-${index}`);
    const gDisp = row.querySelector(`#grade-disp-${index}`);
    inp.addEventListener("input", () => {
      const val = parseFloat(inp.value);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        const g = marksToGrade(val);
        gDisp.textContent = g;
        gDisp.className = `grade-display ${gradeClass(g)}`;
      } else {
        gDisp.textContent = "--";
        gDisp.className = "grade-display grade-na";
      }
      recomputeWhatIf();
    });
  });

  buildWhatIf();
});

// ─── Calculate SGPA ───────────────────────────────────────────
calculateSGPA.addEventListener("click", () => {
  const inputs = document.querySelectorAll(".marks-input");
  let totalCredits = 0, totalPoints = 0;
  let gradeCounts = { O: 0, "A+": 0, A: 0, "B+": 0, B: 0, C: 0, F: 0 };
  let impacts = [];

  inputs.forEach(input => {
    const marks = parseFloat(input.value);
    const credit = Number(input.dataset.credit);
    const subj = input.dataset.subject;
    if (!isNaN(marks) && input.value !== "") {
      const g = marksToGrade(marks);
      const pts = gradePoints[g] * credit;
      totalCredits += credit;
      totalPoints += pts;
      gradeCounts[g]++;
      impacts.push({ subject: subj, credit, grade: g, pts });
    }
  });

  if (totalCredits === 0) {
    sgpaScore.textContent = "Enter marks first";
    sgpaResultBox.classList.remove("hidden");
    sgpaResultBox.style.background = "#fff5f5";
    sgpaResultBox.style.borderColor = "#ffaaaa";
    sgpaScore.style.fontSize = "1.1rem";
    sgpaScore.style.color = "#880000";
    return;
  }

  // Reset styles
  sgpaResultBox.style.background = "";
  sgpaResultBox.style.borderColor = "";
  sgpaScore.style.fontSize = "";
  sgpaScore.style.color = "";

  const sgpa = (totalPoints / totalCredits).toFixed(2);
  sgpaScore.textContent = sgpa;
  sgpaGradeLabel.textContent = sgpaLabel(sgpa);
  sgpaResultBox.classList.remove("hidden");

  // Impact analysis — bars only, no top note
  impacts.sort((a, b) => b.pts - a.pts);
  impactList.innerHTML = "";

  impacts.forEach(item => {
    const pct = ((item.pts / totalPoints) * 100).toFixed(1);
    const wrap = document.createElement("div");
    wrap.className = "impact-bar-wrap";
    wrap.innerHTML = `
      <div class="impact-label" title="${item.subject}">${item.subject}</div>
      <div class="impact-track">
        <div class="impact-fill" style="width:0%;background:${gradeBarColor(item.grade)}" data-w="${pct}"></div>
      </div>
      <div class="impact-pct">${pct}%</div>
    `;
    impactList.appendChild(wrap);
  });

  impactAnalysis.classList.remove("hidden");

  // Animate bars
  requestAnimationFrame(() => {
    document.querySelectorAll(".impact-fill").forEach(bar => {
      bar.style.width = bar.dataset.w + "%";
    });
  });

  // What-If
  whatIfBox.classList.remove("hidden");
  recomputeWhatIf();
});

// ─── Grade Chart ──────────────────────────────────────────────
function buildGradeChart(counts) {
  const ctx = document.getElementById("gradeChart").getContext("2d");
  if (gradeChartInstance) gradeChartInstance.destroy();

  const labels = Object.keys(counts).filter(k => counts[k] > 0);
  const data = labels.map(k => counts[k]);
  const colors = labels.map(k => gradeBarColor(k));

  gradeChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }]
    },
    options: {
      responsive: true,
      cutout: "60%",
      plugins: {
        legend: { position: "bottom", labels: { font: { family: "Inter", size: 12 }, padding: 16 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw} subject${ctx.raw > 1 ? "s" : ""}`
          }
        }
      },
      animation: { animateRotate: true, duration: 900, easing: "easeInOutQuart" }
    }
  });
}

// ─── What-If Calculator ────────────────────────────────────────
function buildWhatIf() {
  whatIfList.innerHTML = "";
  if (!currentSemSubjects.length) return;
  currentSemSubjects.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "whatif-row";
    const gradeOptions = ["O", "A+", "A", "B+", "B", "C", "F"]
      .map(g => `<option value="${g}">${g} (${gradePoints[g]})</option>`).join("");
    row.innerHTML = `
      <div class="whatif-name">${item.subject} <small style="color:#aaa">(${item.credit}cr)</small></div>
      <select class="whatif-select" data-credit="${item.credit}" data-wi="${i}">
        <option value="">-- Grade --</option>
        ${gradeOptions}
      </select>
    `;
    whatIfList.appendChild(row);
    row.querySelector("select").addEventListener("change", recomputeWhatIf);
  });
}

function recomputeWhatIf() {
  const realInputs = document.querySelectorAll(".marks-input");
  const whatIfSelects = document.querySelectorAll(".whatif-select");

  let totalCredits = 0, totalPoints = 0;

  currentSemSubjects.forEach((item, i) => {
    const realInput = realInputs[i];
    const wiSel = whatIfSelects[i];

    // Prefer what-if selection, else real marks
    let grade = null;
    if (wiSel && wiSel.value) {
      grade = wiSel.value;
    } else if (realInput && realInput.value !== "" && !isNaN(parseFloat(realInput.value))) {
      grade = marksToGrade(parseFloat(realInput.value));
    }

    if (grade) {
      totalCredits += item.credit;
      totalPoints += item.credit * gradePoints[grade];
    }
  });

  if (totalCredits === 0) {
    whatIfResult.textContent = "Select grades above to simulate SGPA.";
    return;
  }

  const sim = (totalPoints / totalCredits).toFixed(2);
  whatIfResult.innerHTML = `Simulated SGPA: <strong>${sim}</strong> &nbsp;&middot;&nbsp; ${sgpaLabel(sim)}`;
}

// ─── CGPA Section ──────────────────────────────────────────────
const cgpaSemesterSel = document.getElementById("cgpaSemester");
const cgpaInputsDiv = document.getElementById("cgpaInputs");
const calculateCGPA = document.getElementById("calculateCGPA");
const cgpaResultBox = document.getElementById("cgpaResultBox");
const cgpaScore = document.getElementById("cgpaScore");
const cgpaGradeLabel = document.getElementById("cgpaGradeLabel");
const performanceSummary = document.getElementById("performanceSummary");
const perfGrid = document.getElementById("perfGrid");
const cgpaChartBox = document.getElementById("cgpaChartBox");

let cgpaChartInstance = null;

initDrumPicker("cgpaSemester", (semStr) => {
  const sem = Number(semStr);
  cgpaInputsDiv.innerHTML = "";
  cgpaResultBox.classList.add("hidden");
  performanceSummary.classList.add("hidden");
  cgpaChartBox.classList.add("hidden");
  if (!sem) return;

  for (let i = 1; i <= sem; i++) {
    const row = document.createElement("div");
    row.className = "cgpa-sem-row";
    row.innerHTML = `
      <div class="cgpa-sem-label">Semester ${i} SGPA</div>
      <input type="number" step="0.01" min="0" max="10" placeholder="e.g. 8.50" class="cgpa-input" data-sem="${i}">
    `;
    cgpaInputsDiv.appendChild(row);
  }
});

calculateCGPA.addEventListener("click", () => {
  const inputs = document.querySelectorAll(".cgpa-input");
  let total = 0, count = 0;
  let values = [], labels = [];
  let best = -Infinity, worst = Infinity, bestSem = 0, worstSem = 0;

  inputs.forEach(inp => {
    const v = parseFloat(inp.value);
    const s = Number(inp.dataset.sem);
    if (!isNaN(v)) {
      total += v; count++;
      values.push(v);
      labels.push("Sem " + s);
      if (v > best) { best = v; bestSem = s; }
      if (v < worst) { worst = v; worstSem = s; }
    }
  });

  if (count === 0) {
    cgpaScore.textContent = "Please enter SGPAs.";
    cgpaResultBox.classList.remove("hidden");
    return;
  }

  const cgpa = (total / count).toFixed(2);
  cgpaScore.textContent = cgpa;
  cgpaGradeLabel.textContent = sgpaLabel(cgpa);
  cgpaResultBox.classList.remove("hidden");

  // Trend
  let trend = "—";
  if (values.length >= 2) {
    const recent = values[values.length - 1];
    const prev = values[values.length - 2];
    trend = recent > prev ? "Improving" : recent < prev ? "Declining" : "Stable";
  }

  // Performance Summary
  perfGrid.innerHTML = `
    <div class="perf-card">
      <div class="perf-val">${best.toFixed(2)}</div>
      <div class="perf-desc">Best Semester (Sem ${bestSem})</div>
    </div>
    <div class="perf-card">
      <div class="perf-val">${worst.toFixed(2)}</div>
      <div class="perf-desc">Lowest Semester (Sem ${worstSem})</div>
    </div>
    <div class="perf-card">
      <div class="perf-val">${count}</div>
      <div class="perf-desc">Semesters Completed</div>
    </div>
    <div class="perf-card">
      <div class="perf-val ${trend === "Improving" ? "trend-up" : trend === "Declining" ? "trend-down" : ""}">${trend}</div>
      <div class="perf-desc">Recent Trend</div>
    </div>
  `;
  performanceSummary.classList.remove("hidden");

  // CGPA Trend Chart
  buildCGPAChart(labels, values);
  cgpaChartBox.classList.remove("hidden");
});

function buildCGPAChart(labels, values) {
  const ctx = document.getElementById("cgpaChart").getContext("2d");
  if (cgpaChartInstance) cgpaChartInstance.destroy();

  cgpaChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "SGPA",
        data: values,
        backgroundColor: values.map(v =>
          v >= 9 ? "#2ecc71" : v >= 8 ? "#3498db" : v >= 7 ? "#f1c40f" : v >= 6 ? "#e67e22" : "#e74c3c"
        ),
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: 0, max: 10,
          grid: { color: "#f0f0f0" },
          ticks: { font: { family: "Inter" } }
        },
        x: { grid: { display: false }, ticks: { font: { family: "Inter" } } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` SGPA: ${ctx.raw}` }
        }
      },
      animation: { duration: 800, easing: "easeInOutQuart" }
    }
  });
}

// ─── Target CGPA Planner ──────────────────────────────────────
document.getElementById("plannerCalculate").addEventListener("click", () => {
  const completed = parseInt(document.getElementById("plannerCompleted").value);
  const current = parseFloat(document.getElementById("plannerCurrentCGPA").value);
  const goal = parseFloat(document.getElementById("plannerGoal").value);
  const resultEl = document.getElementById("plannerResult");

  if (!completed || isNaN(current) || isNaN(goal)) {
    resultEl.innerHTML = "Please fill in all three fields.";
    resultEl.classList.remove("hidden", "planner-impossible");
    return;
  }

  const totalSems = 8;
  const remaining = totalSems - completed;

  if (remaining <= 0) {
    resultEl.innerHTML = "You've completed all 8 semesters!";
    resultEl.classList.remove("hidden", "planner-impossible");
    return;
  }

  // Required: goal * totalSems = current * completed + required * remaining
  const required = (goal * totalSems - current * completed) / remaining;

  resultEl.classList.remove("hidden", "planner-impossible");

  if (required > 10) {
    resultEl.classList.add("planner-impossible");
    resultEl.innerHTML = `
      Your target CGPA of <strong>${goal}</strong> is not achievable — the required SGPA of
      <strong>${required.toFixed(2)}</strong> exceeds the maximum of 10.
      Consider adjusting your goal.
    `;
  } else if (required < 0) {
    resultEl.innerHTML = `
      You've already secured a CGPA above your target of <strong>${goal}</strong>.<br>
      Even scoring <strong>0</strong> in remaining semesters, you'll exceed it!
    `;
  } else {
    const diff = required - current;
    const note = diff > 0
      ? `You need to score <strong>${diff.toFixed(2)} points higher</strong> than your current average per semester.`
      : `This is <strong>${Math.abs(diff).toFixed(2)} points lower</strong> than your current average — keep it up!`;
    resultEl.innerHTML = `
      You need <span class="big-num">${required.toFixed(2)}</span>
      SGPA in each of your <strong>${remaining}</strong> remaining semester${remaining > 1 ? "s" : ""}
      to achieve a CGPA of <strong>${goal}</strong>.
      <div class="plan-note" style="margin-top:8px">${note}</div>
    `;
  }
});

// ─── Start Firebase real-time sync ────────────────────────────
initFirebaseSync();