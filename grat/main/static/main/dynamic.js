/**
 * dynamic.js — Grat Workout App
 * Handles all dynamic rendering: workout days, exercises, cardio panels.
 * Data is injected from Django template context via a <script> tag in index.html.
 * Falls back to demo mock data when no real data is present.
 */

/* ============================================================
   MOCK DATA — Structured like an API response.
   Replace/extend with real data injected from Django below.
   ============================================================ */
const MOCK_WORKOUT_DATA = {
  plan: {
    split: "PPL",
    goal: "bulk",
    daysPerWeek: 3,
  },
  days: [
    {
      day: 1,
      focus: "Push",
      exercises: [
        { order: 1, name: "Barbell Bench Press",   muscle: "chest",    sets: 4, reps: 8,  url: "" },
        { order: 2, name: "Incline Dumbbell Press", muscle: "chest",   sets: 3, reps: 10, url: "" },
        { order: 3, name: "Overhead Press",         muscle: "shoulder", sets: 3, reps: 10, url: "" },
        { order: 4, name: "Lateral Raises",         muscle: "shoulder", sets: 4, reps: 15, url: "" },
        { order: 5, name: "Tricep Pushdown",        muscle: "tricpe",  sets: 3, reps: 12, url: "" },
        { order: 6, name: "Overhead Tricep Ext.",   muscle: "tricpe",  sets: 3, reps: 12, url: "" },
      ],
      cardio: [
        { order: 1, name: "Treadmill",  duration: "15.00", distance: "2.00" }
      ]
    },
    {
      day: 2,
      focus: "Pull",
      exercises: [
        { order: 1, name: "Pull-Ups",              muscle: "back",  sets: 4, reps: 8,  url: "" },
        { order: 2, name: "Barbell Row",           muscle: "back",  sets: 4, reps: 8,  url: "" },
        { order: 3, name: "Seated Cable Row",      muscle: "back",  sets: 3, reps: 12, url: "" },
        { order: 4, name: "Face Pulls",            muscle: "shoulder", sets: 3, reps: 15, url: "" },
        { order: 5, name: "Barbell Bicep Curl",    muscle: "bicpe", sets: 3, reps: 12, url: "" },
        { order: 6, name: "Hammer Curls",          muscle: "bicpe", sets: 3, reps: 12, url: "" },
      ],
      cardio: []
    },
    {
      day: 3,
      focus: "Legs",
      exercises: [
        { order: 1, name: "Barbell Squat",      muscle: "leg", sets: 4, reps: 8,  url: "" },
        { order: 2, name: "Romanian Deadlift",  muscle: "leg", sets: 3, reps: 10, url: "" },
        { order: 3, name: "Leg Press",          muscle: "leg", sets: 3, reps: 12, url: "" },
        { order: 4, name: "Leg Extension",      muscle: "leg", sets: 3, reps: 15, url: "" },
        { order: 5, name: "Seated Leg Curl",    muscle: "leg", sets: 3, reps: 15, url: "" },
        { order: 6, name: "Standing Calf Raise",muscle: "leg", sets: 4, reps: 20, url: "" },
      ],
      cardio: [
        { order: 1, name: "Cycling", duration: "20.00", distance: "8.00" }
      ]
    }
  ]
};

/* ============================================================
   MUSCLE GROUP → ICON MAP
   ============================================================ */
const muscleIcons = {
  chest:    "🏋️",
  back:     "🔙",
  leg:      "🦵",
  bicpe:    "💪",
  bicep:    "💪",
  tricpe:   "💪",
  tricep:   "💪",
  shoulder: "🔝",
  abs:      "🔥",
  cardio:   "🏃",
};

const cardioIcons = {
  treadmill: "🏃",
  cycling:   "🚴",
  rowing:    "🚣",
  elliptical:"⚙️",
  default:   "❤️",
};

function getCardioIcon(name) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(cardioIcons)) {
    if (lower.includes(key)) return cardioIcons[key];
  }
  return cardioIcons.default;
}

/* ============================================================
   STATE
   ============================================================ */
let workoutData = null;
let activeDayIndex = null;

/* ============================================================
   INITIALISE
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  // Attempt to read real data injected by Django template
  const injected = window.__GRAT_WORKOUT_DATA__;
  workoutData = (injected && injected.days && injected.days.length > 0)
    ? injected
    : MOCK_WORKOUT_DATA;

  const dashboard = document.getElementById("workout-dashboard");
  if (!dashboard) return; // Not on the workout page

  renderDashboard(dashboard);
});

/* ============================================================
   RENDER DASHBOARD
   ============================================================ */
