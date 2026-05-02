const muscleIcons = {
  chest: "🏋️",
  back: "🔙",
  leg: "🦵",
  bicpe: "💪",
  bicep: "💪",
  tricpe: "💪",
  tricep: "💪",
  shoulder: "🔝",
  abs: "🔥",
  cardio: "🏃",
};

const appState = {
  activeSession: null,
  selectedDay: null,
  sessionProgress: {},
  activeExerciseId: null,
  exerciseLibrary: null,
};

let workoutData = null;
let activeDayIndex = null;

document.addEventListener("DOMContentLoaded", () => {
  initPasswordToggles();
  initLoginValidation();
  initRegisterValidation();
  initDashboard();
});

function initDashboard() {
  const dashboard = document.getElementById("workout-dashboard");
  const injected = window.__GRAT_WORKOUT_DATA__;
  if (!dashboard || !injected || !Array.isArray(injected.days)) return;
  workoutData = normalizeWorkoutData(injected);
  renderDashboard(dashboard);
  bootstrapActiveSession();
}

function normalizeWorkoutData(data) {
  return {
    plan: data.plan || {},
    days: (data.days || []).map((day) => ({
      ...day,
      id: Number(day.id),
      day: Number(day.day),
      dayName: resolveDayName(day),
      exercises: (day.exercises || []).map((ex) => ({
        ...ex,
        id: Number(ex.id),
        order: Number(ex.order),
        sets: Number(ex.sets),
        reps: Number(ex.reps),
      })),
      cardio: (day.cardio || []).map((c) => ({
        ...c,
        id: Number(c.id),
        order: Number(c.order),
      })),
    })),
  };
}

function resolveDayName(day) {
  if (day.focus && day.focus.trim()) return day.focus.trim();
  const firstExercise = (day.exercises || [])[0];
  const muscle = firstExercise?.muscle || "";
  const map = {
    chest: "Chest",
    back: "Back",
    leg: "Legs",
    bicpe: "Biceps",
    bicep: "Biceps",
    tricpe: "Triceps",
    tricep: "Triceps",
    shoulder: "Shoulders",
    abs: "Abs",
  };
  return map[muscle] || `Workout ${day.day}`;
}

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

  // ── Day details panel
  const panel = document.createElement("div");
  panel.id = "exercise-panel";
  panel.className = "exercise-panel";
  container.appendChild(panel);

  const sessionPanel = document.createElement("div");
  sessionPanel.id = "session-panel";
  sessionPanel.className = "exercise-panel";
  container.appendChild(sessionPanel);
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

  const isActiveSessionDay = appState.activeSession && appState.activeSession.workout_day === day.id;
  const actionLabel = isActiveSessionDay ? "Resume Session" : "Start Session";
  card.innerHTML = `
    <div class="day-number">${day.dayName}</div>
    <div class="day-label">Day ${day.day}</div>
    <div class="day-exercise-count">
      ${exCount} exercise${exCount !== 1 ? "s" : ""}
      ${cardioCount > 0 ? ` · ${cardioCount} cardio` : ""}
    </div>
    <button class="session-cta-btn" data-day-id="${day.id}" type="button">${actionLabel}</button>
    <div class="day-arrow">▾</div>
  `;

  card.addEventListener("click", () => toggleDay(idx, day));
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleDay(idx, day);
    }
  });
  const cta = card.querySelector(".session-cta-btn");
  cta?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (appState.activeSession && appState.activeSession.workout_day === day.id) {
      openSessionPanel(day);
      return;
    }
    startSession(day);
  });
  if (isActiveSessionDay) {
    card.classList.add("session-active");
  }

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
      ${day.dayName} Workout
    </h2>
    <button class="panel-close-btn" aria-label="Close panel" title="Close">✕</button>
  `;
  header.querySelector(".panel-close-btn").addEventListener("click", () => {
    closePanel(panel);
    activeDayIndex = null;
  });
  panel.appendChild(header);

  // ── Exercises
  const exTitle = document.createElement("div");
  exTitle.className = "section-title";
  exTitle.innerHTML = `<span>Exercises</span><button type="button" class="session-cta-btn panel-mini-btn add-exercise-btn">+ Add Exercise</button>`;
  panel.appendChild(exTitle);

  const list = document.createElement("div");
  list.className = "exercises-list";
  if (day.exercises && day.exercises.length > 0) {
    day.exercises
      .sort((a, b) => a.order - b.order)
      .forEach(ex => list.appendChild(renderExerciseCard(ex, { showDelete: true })));
  }
  const addCard = document.createElement("button");
  addCard.type = "button";
  addCard.className = "add-exercise-card";
  addCard.innerHTML = `<span class="add-exercise-plus">+</span><span>Add Exercise</span>`;
  addCard.addEventListener("click", async () => addExerciseToDay(day));
  list.appendChild(addCard);
  panel.appendChild(list);

  // ── Cardio
  const cardioTitle = document.createElement("div");
  cardioTitle.className = "section-title";
  cardioTitle.innerHTML = `<span>Cardio</span><button type="button" class="session-cta-btn panel-mini-btn add-cardio-btn">+ Add Cardio</button>`;
  panel.appendChild(cardioTitle);

  const cardioList = document.createElement("div");
  cardioList.className = "cardio-list";
  if (day.cardio && day.cardio.length > 0) {
    day.cardio
      .sort((a, b) => a.order - b.order)
      .forEach(c => cardioList.appendChild(renderCardioCard(c, { showDelete: true })));
  }
  const addCardioCard = document.createElement("button");
  addCardioCard.type = "button";
  addCardioCard.className = "add-exercise-card add-cardio-card";
  addCardioCard.innerHTML = `<span class="add-exercise-plus">+</span><span>Add Cardio</span>`;
  addCardioCard.addEventListener("click", async () => addCardioToDay(day));
  cardioList.appendChild(addCardioCard);
  panel.appendChild(cardioList);

  bindDayMutationControls(panel, day);

  // Trigger animation
  requestAnimationFrame(() => { panel.classList.add("visible"); });
}

/* ── Exercise Card ─────────────────────────────────────── */
function renderExerciseCard(ex, options = {}) {
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
    ${ex.url ? `<button type="button" class="exercise-link-btn watch-video-btn" data-video-url="${ex.url}">▶ Watch Tutorial</button>` : ""}
    <button type="button" class="exercise-link-btn last-sets-btn" data-ex-id="${ex.id}" data-ex-name="${ex.name}">Last Sets</button>
    ${options.showDelete ? `<button type="button" class="exercise-link-btn delete-item-btn delete-day-ex-btn" data-ex-id="${ex.id}">Delete Exercise</button>` : ""}
  `;

  const watchBtn = card.querySelector(".watch-video-btn");
  watchBtn?.addEventListener("click", () => openVideoModal(ex.url, ex.name));
  const lastSetsBtn = card.querySelector(".last-sets-btn");
  lastSetsBtn?.addEventListener("click", () => openLastSetsModal(ex.id, ex.name));

  return card;
}

/* ── Cardio Card ───────────────────────────────────────── */
function renderCardioCard(c, options = {}) {
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
    <button type="button" class="exercise-link-btn last-cardio-btn" data-cardio-id="${c.id}" data-cardio-name="${c.name}">Last Sessions</button>
    ${options.showDelete ? `<button type="button" class="exercise-link-btn delete-item-btn delete-day-cardio-btn" data-cardio-id="${c.id}">Delete Cardio</button>` : ""}
  `;

  const lastCardioBtn = card.querySelector(".last-cardio-btn");
  lastCardioBtn?.addEventListener("click", () => openLastCardioModal(c.id, c.name));

  return card;
}

/* ── Empty State ───────────────────────────────────────── */
function renderEmptyState(icon, message) {
  const el = document.createElement("div");
  el.className = "empty-state";
  el.innerHTML = `<div class="empty-icon">${icon}</div><p>${message}</p>`;
  return el;
}

async function bootstrapActiveSession() {
  try {
    const data = await apiRequest("/active_session/", { method: "GET" });
    appState.activeSession = data.session;
    updateActiveSessionUI();
    if (appState.activeSession) {
      const matchedDay = workoutData.days.find((day) => day.id === appState.activeSession.workout_day);
      if (matchedDay) {
        appState.selectedDay = matchedDay.id;
      }
    }
  } catch (error) {
    showDashboardError(error.message || "Could not fetch active session.");
  }
}

function updateActiveSessionUI() {
  document.querySelectorAll(".day-card").forEach((card) => {
    const day = workoutData.days[Number(card.dataset.dayIndex)];
    const isActive = Boolean(appState.activeSession && day && appState.activeSession.workout_day === day.id);
    card.classList.toggle("session-active", isActive);
    const cta = card.querySelector(".session-cta-btn");
    if (cta) cta.textContent = isActive ? "Resume Session" : "Start Session";
  });
}

async function startSession(day) {
  const button = document.querySelector(`.session-cta-btn[data-day-id="${day.id}"]`);
  if (button) button.disabled = true;
  clearDashboardError();
  try {
    const payload = { workout_day: day.id };
    await apiRequest("/start_session/", { method: "POST", body: JSON.stringify(payload) });
    const activeData = await apiRequest("/active_session/", { method: "GET" });
    appState.activeSession = activeData.session;
    appState.selectedDay = day.id;
    updateActiveSessionUI();
    await openSessionPanel(day);
  } catch (error) {
    showDashboardError(error.message || "Could not start session.");
  } finally {
    if (button) button.disabled = false;
  }
}

async function openSessionPanel(day) {
  const panel = document.getElementById("session-panel");
  if (!panel) return;
  if (!appState.activeExerciseId && day.exercises && day.exercises.length > 0) {
    appState.activeExerciseId = day.exercises[0].id;
  }
  appState.selectedDay = day.id;
  panel.innerHTML = renderSessionShell(day);
  panel.classList.add("visible");
  const closeButton = panel.querySelector(".panel-close-btn");
  closeButton?.addEventListener("click", () => panel.classList.remove("visible"));
  panel.querySelector("#end-session-btn")?.addEventListener("click", endSession);
  bindExerciseTrackers(panel, day);
  bindCardioTrackers(panel, day);
  await loadProgressContext(panel, day);
}

function renderSessionShell(day) {
  return `
    <div class="panel-header">
      <h2><span class="panel-day-tag">ACTIVE</span> ${day.dayName} Session</h2>
      <button class="panel-close-btn" aria-label="Close panel" title="Close">✕</button>
    </div>
    <div id="session-inline-error" class="auth-form-error is-hidden"></div>
    <div class="section-title">Track Sets</div>
    <div class="exercises-list">
      ${(day.exercises || []).map((ex) => `
        <div class="exercise-card">
          <div class="exercise-name">${ex.name}</div>
          <div class="day-exercise-count">Target: ${ex.sets} sets x ${ex.reps} reps</div>
          <div class="session-exercise-controls">
            <button type="button" class="session-cta-btn start-exercise-btn" data-ex-id="${ex.id}">
              ${appState.activeExerciseId === ex.id ? "Current Exercise" : "Start Exercise"}
            </button>
            ${ex.url ? `<button type="button" class="exercise-link-btn watch-session-video-btn" data-video-url="${ex.url}" data-ex-name="${ex.name}">Watch Tutorial</button>` : ""}
            <button type="button" class="exercise-link-btn last-session-sets-btn" data-ex-id="${ex.id}" data-ex-name="${ex.name}">Last Sets</button>
            <button type="button" class="exercise-link-btn delete-item-btn delete-session-ex-btn" data-ex-id="${ex.id}">Delete Exercise</button>
          </div>
          <div class="session-track-row exercise-track-row ${appState.activeExerciseId === ex.id ? "" : "is-hidden"}" id="track-row-${ex.id}">
            <input class="track-input" data-kind="reps" data-ex-id="${ex.id}" type="number" min="1" max="20" placeholder="Reps">
            <input class="track-input" data-kind="weight" data-ex-id="${ex.id}" type="number" min="1" step="0.5" placeholder="Weight">
            <button type="button" class="session-cta-btn track-set-btn" data-ex-id="${ex.id}" ${appState.activeExerciseId === ex.id ? "" : "disabled"}>Add Set</button>
          </div>
          <div class="progress-inline" id="set-progress-${ex.id}">Completed sets: ${appState.sessionProgress[ex.id]?.sets || 0}</div>
          <div class="progress-inline" id="last-set-${ex.id}"></div>
        </div>
      `).join("")}
      <button type="button" class="add-exercise-card add-exercise-card-btn" data-day-id="${day.id}">
        <span class="add-exercise-plus">+</span>
        <span>Add Exercise</span>
      </button>
    </div>
    <div class="section-title">Track Cardio</div>
    <div class="cardio-list">
      ${(day.cardio || []).map((c) => `
        <div class="cardio-card">
          <div class="cardio-info">
            <div class="cardio-name">${c.name}</div>
            <div class="session-track-row">
              <input class="track-input" data-kind="duration" data-cardio-id="${c.id}" type="number" min="1" placeholder="Minutes">
              <input class="track-input" data-kind="distance" data-cardio-id="${c.id}" type="number" min="0.1" step="0.1" placeholder="Km">
              <button type="button" class="session-cta-btn track-cardio-btn" data-cardio-id="${c.id}">Track Cardio</button>
              <button type="button" class="exercise-link-btn delete-item-btn delete-session-cardio-btn" data-cardio-id="${c.id}">Delete Cardio</button>
            </div>
            <button type="button" class="exercise-link-btn last-session-cardio-btn" data-cardio-id="${c.id}" data-cardio-name="${c.name}">Last Sessions</button>
            <div class="progress-inline" id="last-cardio-${c.id}"></div>
          </div>
        </div>
      `).join("")}
      <button type="button" class="add-exercise-card add-cardio-card add-cardio-card-btn" data-day-id="${day.id}">
        <span class="add-exercise-plus">+</span>
        <span>Add Cardio</span>
      </button>
    </div>
    <button type="button" id="end-session-btn" class="auth-submit-btn">End Session</button>
  `;
}

function bindExerciseTrackers(panel, day) {
  panel.querySelectorAll(".add-exercise-card-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await addExerciseToDay(day);
    });
  });

  panel.querySelectorAll(".start-exercise-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const exId = Number(btn.dataset.exId);
      appState.activeExerciseId = exId;
      panel.querySelectorAll(".exercise-track-row").forEach((row) => row.classList.add("is-hidden"));
      panel.querySelectorAll(".track-set-btn").forEach((setBtn) => {
        setBtn.disabled = Number(setBtn.dataset.exId) !== exId;
      });
      panel.querySelectorAll(".start-exercise-btn").forEach((startBtn) => {
        const isCurrent = Number(startBtn.dataset.exId) === exId;
        startBtn.textContent = isCurrent ? "Current Exercise" : "Start Exercise";
      });
      const activeRow = panel.querySelector(`#track-row-${exId}`);
      if (activeRow) activeRow.classList.remove("is-hidden");
    });
  });

  panel.querySelectorAll(".watch-session-video-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openVideoModal(btn.dataset.videoUrl, btn.dataset.exName || "Exercise tutorial");
    });
  });
  panel.querySelectorAll(".last-session-sets-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openLastSetsModal(Number(btn.dataset.exId), btn.dataset.exName || "Exercise");
    });
  });

  panel.querySelectorAll(".delete-session-ex-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const exId = Number(btn.dataset.exId);
      await deleteExerciseById(exId);
    });
  });

  panel.querySelectorAll(".track-set-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const exId = Number(btn.dataset.exId);
      const repsInput = panel.querySelector(`.track-input[data-kind="reps"][data-ex-id="${exId}"]`);
      const weightInput = panel.querySelector(`.track-input[data-kind="weight"][data-ex-id="${exId}"]`);
      const reps = Number(repsInput?.value || 0);
      const weight = Number(weightInput?.value || 0);
      if (!reps || !weight || !appState.activeSession) return;
      btn.disabled = true;
      clearSessionInlineError();
      appState.sessionProgress[exId] = appState.sessionProgress[exId] || { sets: 0 };
      appState.sessionProgress[exId].sets += 1;
      updateSetCounter(exId);
      try {
        await apiRequest("/track_set/", {
          method: "POST",
          body: JSON.stringify({
            workout_session: appState.activeSession.id,
            planned_exercise: exId,
            reps,
            set_number: appState.sessionProgress[exId].sets,
            current_weight: weight,
          }),
        });
        if (repsInput) repsInput.value = "";
        if (weightInput) weightInput.value = "";
      } catch (error) {
        appState.sessionProgress[exId].sets = Math.max(0, appState.sessionProgress[exId].sets - 1);
        updateSetCounter(exId);
        showSessionInlineError(error.message || "Set tracking failed.");
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function bindCardioTrackers(panel) {
  panel.querySelectorAll(".add-cardio-card-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await addCardioToDay(dayFromSelectedState());
    });
  });

  panel.querySelectorAll(".delete-session-cardio-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const cardioId = Number(btn.dataset.cardioId);
      await deleteCardioById(cardioId);
    });
  });

  panel.querySelectorAll(".last-session-cardio-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openLastCardioModal(Number(btn.dataset.cardioId), btn.dataset.cardioName || "Cardio");
    });
  });

  panel.querySelectorAll(".track-cardio-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const cardioId = Number(btn.dataset.cardioId);
      const durationInput = panel.querySelector(`.track-input[data-kind="duration"][data-cardio-id="${cardioId}"]`);
      const distanceInput = panel.querySelector(`.track-input[data-kind="distance"][data-cardio-id="${cardioId}"]`);
      const duration = Number(durationInput?.value || 0);
      const distance = Number(distanceInput?.value || 0);
      if (!duration || !distance || !appState.activeSession) return;
      btn.disabled = true;
      clearSessionInlineError();
      try {
        await apiRequest("/track_cardio/", {
          method: "POST",
          body: JSON.stringify({
            workout_session: appState.activeSession.id,
            planned_cardio: cardioId,
            duration_in_minutes: duration,
            distance_in_km: distance,
          }),
        });
        if (durationInput) durationInput.value = "";
        if (distanceInput) distanceInput.value = "";
        const lastNode = panel.querySelector(`#last-cardio-${cardioId}`);
        if (lastNode) lastNode.textContent = `Tracked now: ${duration} min · ${distance} km`;
      } catch (error) {
        showSessionInlineError(error.message || "Cardio tracking failed.");
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function bindDayMutationControls(panel, day) {
  panel.querySelector(".add-exercise-btn")?.addEventListener("click", async () => {
    await addExerciseToDay(day);
  });
  panel.querySelector(".add-cardio-btn")?.addEventListener("click", async () => {
    await addCardioToDay(day);
  });
  panel.querySelectorAll(".delete-day-ex-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await deleteExerciseById(Number(btn.dataset.exId));
    });
  });
  panel.querySelectorAll(".delete-day-cardio-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await deleteCardioById(Number(btn.dataset.cardioId));
    });
  });
}