function renderDashboard(container) {
  container.innerHTML = "";

  // ── Plan Meta Bar
  if (workoutData.plan) {
    container.appendChild(renderPlanMeta(workoutData.plan));
  }

  // ── Days Grid
  const grid = document.createElement("div");
  grid.id = "days-grid";
  grid.className = "days-grid";

  workoutData.days.forEach((day, idx) => {
    grid.appendChild(renderDayCard(day, idx));
  });
  container.appendChild(grid);

  // ── Exercise Panel (initially hidden)
  const panel = document.createElement("div");
  panel.id = "exercise-panel";
  panel.className = "exercise-panel";
  container.appendChild(panel);
}

/* ── Plan Meta Bar ─────────────────────────────────────── */
function renderPlanMeta(plan) {
  const bar = document.createElement("div");
  bar.className = "plan-meta";

  if (plan.goal) {
    const goalBadge = document.createElement("span");
    goalBadge.className = `meta-badge goal-${plan.goal}`;
    goalBadge.textContent = `🎯 ${capitalize(plan.goal)}ing`;
    bar.appendChild(goalBadge);
  }

  if (plan.split) {
    const splitBadge = document.createElement("span");
    splitBadge.className = "meta-badge plan-split";
    splitBadge.textContent = `📋 ${plan.split} Split`;
    bar.appendChild(splitBadge);
  }

  if (plan.daysPerWeek) {
    const daysSpan = document.createElement("span");
    daysSpan.className = "meta-days";
    daysSpan.textContent = `${plan.daysPerWeek} days / week`;
    bar.appendChild(daysSpan);
  }

  return bar;
}

/* ── Day Card ──────────────────────────────────────────── */
function renderDayCard(day, idx) {
  const card = document.createElement("div");
  card.className = "day-card";
  card.id = `day-card-${idx}`;
  card.dataset.dayIndex = idx;
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-expanded", "false");

  const exCount = day.exercises ? day.exercises.length : 0;
  const cardioCount = day.cardio ? day.cardio.length : 0;

  card.innerHTML = `
    <div class="day-number">${day.day}</div>
    <div class="day-label">Day ${day.day}</div>
    ${day.focus ? `<div class="day-focus">${day.focus}</div>` : ""}
    <div class="day-exercise-count">
      ${exCount} exercise${exCount !== 1 ? "s" : ""}
      ${cardioCount > 0 ? ` · ${cardioCount} cardio` : ""}
    </div>
    <div class="day-arrow">▾</div>
  `;

  card.addEventListener("click", () => toggleDay(idx, day));
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleDay(idx, day);
    }
  });

  return card;
}

/* ============================================================
   TOGGLE DAY PANEL
   ============================================================ */