async function ensureExerciseLibraryLoaded() {
  if (Array.isArray(appState.exerciseLibrary)) return;
  appState.exerciseLibrary = await apiRequest("/get_all_exercises/", { method: "GET" });
}

async function addExerciseToDay(day) {
  try {
    await ensureExerciseLibraryLoaded();
    const selection = await openExercisePickerModal(day);
    if (!selection) return;
    const { selectedExercise, sets, reps } = selection;
    const order = getNextOrder(day.exercises);
    await apiRequest("/add_exercise/", {
      method: "POST",
      body: JSON.stringify({
        workout_day: day.id,
        exercise: selectedExercise.id,
        reps,
        sets,
        order,
      }),
    });
    window.location.reload();
  } catch (error) {
    showDashboardError(error.message || "Could not add exercise.");
  }
}

async function addCardioToDay(day) {
  try {
    if (!day) throw new Error("No workout day selected.");
    await ensureExerciseLibraryLoaded();
    const selection = await openCardioPickerModal(day);
    if (!selection) return;
    const { selectedExercise, duration, distance } = selection;
    const order = getNextOrder(day.cardio);
    await apiRequest("/add_cardio/", {
      method: "POST",
      body: JSON.stringify({
        workout_day: day.id,
        exercise: selectedExercise.id,
        duration_in_minutes: duration,
        distance_in_km: distance,
        order,
      }),
    });
    window.location.reload();
  } catch (error) {
    showDashboardError(error.message || "Could not add cardio.");
  }
}

async function deleteExerciseById(exId) {
  const shouldDelete = await openConfirmDialog("Delete this exercise from the workout day?");
  if (!shouldDelete) return;
  try {
    await apiRequest(`/delete_exercise/${exId}/`, { method: "DELETE" });
    removeExerciseFromState(exId);
    rerenderCurrentPanels();
  } catch (error) {
    showSessionInlineError(error.message || "Could not delete exercise.");
    showDashboardError(error.message || "Could not delete exercise.");
  }
}

async function deleteCardioById(cardioId) {
  const shouldDelete = await openConfirmDialog("Delete this cardio item from the workout day?");
  if (!shouldDelete) return;
  try {
    await apiRequest(`/delete_cardio/${cardioId}/`, { method: "DELETE" });
    removeCardioFromState(cardioId);
    rerenderCurrentPanels();
  } catch (error) {
    showSessionInlineError(error.message || "Could not delete cardio.");
    showDashboardError(error.message || "Could not delete cardio.");
  }
}

function getNextOrder(list) {
  if (!Array.isArray(list) || list.length === 0) return 1;
  return Math.max(...list.map((item) => Number(item.order) || 0)) + 1;
}

function removeExerciseFromState(exId) {
  for (const day of workoutData.days || []) {
    const before = day.exercises?.length || 0;
    day.exercises = (day.exercises || []).filter((ex) => Number(ex.id) !== Number(exId));
    if (before !== day.exercises.length) {
      delete appState.sessionProgress[exId];
      if (Number(appState.activeExerciseId) === Number(exId)) {
        appState.activeExerciseId = day.exercises[0]?.id || null;
      }
      break;
    }
  }
}