function toggleDay(idx, day) {
  const panel = document.getElementById("exercise-panel");
  const cards = document.querySelectorAll(".day-card");

  if (activeDayIndex === idx) {
    // Close current panel
    closePanel(panel, cards);
    activeDayIndex = null;
    return;
  }

  // Deactivate all cards
  cards.forEach(c => {
    c.classList.remove("active");
    c.setAttribute("aria-expanded", "false");
  });

  // Activate clicked card
  const activeCard = document.getElementById(`day-card-${idx}`);
  if (activeCard) {
    activeCard.classList.add("active");
    activeCard.setAttribute("aria-expanded", "true");
  }

  activeDayIndex = idx;
  renderExercisePanel(panel, day);

  // Scroll panel into view smoothly
  requestAnimationFrame(() => {
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

/* ── Close Panel ───────────────────────────────────────── */
function closePanel(panel, cards) {
  panel.classList.remove("visible");
  // Remove active from all cards
  if (!cards) cards = document.querySelectorAll(".day-card");
  cards.forEach(c => {
    c.classList.remove("active");
    c.setAttribute("aria-expanded", "false");
  });
  // Clear after transition
  setTimeout(() => { panel.innerHTML = ""; }, 350);
}

/* ============================================================
   RENDER EXERCISE PANEL
   ============================================================ */
function renderExercisePanel(panel, day) {
  panel.innerHTML = "";
  panel.classList.remove("visible");

  // ── Panel Header
  const header = document.createElement("div");
  header.className = "panel-header";
  header.innerHTML = `
    <h2>
      <span class="panel-day-tag">Day ${day.day}</span>
      ${day.focus ? ` ${day.focus} Day` : " Workout"}
    </h2>
    <button class="panel-close-btn" aria-label="Close panel" title="Close">✕</button>
  `;
  header.querySelector(".panel-close-btn").addEventListener("click", () => {
    closePanel(panel);
    activeDayIndex = null;
  });
  panel.appendChild(header);

  // ── Exercises
  if (day.exercises && day.exercises.length > 0) {
    const exTitle = document.createElement("div");
    exTitle.className = "section-title";
    exTitle.textContent = "Exercises";
    panel.appendChild(exTitle);

    const list = document.createElement("div");
    list.className = "exercises-list";
    day.exercises
      .sort((a, b) => a.order - b.order)
      .forEach(ex => list.appendChild(renderExerciseCard(ex)));
    panel.appendChild(list);
  } else {
    panel.appendChild(renderEmptyState("🏋️", "No exercises planned for this day."));
  }

  // ── Cardio
  if (day.cardio && day.cardio.length > 0) {
    const cardioTitle = document.createElement("div");
    cardioTitle.className = "section-title";
    cardioTitle.textContent = "Cardio";
    panel.appendChild(cardioTitle);

    const cardioList = document.createElement("div");
    cardioList.className = "cardio-list";
    day.cardio
      .sort((a, b) => a.order - b.order)
      .forEach(c => cardioList.appendChild(renderCardioCard(c)));
    panel.appendChild(cardioList);
  }

  // Trigger animation
  requestAnimationFrame(() => { panel.classList.add("visible"); });
}

/* ── Exercise Card ─────────────────────────────────────── */
function renderExerciseCard(ex) {
  const card = document.createElement("div");
  card.className = "exercise-card";

  const muscle = ex.muscle || "chest";
  const icon = muscleIcons[muscle] || "🏋️";

  card.innerHTML = `
    <div class="exercise-card-top">
      <div class="exercise-order">${ex.order}</div>
      <span class="muscle-badge ${muscle}">${icon} ${capitalize(muscleName(muscle))}</span>
    </div>
    <div class="exercise-name">${ex.name}</div>
    <div class="exercise-stats">
      <div class="stat-chip">
        <span class="stat-icon">🔁</span>
        <span class="stat-label">Sets</span>
        <span class="stat-value">${ex.sets}</span>
      </div>
      <div class="stat-chip">
        <span class="stat-icon">⚡</span>
        <span class="stat-label">Reps</span>
        <span class="stat-value">${ex.reps}</span>
      </div>
      <div class="stat-chip">
        <span class="stat-icon">📊</span>
        <span class="stat-label">Volume</span>
        <span class="stat-value">${ex.sets * ex.reps}</span>
      </div>
    </div>
    ${ex.url ? `
      <a class="exercise-link-btn" href="${ex.url}" target="_blank" rel="noopener">
        ▶ Watch Tutorial
      </a>
    ` : ""}
  `;

  return card;
}

/* ── Cardio Card ───────────────────────────────────────── */
function renderCardioCard(c) {
  const card = document.createElement("div");
  card.className = "cardio-card";

  const icon = getCardioIcon(c.name);
  const duration = parseFloat(c.duration || 0).toFixed(0);
  const distance = parseFloat(c.distance || 0).toFixed(1);

  card.innerHTML = `
    <div class="cardio-icon">${icon}</div>
    <div class="cardio-info">
      <div class="cardio-name">${c.name}</div>
      <div class="cardio-stats">
        <div class="cardio-stat">
          <span class="label">Duration</span>
          <span class="value">${duration} min</span>
        </div>
        <div class="cardio-stat">
          <span class="label">Distance</span>
          <span class="value">${distance} km</span>
        </div>
      </div>
    </div>
    <span class="muscle-badge cardio">🏃 Cardio</span>
  `;

  return card;
}

/* ── Empty State ───────────────────────────────────────── */
function renderEmptyState(icon, message) {
  const el = document.createElement("div");
  el.className = "empty-state";
  el.innerHTML = `<div class="empty-icon">${icon}</div><p>${message}</p>`;
  return el;
}

/* ============================================================
   UTILITIES
   ============================================================ */
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function muscleName(key) {
  const names = {
    bicpe: "Biceps",
    tricpe: "Triceps",
    leg: "Legs",
    abs: "Abs",
  };
  return names[key] || key;
}

/* ============================================================
   AUTH PAGES — Login & Register
   Client-side validation + UX enhancements
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initPasswordToggles();
  initLoginValidation();
  initRegisterValidation();
});

/* ── Password Eye Toggles ──────────────────────────────── */
function initPasswordToggles() {
  document.querySelectorAll(".auth-eye-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;

      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.querySelector(".eye-icon").textContent = isHidden ? "🙈" : "👁";
      btn.setAttribute("aria-pressed", isHidden ? "true" : "false");
    });
  });
}

/* ── Show / Clear field error ──────────────────────────── */
function setFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const errEl = document.getElementById(errorId);
  if (!field || !errEl) return;
  if (message) {
    field.classList.add("has-error");
    errEl.textContent = message;
  } else {
    field.classList.remove("has-error");
    errEl.textContent = "";
  }
}

function clearFieldError(fieldId, errorId) {
  setFieldError(fieldId, errorId, "");
}