function removeCardioFromState(cardioId) {
  for (const day of workoutData.days || []) {
    const before = day.cardio?.length || 0;
    day.cardio = (day.cardio || []).filter((item) => Number(item.id) !== Number(cardioId));
    if (before !== day.cardio.length) break;
  }
}

function rerenderCurrentPanels() {
  const currentDay = (workoutData.days || []).find((d) => d.id === appState.selectedDay);
  const dashboard = document.getElementById("workout-dashboard");
  if (dashboard) renderDashboard(dashboard);
  if (!currentDay) return;
  if (activeDayIndex !== null) {
    const panel = document.getElementById("exercise-panel");
    if (panel) {
      renderExercisePanel(panel, currentDay);
      panel.classList.add("visible");
    }
  }
  if (appState.activeSession && appState.activeSession.workout_day === currentDay.id) {
    openSessionPanel(currentDay);
  }
}

function inferDayMuscleGroups(day) {
  const fromExercises = (day.exercises || []).map((x) => (x.muscle || "").toLowerCase()).filter(Boolean);
  if (fromExercises.length > 0) return [...new Set(fromExercises)];
  const dayName = (day.dayName || "").toLowerCase();
  const map = {
    chest: ["chest"],
    back: ["back"],
    legs: ["leg"],
    leg: ["leg"],
    biceps: ["bicpe", "bicep"],
    triceps: ["tricpe", "tricep"],
    shoulders: ["shoulder"],
    shoulder: ["shoulder"],
    abs: ["abs"],
  };
  for (const key of Object.keys(map)) {
    if (dayName.includes(key)) return map[key];
  }
  return [];
}

function dayFromSelectedState() {
  return (workoutData.days || []).find((d) => d.id === appState.selectedDay) || null;
}

function openConfirmDialog(message) {
  return new Promise((resolve) => {
    const existing = document.getElementById("app-confirm-overlay");
    if (existing) existing.remove();
    const overlay = document.createElement("div");
    overlay.id = "app-confirm-overlay";
    overlay.className = "app-modal-overlay";
    overlay.innerHTML = `
      <div class="app-modal-card" role="dialog" aria-modal="true" aria-label="Confirm action">
        <h3 class="app-modal-title">Confirm Delete</h3>
        <p class="app-modal-text">${message}</p>
        <div class="app-modal-actions">
          <button type="button" class="session-cta-btn" id="app-confirm-cancel">Cancel</button>
          <button type="button" class="session-cta-btn delete-item-btn" id="app-confirm-ok">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const cleanup = (value) => {
      overlay.remove();
      resolve(value);
    };
    overlay.querySelector("#app-confirm-cancel")?.addEventListener("click", () => cleanup(false));
    overlay.querySelector("#app-confirm-ok")?.addEventListener("click", () => cleanup(true));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) cleanup(false);
    });
  });
}

function openExercisePickerModal(day) {
  return new Promise((resolve) => {
    const existing = document.getElementById("exercise-picker-overlay");
    if (existing) existing.remove();

    const dayMuscles = inferDayMuscleGroups(day);
    const all = appState.exerciseLibrary.filter((x) => !x.is_cardio);
    const grouped = [...new Set(all.map((x) => (x.muscle_group || "").toLowerCase()).filter(Boolean))];
    const preferredGroup = dayMuscles[0] || grouped[0] || "";
    const groupOptions = grouped
      .map((g) => `<option value="${g}" ${g === preferredGroup ? "selected" : ""}>${muscleName(g)}</option>`)
      .join("");
    const initialExercises = all.filter((x) => (x.muscle_group || "").toLowerCase() === preferredGroup);
    const exerciseOptions = initialExercises
      .map((item) => `<option value="${item.id}">${item.name_of_exercise}</option>`)
      .join("");

    const overlay = document.createElement("div");
    overlay.id = "exercise-picker-overlay";
    overlay.className = "app-modal-overlay";
    overlay.innerHTML = `
      <div class="app-modal-card app-modal-wide" role="dialog" aria-modal="true" aria-label="Add exercise">
        <h3 class="app-modal-title">Add Exercise to ${day.dayName} Day</h3>
        <p class="app-modal-text">Choose a muscle group, then pick an exercise from the library.</p>
        <label class="app-modal-label" for="picker-muscle-group">Muscle Group</label>
        <select id="picker-muscle-group" class="track-input app-modal-input">${groupOptions}</select>
        <label class="app-modal-label" for="picker-exercise">Exercise</label>
        <select id="picker-exercise" class="track-input app-modal-input">${exerciseOptions}</select>
        <div class="app-modal-grid">
          <div>
            <label class="app-modal-label" for="picker-sets">Sets</label>
            <input id="picker-sets" class="track-input app-modal-input" type="number" min="1" max="20" value="3">
          </div>
          <div>
            <label class="app-modal-label" for="picker-reps">Reps</label>
            <input id="picker-reps" class="track-input app-modal-input" type="number" min="1" max="20" value="10">
          </div>
        </div>
        <div class="app-modal-actions">
          <button type="button" class="session-cta-btn" id="picker-cancel">Cancel</button>
          <button type="button" class="session-cta-btn" id="picker-add">Add Exercise</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const cleanup = (value) => {
      overlay.remove();
      resolve(value);
    };

    overlay.querySelector("#picker-cancel")?.addEventListener("click", () => cleanup(null));
    overlay.querySelector("#picker-muscle-group")?.addEventListener("change", (event) => {
      const selectedGroup = String(event.target.value || "").toLowerCase();
      const exercises = all.filter((x) => (x.muscle_group || "").toLowerCase() === selectedGroup);
      const exerciseSelect = overlay.querySelector("#picker-exercise");
      if (exerciseSelect) {
        exerciseSelect.innerHTML = exercises
          .map((item) => `<option value="${item.id}">${item.name_of_exercise}</option>`)
          .join("");
      }
    });
    overlay.querySelector("#picker-add")?.addEventListener("click", () => {
      const exId = Number(overlay.querySelector("#picker-exercise")?.value || 0);
      const sets = Number(overlay.querySelector("#picker-sets")?.value || 0);
      const reps = Number(overlay.querySelector("#picker-reps")?.value || 0);
      const selectedExercise = appState.exerciseLibrary.find((x) => Number(x.id) === exId);
      if (!selectedExercise) {
        showDashboardError("Please select a valid exercise.");
        return;
      }
      if (sets < 1 || sets > 20 || reps < 1 || reps > 20) {
        showDashboardError("Sets/Reps must be between 1 and 20.");
        return;
      }
      cleanup({ selectedExercise, sets, reps });
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) cleanup(null);
    });
  });
}