/* ── Login Form Validation ─────────────────────────────── */
function initLoginValidation() {
  const form = document.getElementById("login-form");
  if (!form) return;

  const usernameInput = document.getElementById("login-username");
  const passwordInput = document.getElementById("login-password");

  // Clear errors on input
  usernameInput?.addEventListener("input", () =>
    clearFieldError("field-username", "err-username")
  );
  passwordInput?.addEventListener("input", () =>
    clearFieldError("field-password", "err-password")
  );

  form.addEventListener("submit", (e) => {
    let valid = true;

    if (!usernameInput?.value.trim()) {
      setFieldError("field-username", "err-username", "Username is required.");
      valid = false;
    }

    if (!passwordInput?.value) {
      setFieldError("field-password", "err-password", "Password is required.");
      valid = false;
    }

    if (!valid) {
      e.preventDefault();
      return;
    }

    // Loading state
    const btn = document.getElementById("login-submit-btn");
    if (btn) {
      btn.classList.add("loading");
      btn.querySelector(".btn-text").textContent = "Logging in…";
    }
  });
}

/* ── Register Form Validation ──────────────────────────── */
function initRegisterValidation() {
  const form = document.getElementById("register-form");
  if (!form) return;

  const usernameInput = document.getElementById("reg-username");
  const emailInput    = document.getElementById("reg-email");
  const passwordInput = document.getElementById("reg-password");
  const confirmInput  = document.getElementById("reg-confirm");

  // Live password strength meter
  passwordInput?.addEventListener("input", () => {
    updatePasswordStrength(passwordInput.value);
    // Re-validate confirm if already touched
    if (confirmInput?.dataset.touched) {
      validateConfirm();
    }
    clearFieldError("field-reg-password", "err-reg-password");
  });

  // Clear errors on input
  usernameInput?.addEventListener("input", () =>
    clearFieldError("field-reg-username", "err-reg-username")
  );
  emailInput?.addEventListener("input", () =>
    clearFieldError("field-reg-email", "err-reg-email")
  );
  confirmInput?.addEventListener("input", () => {
    confirmInput.dataset.touched = "1";
    validateConfirm();
  });

  // Submit validation
  form.addEventListener("submit", (e) => {
    let valid = true;

    if (!usernameInput?.value.trim()) {
      setFieldError("field-reg-username", "err-reg-username", "Username is required.");
      valid = false;
    }

    if (!emailInput?.value.trim()) {
      setFieldError("field-reg-email", "err-reg-email", "Email is required.");
      valid = false;
    } else if (!isValidEmail(emailInput.value.trim())) {
      setFieldError("field-reg-email", "err-reg-email", "Please enter a valid email.");
      valid = false;
    }

    if (!passwordInput?.value) {
      setFieldError("field-reg-password", "err-reg-password", "Password is required.");
      valid = false;
    } else if (passwordInput.value.length < 6) {
      setFieldError("field-reg-password", "err-reg-password", "Password must be at least 6 characters.");
      valid = false;
    }

    if (!validateConfirm()) {
      valid = false;
    }

    if (!valid) {
      e.preventDefault();
      return;
    }

    // Loading state
    const btn = document.getElementById("register-submit-btn");
    if (btn) {
      btn.classList.add("loading");
      btn.querySelector(".btn-text").textContent = "Creating account…";
    }
  });

  function validateConfirm() {
    if (!confirmInput || !passwordInput) return true;
    if (confirmInput.value && confirmInput.value !== passwordInput.value) {
      setFieldError("field-reg-confirm", "err-reg-confirm", "Passwords do not match.");
      return false;
    } else {
      clearFieldError("field-reg-confirm", "err-reg-confirm");
      return true;
    }
  }
}

/* ── Password Strength ─────────────────────────────────── */
function updatePasswordStrength(password) {
  const bar  = document.getElementById("strength-bar");
  const label = document.getElementById("strength-label");
  if (!bar || !label) return;

  let score = 0;
  if (password.length >= 6)  score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { pct: "0%",   color: "transparent",             text: "" },
    { pct: "25%",  color: "var(--clr-accent-2)",     text: "Weak" },
    { pct: "50%",  color: "var(--clr-cardio)",       text: "Fair" },
    { pct: "75%",  color: "var(--clr-accent)",       text: "Good" },
    { pct: "100%", color: "var(--clr-accent-3)",     text: "Strong" },
  ];

  if (!password) {
    bar.style.width = "0%";
    bar.style.background = "transparent";
    label.textContent = "";
    label.style.color = "";
    return;
  }

  const capped = Math.min(score, 4);
  const level = levels[capped] || levels[4];
  bar.style.width = level.pct;
  bar.style.background = level.color;
  label.textContent = level.text;
  label.style.color = level.color;
}

/* ── Email validation helper ───────────────────────────── */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}