function openCardioPickerModal(day) {
  return new Promise((resolve) => {
    const existing = document.getElementById("cardio-picker-overlay");
    if (existing) existing.remove();
    const options = appState.exerciseLibrary
      .filter((x) => x.is_cardio)
      .map((item) => `<option value="${item.id}">${item.name_of_exercise}</option>`)
      .join("");

    const overlay = document.createElement("div");
    overlay.id = "cardio-picker-overlay";
    overlay.className = "app-modal-overlay";
    overlay.innerHTML = `
      <div class="app-modal-card app-modal-wide" role="dialog" aria-modal="true" aria-label="Add cardio">
        <h3 class="app-modal-title">Add Cardio to ${day.dayName} Day</h3>
        <label class="app-modal-label" for="picker-cardio">Cardio Exercise</label>
        <select id="picker-cardio" class="track-input app-modal-input">${options}</select>
        <div class="app-modal-grid">
          <div>
            <label class="app-modal-label" for="picker-duration">Duration (min)</label>
            <input id="picker-duration" class="track-input app-modal-input" type="number" min="1" value="20">
          </div>
          <div>
            <label class="app-modal-label" for="picker-distance">Distance (km)</label>
            <input id="picker-distance" class="track-input app-modal-input" type="number" min="0.1" step="0.1" value="3">
          </div>
        </div>
        <div class="app-modal-actions">
          <button type="button" class="session-cta-btn" id="cardio-cancel">Cancel</button>
          <button type="button" class="session-cta-btn" id="cardio-add">Add Cardio</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const cleanup = (value) => {
      overlay.remove();
      resolve(value);
    };
    overlay.querySelector("#cardio-cancel")?.addEventListener("click", () => cleanup(null));
    overlay.querySelector("#cardio-add")?.addEventListener("click", () => {
      const cardioId = Number(overlay.querySelector("#picker-cardio")?.value || 0);
      const duration = Number(overlay.querySelector("#picker-duration")?.value || 0);
      const distance = Number(overlay.querySelector("#picker-distance")?.value || 0);
      const selectedExercise = appState.exerciseLibrary.find((x) => Number(x.id) === cardioId);
      if (!selectedExercise) return;
      cleanup({ selectedExercise, duration, distance });
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) cleanup(null);
    });
  });
}

async function openLastSetsModal(exerciseId, exerciseName) {
  const existing = document.getElementById("last-sets-overlay");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "last-sets-overlay";
  overlay.className = "app-modal-overlay";
  overlay.innerHTML = `
    <div class="app-modal-card app-modal-wide" role="dialog" aria-modal="true" aria-label="Last sets">
      <div class="video-modal-header">
        <h3 class="app-modal-title">Last Sets • ${exerciseName}</h3>
        <button type="button" class="panel-close-btn" id="last-sets-close" aria-label="Close">✕</button>
      </div>
      <div id="last-sets-content" class="last-sets-list">
        <div class="app-modal-text">Loading...</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#last-sets-close")?.addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) overlay.remove();
  });

  try {
    const result = await apiRequest(`/last_tracked_sets/${exerciseId}/5/`, { method: "GET" });
    const sets = result.data || [];
    const content = overlay.querySelector("#last-sets-content");
    if (!content) return;
    if (!sets.length) {
      content.innerHTML = `<div class="app-modal-text">No tracked sets yet for this exercise.</div>`;
      return;
    }
    content.innerHTML = sets
      .map((set) => `
        <div class="last-set-row">
          <span class="last-set-chip">Set ${set.set_number ?? "-"}</span>
          <span>${set.reps ?? "-"} reps</span>
          <span>${set.current_weight ?? "-"} kg</span>
        </div>
      `)
      .join("");
  } catch (error) {
    const content = overlay.querySelector("#last-sets-content");
    if (content) content.innerHTML = `<div class="app-modal-text">${error.message || "Could not load last sets."}</div>`;
  }
}

async function openLastCardioModal(cardioId, cardioName) {
  const existing = document.getElementById("last-cardio-overlay");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "last-cardio-overlay";
  overlay.className = "app-modal-overlay";
  overlay.innerHTML = `
    <div class="app-modal-card app-modal-wide" role="dialog" aria-modal="true" aria-label="Last sessions">
      <div class="video-modal-header">
        <h3 class="app-modal-title">Last Sessions • ${cardioName}</h3>
        <button type="button" class="panel-close-btn" id="last-cardio-close" aria-label="Close">✕</button>
      </div>
      <div id="last-cardio-content" class="last-sets-list">
        <div class="app-modal-text">Loading...</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#last-cardio-close")?.addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) overlay.remove();
  });

  try {
    const result = await apiRequest(`/last_tracked_cardio/${cardioId}/5/`, { method: "GET" });
    const sessions = result.data || [];
    const content = overlay.querySelector("#last-cardio-content");
    if (!content) return;
    if (!sessions.length) {
      content.innerHTML = `<div class="app-modal-text">No tracked sessions yet for this cardio.</div>`;
      return;
    }
    content.innerHTML = sessions
      .map((session) => `
        <div class="last-set-row">
          <span class="last-set-chip">Session</span>
          <span>${session.duration_in_minutes ?? "-"} min</span>
          <span>${session.distance_in_km ?? "-"} km</span>
        </div>
      `)
      .join("");
  } catch (error) {
    const content = overlay.querySelector("#last-cardio-content");
    if (content) content.innerHTML = `<div class="app-modal-text">${error.message || "Could not load last cardio sessions."}</div>`;
  }
}

async function endSession() {
  if (!appState.activeSession) return;
  try {
    await apiRequest("/end_session/", {
      method: "PUT",
      body: JSON.stringify({ id: appState.activeSession.id }),
    });
    appState.activeSession = null;
    appState.selectedDay = null;
    appState.sessionProgress = {};
    const panel = document.getElementById("session-panel");
    if (panel) panel.classList.remove("visible");
    updateActiveSessionUI();
  } catch (error) {
    showSessionInlineError(error.message || "Could not end session.");
  }
}

async function loadProgressContext(panel, day) {
  for (const ex of day.exercises || []) {
    try {
      const result = await apiRequest(`/last_tracked_sets/${ex.id}/1/`, { method: "GET" });
      const last = (result.data || [])[0];
      const node = panel.querySelector(`#last-set-${ex.id}`);
      if (node && last) node.textContent = `Last: ${last.set_number || "-"} x ${last.reps || "-"} @ ${last.current_weight || "-"}kg`;
    } catch (_error) {}
  }
  for (const c of day.cardio || []) {
    try {
      const result = await apiRequest(`/last_tracked_cardio/${c.id}/1/`, { method: "GET" });
      const last = (result.data || [])[0];
      const node = panel.querySelector(`#last-cardio-${c.id}`);
      if (node && last) node.textContent = `Last: ${last.duration_in_minutes || "-"} min · ${last.distance_in_km || "-"} km`;
    } catch (_error) {}
  }
}

function updateSetCounter(exerciseId) {
  const el = document.getElementById(`set-progress-${exerciseId}`);
  if (!el) return;
  const count = appState.sessionProgress[exerciseId]?.sets || 0;
  el.textContent = `Completed sets: ${count}`;
}

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
  usernameInput?.addEventListener("input", () => {
    clearFieldError("field-username", "err-username");
    clearFormError("login-form-error");
  });
  passwordInput?.addEventListener("input", () => {
    clearFieldError("field-password", "err-password");
    clearFormError("login-form-error");
  });

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
    clearFormError("register-form-error");
  });

  // Clear errors on input
  usernameInput?.addEventListener("input", () => {
    clearFieldError("field-reg-username", "err-reg-username");
    clearFormError("register-form-error");
  });
  emailInput?.addEventListener("input", () => {
    clearFieldError("field-reg-email", "err-reg-email");
    clearFormError("register-form-error");
  });
  confirmInput?.addEventListener("input", () => {
    confirmInput.dataset.touched = "1";
    validateConfirm();
    clearFormError("register-form-error");
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

function getCsrfToken() {
  const cookies = document.cookie.split(";").map((part) => part.trim());
  const match = cookies.find((part) => part.startsWith("csrftoken="));
  return match ? decodeURIComponent(match.split("=")[1]) : "";
}

async function apiRequest(url, options = {}) {
  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken(),
      ...(options.headers || {}),
    },
    credentials: "same-origin",
    body: options.body,
  };
  if (config.method === "GET") delete config.body;
  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractErrorMessage(data));
  }
  return data;
}

function extractErrorMessage(data) {
  if (!data) return "Request failed.";
  if (typeof data.message === "string") return data.message;
  if (typeof data.detail === "string") return data.detail;
  const firstKey = Object.keys(data)[0];
  if (!firstKey) return "Request failed.";
  const value = data[firstKey];
  if (Array.isArray(value)) return String(value[0]);
  if (typeof value === "string") return value;
  return "Request failed.";
}

function showDashboardError(message) {
  let node = document.getElementById("dashboard-inline-error");
  const dashboard = document.getElementById("workout-dashboard");
  if (!dashboard) return;
  if (!node) {
    node = document.createElement("div");
    node.id = "dashboard-inline-error";
    node.className = "auth-form-error";
    dashboard.prepend(node);
  }
  node.textContent = message;
  node.classList.remove("is-hidden");
}

function clearDashboardError() {
  const node = document.getElementById("dashboard-inline-error");
  if (!node) return;
  node.classList.add("is-hidden");
  node.textContent = "";
}

function showSessionInlineError(message) {
  const node = document.getElementById("session-inline-error");
  if (!node) return;
  node.textContent = message;
  node.classList.remove("is-hidden");
}

function clearSessionInlineError() {
  const node = document.getElementById("session-inline-error");
  if (!node) return;
  node.classList.add("is-hidden");
  node.textContent = "";
}

function clearFormError(id) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = "";
  node.classList.add("is-hidden");
}

function openVideoModal(url, title) {
  if (!url) return;
  const embedUrl = toEmbeddableVideoUrl(url);
  const existing = document.getElementById("video-modal-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "video-modal-overlay";
  overlay.className = "video-modal-overlay";
  overlay.innerHTML = `
    <div class="video-modal" role="dialog" aria-modal="true" aria-label="${title || "Exercise video"}">
      <div class="video-modal-header">
        <strong>${title || "Exercise tutorial"}</strong>
        <button type="button" class="panel-close-btn" id="video-modal-close" aria-label="Close video">✕</button>
      </div>
      <div class="video-frame-wrap">
        <iframe src="${embedUrl}" title="${title || "Exercise video"}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
      </div>
      <p class="video-help-text">If this video still cannot be embedded, the source provider has blocked in-app playback for that specific URL.</p>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) overlay.remove();
  });
  overlay.querySelector("#video-modal-close")?.addEventListener("click", () => overlay.remove());
}

function toEmbeddableVideoUrl(rawUrl) {
  try {
    const normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace("www.", "").toLowerCase();

    if (host === "youtu.be") {
      const shortId = parsed.pathname.split("/").filter(Boolean)[0];
      if (shortId) return `https://www.youtube-nocookie.com/embed/${shortId}`;
    }

    if (host.includes("youtube.com")) {
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const firstPart = pathParts[0] || "";

      if (firstPart === "watch") {
        const watchId = parsed.searchParams.get("v");
        if (watchId) return `https://www.youtube-nocookie.com/embed/${watchId}`;
      }

      if (firstPart === "shorts" || firstPart === "live" || firstPart === "embed" || firstPart === "v") {
        const pathId = pathParts[1];
        if (pathId) return `https://www.youtube-nocookie.com/embed/${pathId}`;
      }

      const directId = parsed.searchParams.get("v");
      if (directId) return `https://www.youtube-nocookie.com/embed/${directId}`;
    }

    return normalized;
  } catch (_error) {
    return rawUrl;
  }
}