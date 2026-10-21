/**
 * Application Entry & UI Controller
 * Priority-Based Task Scheduler
 */

import { TaskScheduler } from './src/TaskScheduler.js';
import { Priority, PRIORITY_WEIGHTS } from './src/Task.js';
import { calculateUrgencyScore } from './src/UrgencyCalculator.js';
import { ProfileManager, generateDefaultTasks } from './src/ProfileManager.js';

// Global Application State
let profileManager;
let scheduler;
let activeProfile;
let simClockOffsetMs = 0; // Simulated time offset for fast-forward testing
let liveTickerInterval = null;
let currentSortOrder = 'urgency'; // 'urgency' | 'heap' | 'deadline'

// DOM Elements
const contentContainer = document.getElementById('content-container');
const modeDesktopBtn = document.getElementById('mode-desktop-btn');
const modeMobileBtn = document.getElementById('mode-mobile-btn');

const profileModalTrigger = document.getElementById('profile-modal-trigger');
const activeProfileAvatar = document.getElementById('active-profile-avatar');
const activeProfileName = document.getElementById('active-profile-name');

const heroCard = document.getElementById('hero-card');
const totalTaskCount = document.getElementById('total-task-count');
const taskListContainer = document.getElementById('task-list-container');
const taskViewOrder = document.getElementById('task-view-order');
const refreshUrgencyBtn = document.getElementById('refresh-urgency-btn');

const currentSimTimeText = document.getElementById('current-sim-time-text');
const simStatusChip = document.getElementById('sim-status-chip');
const timePlus15m = document.getElementById('time-plus-15m');
const timePlus1h = document.getElementById('time-plus-1h');
const timeResetNow = document.getElementById('time-reset-now');

const heapTreeView = document.getElementById('heap-tree-view');
const arrayIndicesStrip = document.getElementById('array-indices-strip');
const heapSizePill = document.getElementById('heap-size-pill');

// Modals
const addTaskModal = document.getElementById('add-task-modal');
const openAddTaskBtn = document.getElementById('open-add-task-btn');
const closeAddModal = document.getElementById('close-add-modal');
const cancelAddModal = document.getElementById('cancel-add-modal');
const addTaskForm = document.getElementById('add-task-form');
const taskTitleInput = document.getElementById('task-title-input');
const taskDescInput = document.getElementById('task-desc-input');
const taskDeadlineInput = document.getElementById('task-deadline-input');

const profileModal = document.getElementById('profile-modal');
const closeProfileModal = document.getElementById('close-profile-modal');
const profileListWrap = document.getElementById('profile-list-wrap');
const createProfileForm = document.getElementById('create-profile-form');
const newProfileNameInput = document.getElementById('new-profile-name-input');
const populateSampleTasksCheck = document.getElementById('populate-sample-tasks-check');

const toastContainer = document.getElementById('toast-container');

/**
 * Returns current scheduler time (Real time + any simulation offset)
 */
function getSchedulerTime() {
  return Date.now() + simClockOffsetMs;
}

/**
 * Show a floating toast notification
 * @param {string} message 
 * @param {'info'|'success'|'danger'} type 
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'danger') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Format a Date to datetime-local input string YYYY-MM-DDTHH:mm
 */
function toDateTimeLocalString(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

/**
 * Priority badge HTML helper
 */
function renderPriorityBadge(priority) {
  const p = (priority || 'MEDIUM').toUpperCase();
  const cls = p === 'HIGH' ? 'priority-high' : p === 'LOW' ? 'priority-low' : 'priority-medium';
  return `<span class="priority-badge ${cls}"><span class="badge-dot"></span>${p}</span>`;
}

/**
 * Auto-Save current tasks to active profile in localStorage
 */
function autoSaveCurrentState() {
  if (!activeProfile || !scheduler) return;
  const tasksArray = scheduler.heap.toArray().map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    deadline: t.deadline,
    createdAt: t.createdAt,
    metadata: t.metadata || {}
  }));
  profileManager.saveTasksForProfile(activeProfile.id, tasksArray);
}

/**
 * Re-render the complete UI: Hero card, task queue, heap visualizer, clock
 */
function renderAll() {
  const now = getSchedulerTime();

  // 1. Update Clock
  const clockDate = new Date(now);
  currentSimTimeText.textContent = clockDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (simClockOffsetMs !== 0) {
    const diffMins = Math.round(simClockOffsetMs / 60000);
    simStatusChip.textContent = diffMins > 0 ? `+${diffMins}m Sim` : `${diffMins}m Sim`;
    simStatusChip.style.background = 'rgba(99, 102, 241, 0.15)';
    simStatusChip.style.color = 'var(--primary-start)';
  } else {
    simStatusChip.textContent = 'Live Time';
    simStatusChip.style.background = 'var(--bg-main)';
    simStatusChip.style.color = 'var(--text-body)';
  }

  // 2. Total task count
  totalTaskCount.textContent = scheduler.size;
  heapSizePill.textContent = `${scheduler.size} node${scheduler.size === 1 ? '' : 's'}`;

  // 3. Render Hero Card: Most Urgent Task (O(1) peek)
  const rootTask = scheduler.peekNextTask();

  if (!rootTask) {
    heroCard.innerHTML = `
      <div class="hero-empty" id="hero-empty-state">
        <div class="hero-empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3>All Caught Up!</h3>
        <p>No pending tasks in the min-heap. Add a new task or switch profiles to get started.</p>
        <button class="btn btn-primary btn-sm" style="margin-top: 1rem;" id="hero-add-task-inline-btn">+ Create Task</button>
      </div>
    `;
    const inlineAdd = document.getElementById('hero-add-task-inline-btn');
    if (inlineAdd) inlineAdd.addEventListener('click', openAddModalHandler);
  } else {
    const isOverdue = rootTask.isOverdue(now);
    const score = calculateUrgencyScore(rootTask, now).toFixed(1);
    const timeRemainingStr = rootTask.formatTimeRemaining(now);
    const deadlineDate = new Date(rootTask.deadline).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    heroCard.className = `hero-card ${isOverdue ? 'is-overdue pulse-urgent' : ''}`;
    heroCard.innerHTML = `
      <div class="hero-header">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span class="hero-badge-tag">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Most Urgent Task (O(1) Root)
          </span>
          <span class="hero-heap-index">Min-Heap Index [0]</span>
        </div>
        ${renderPriorityBadge(rootTask.priority)}
      </div>

      <h2 class="hero-title">${escapeHtml(rootTask.title)}</h2>
      <p class="hero-desc">${escapeHtml(rootTask.metadata?.description || 'No additional notes provided.')}</p>

      <div class="hero-metrics">
        <div class="metric-item">
          <span class="metric-label">Urgency Score</span>
          <span class="metric-value urgency-high">${score}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Status</span>
          <span class="metric-value ${isOverdue ? 'time-urgent' : ''}">${timeRemainingStr}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Deadline</span>
          <span class="metric-value">${deadlineDate}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Priority Weight</span>
          <span class="metric-value">${rootTask.priorityWeight} (${rootTask.priority})</span>
        </div>
      </div>

      <div class="hero-actions">
        <button class="btn btn-success" id="hero-pop-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Mark Completed &bull; Extract Min (O(log n))
        </button>
        <button class="btn btn-danger-outline btn-sm" id="hero-delete-btn">
          Delete
        </button>
      </div>
    `;

    document.getElementById('hero-pop-btn').addEventListener('click', handleExtractMin);
    document.getElementById('hero-delete-btn').addEventListener('click', () => handleDeleteTask(rootTask.id));
  }

  // 4. Render Task Queue
  renderTaskQueue(now);

  // 5. Render Min-Heap Visualizer (Tree & Array)
  renderHeapVisualizer(now);
}

/**
 * Render the scheduled task queue cards
 */
function renderTaskQueue(now) {
  taskListContainer.innerHTML = '';

  const rawHeapArray = scheduler.heap.toArray();
  if (rawHeapArray.length === 0) {
    taskListContainer.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle); color: var(--text-muted);">
        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">📋</div>
        <div style="font-weight: 600; color: var(--text-heading); margin-bottom: 0.25rem;">Queue is currently empty</div>
        <p style="font-size: 0.82rem; margin-bottom: 1rem;">No tasks scheduled in this profile. Add a task to populate the min-heap.</p>
        <button class="btn btn-secondary btn-sm" id="queue-empty-add-btn">+ Add Your First Task</button>
      </div>
    `;
    const emptyBtn = document.getElementById('queue-empty-add-btn');
    if (emptyBtn) emptyBtn.addEventListener('click', openAddModalHandler);
    return;
  }

  // Map with metrics and original heap index
  let tasksWithMetrics = rawHeapArray.map((task, heapIndex) => {
    const score = calculateUrgencyScore(task, now);
    return {
      task,
      heapIndex,
      score,
      isOverdue: task.isOverdue(now),
      timeText: task.formatTimeRemaining(now),
      deadlineDate: new Date(task.deadline).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  });

  // Apply sorting filter
  if (currentSortOrder === 'urgency') {
    // Highest urgency score first
    tasksWithMetrics.sort((a, b) => b.score - a.score);
  } else if (currentSortOrder === 'heap') {
    // Exact index in min-heap array
    tasksWithMetrics.sort((a, b) => a.heapIndex - b.heapIndex);
  } else if (currentSortOrder === 'deadline') {
    // Earliest deadline first
    tasksWithMetrics.sort((a, b) => a.task.deadline - b.task.deadline);
  }

  tasksWithMetrics.forEach((item) => {
    const { task, heapIndex, score, isOverdue, timeText, deadlineDate } = item;
    const isRoot = heapIndex === 0;

    const card = document.createElement('div');
    card.className = `task-card ${isRoot ? 'is-root' : ''} ${isOverdue ? 'is-overdue' : ''}`;
    card.innerHTML = `
      <div class="task-main">
        <div class="task-meta-top">
          <span class="heap-index-badge">Heap #${heapIndex}${isRoot ? ' (Root)' : ''}</span>
          ${renderPriorityBadge(task.priority)}
          <span class="urgency-score-chip">Urgency: ${score.toFixed(1)}</span>
        </div>
        <div class="task-title-text">${escapeHtml(task.title)}</div>
        ${task.metadata?.description ? `<div class="task-desc-text">${escapeHtml(task.metadata.description)}</div>` : ''}
        <div class="task-timing-row">
          <div class="timing-item ${isOverdue ? 'urgent-text' : ''}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${timeText}</span>
          </div>
          <div class="timing-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Due ${deadlineDate}</span>
          </div>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-secondary btn-sm" data-action="complete" data-id="${task.id}" title="Complete task">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button class="btn btn-secondary btn-sm" data-action="delete" data-id="${task.id}" title="Delete task">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;

    card.querySelector('[data-action="complete"]').addEventListener('click', () => handleCompleteTask(task.id));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => handleDeleteTask(task.id));

    taskListContainer.appendChild(card);
  });
}

/**
 * Render Min-Heap ASCII Tree and Array strip
 */
function renderHeapVisualizer(now) {
  if (scheduler.isEmpty()) {
    heapTreeView.textContent = '(empty heap)';
    arrayIndicesStrip.innerHTML = '<span style="font-size: 0.72rem; color: var(--text-muted);">No elements</span>';
    return;
  }

  // ASCII Tree
  heapTreeView.textContent = scheduler.renderTree();

  // Array indices
  const arr = scheduler.heap.toArray();
  arrayIndicesStrip.innerHTML = '';
  arr.forEach((task, idx) => {
    const isRoot = idx === 0;
    const pill = document.createElement('div');
    pill.className = `array-node-pill ${isRoot ? 'is-root' : ''}`;
    pill.innerHTML = `
      <div class="array-node-index">[#${idx}]</div>
      <div class="array-node-val" title="${escapeHtml(task.title)}">${escapeHtml(task.title.substring(0, 8))}..</div>
    `;
    arrayIndicesStrip.appendChild(pill);
  });
}

/**
 * Complete & Pop root task (Extract-Min O(log n))
 */
function handleExtractMin() {
  if (scheduler.isEmpty()) {
    showToast('No pending tasks to extract!', 'info');
    return;
  }
  const popped = scheduler.extractNextTask();
  autoSaveCurrentState();
  renderAll();
  showToast(`Completed most urgent task: "${popped.title}"! Next urgent task bubbled to root.`, 'success');
}

/**
 * Complete arbitrary task by ID
 */
function handleCompleteTask(taskId) {
  const index = scheduler.heap.heap.findIndex((t) => t.id === taskId);
  if (index === -1) return;

  const task = scheduler.heap.heap[index];
  if (index === 0) {
    handleExtractMin();
    return;
  }

  // Remove from internal array and restore heap
  scheduler.heap.heap.splice(index, 1);
  scheduler.heap.rebuildHeap();
  autoSaveCurrentState();
  renderAll();
  showToast(`Completed "${task.title}"`, 'success');
}

/**
 * Delete task by ID
 */
function handleDeleteTask(taskId) {
  const index = scheduler.heap.heap.findIndex((t) => t.id === taskId);
  if (index === -1) return;

  const task = scheduler.heap.heap[index];
  scheduler.heap.heap.splice(index, 1);
  scheduler.heap.rebuildHeap();
  autoSaveCurrentState();
  renderAll();
  showToast(`Removed task "${task.title}"`, 'info');
}

/**
 * Open Add Task modal
 */
function openAddModalHandler() {
  addTaskForm.reset();
  // Set default deadline to 1 hour from now
  const defaultDate = new Date(getSchedulerTime() + 60 * 60 * 1000);
  taskDeadlineInput.value = toDateTimeLocalString(defaultDate);
  addTaskModal.classList.add('open');
  taskTitleInput.focus();
}

/**
 * Close Add Task modal
 */
function closeAddModalHandler() {
  addTaskModal.classList.remove('open');
}

/**
 * Handle Add Task Form Submit
 */
function handleAddTaskSubmit(e) {
  e.preventDefault();

  const title = taskTitleInput.value.trim();
  const description = taskDescInput.value.trim();
  const priority = (addTaskForm.elements['priority'].value || Priority.MEDIUM).toUpperCase();
  const deadlineValue = taskDeadlineInput.value;

  if (!title) {
    showToast('Please enter a task title', 'danger');
    return;
  }

  if (!deadlineValue) {
    showToast('Please select a deadline', 'danger');
    return;
  }

  const deadlineTimestamp = new Date(deadlineValue).getTime();

  // Add task to scheduler (O(log n) heapifyUp)
  const newTask = scheduler.addTask({
    title,
    priority,
    deadline: deadlineTimestamp,
    metadata: { description }
  });

  autoSaveCurrentState();
  closeAddModalHandler();
  renderAll();

  const isRootNow = scheduler.peekNextTask().id === newTask.id;
  if (isRootNow) {
    showToast(`Task added and immediately bubbled to Root [#0] due to high urgency!`, 'success');
  } else {
    showToast(`Task scheduled: "${newTask.title}" (${newTask.priority})`, 'info');
  }
}

/**
 * Open Profile Switcher Modal
 */
function openProfileModalHandler() {
  renderProfileList();
  profileModal.classList.add('open');
}

/**
 * Close Profile Modal
 */
function closeProfileModalHandler() {
  profileModal.classList.remove('open');
}

/**
 * Render Profiles list in Profile Modal
 */
function renderProfileList() {
  profileListWrap.innerHTML = '';
  const profiles = profileManager.getProfiles();
  const activeId = profileManager.getActiveProfileId();

  profiles.forEach((p) => {
    const isActive = p.id === activeId;
    const savedTasks = profileManager.loadTasksForProfile(p.id);

    const item = document.createElement('div');
    item.className = `profile-card-item ${isActive ? 'active-profile' : ''}`;
    item.innerHTML = `
      <div class="profile-info-left">
        <div class="profile-avatar">${escapeHtml(p.name.charAt(0).toUpperCase())}</div>
        <div>
          <div style="font-weight: 700; color: var(--text-heading); font-size: 0.95rem;">
            ${escapeHtml(p.name)} ${isActive ? '<span style="font-size: 0.72rem; color: var(--primary-start); font-weight: normal;">(Active)</span>' : ''}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            ${savedTasks.length} task${savedTasks.length === 1 ? '' : 's'} in isolated storage &bull; Key: <code>${profileManager.getStorageKeyForProfile(p.id)}</code>
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 0.4rem; align-items: center;">
        ${!isActive ? `<button class="btn btn-secondary btn-sm" data-action="switch" data-id="${p.id}">Switch</button>` : '<span class="preset-chip" style="color: var(--primary-start);">Current</span>'}
        ${profiles.length > 1 ? `<button class="btn btn-danger-outline btn-sm" data-action="delete" data-id="${p.id}" title="Delete profile">&times;</button>` : ''}
      </div>
    `;

    const switchBtn = item.querySelector('[data-action="switch"]');
    if (switchBtn) {
      switchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        switchActiveProfile(p.id);
      });
    }

    const delBtn = item.querySelector('[data-action="delete"]');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete profile "${p.name}" and remove all its stored tasks?`)) {
          profileManager.deleteProfile(p.id);
          renderProfileList();
          switchActiveProfile(profileManager.getActiveProfileId());
          showToast(`Profile "${p.name}" deleted`, 'info');
        }
      });
    }

    item.addEventListener('click', () => {
      if (!isActive) switchActiveProfile(p.id);
    });

    profileListWrap.appendChild(item);
  });
}

/**
 * Switch Active Profile and rehydrate state
 */
function switchActiveProfile(profileId) {
  profileManager.setActiveProfileId(profileId);
  activeProfile = profileManager.getActiveProfile();

  activeProfileAvatar.textContent = activeProfile.name.charAt(0).toUpperCase();
  activeProfileName.textContent = activeProfile.name;

  // Rehydrate MinHeap from isolated localStorage
  const count = profileManager.rehydrateScheduler(profileId, scheduler);

  closeProfileModalHandler();
  renderAll();
  showToast(`Switched to profile: ${activeProfile.name} (${count} tasks rehydrated)`, 'info');
}

/**
 * Create a new Profile
 */
function handleCreateProfile(e) {
  e.preventDefault();
  const name = newProfileNameInput.value.trim();
  if (!name) return;

  const shouldPopulate = populateSampleTasksCheck.checked;
  const initialTasks = shouldPopulate ? generateDefaultTasks() : [];

  const newProfile = profileManager.createProfile(name, initialTasks);
  newProfileNameInput.value = '';

  switchActiveProfile(newProfile.id);
  showToast(`Created profile "${newProfile.name}" with ${initialTasks.length} initial tasks`, 'success');
}

/**
 * Setup preset buttons in Add Task modal
 */
function setupPresetChips() {
  document.querySelectorAll('.preset-chip[data-offset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const offsetMinutes = parseInt(btn.getAttribute('data-offset'), 10);
      const targetTime = getSchedulerTime() + offsetMinutes * 60 * 1000;
      taskDeadlineInput.value = toDateTimeLocalString(new Date(targetTime));
    });
  });
}

/**
 * Setup simulation clock buttons
 */
function setupSimulationControls() {
  timePlus15m.addEventListener('click', () => {
    simClockOffsetMs += 15 * 60 * 1000;
    scheduler.refresh();
    renderAll();
    showToast('Simulated clock advanced by +15 minutes', 'info');
  });

  timePlus1h.addEventListener('click', () => {
    simClockOffsetMs += 60 * 60 * 1000;
    scheduler.refresh();
    renderAll();
    showToast('Simulated clock advanced by +1 hour', 'info');
  });

  timeResetNow.addEventListener('click', () => {
    simClockOffsetMs = 0;
    scheduler.refresh();
    renderAll();
    showToast('Simulated clock reset to real-world time', 'info');
  });
}

/**
 * Setup Viewport Mode Switcher (Desktop vs Mobile Simulation Frame)
 */
function setupViewportSwitcher() {
  modeDesktopBtn.addEventListener('click', () => {
    modeDesktopBtn.classList.add('active');
    modeMobileBtn.classList.remove('active');
    contentContainer.classList.remove('mobile-frame-view');
  });

  modeMobileBtn.addEventListener('click', () => {
    modeMobileBtn.classList.add('active');
    modeDesktopBtn.classList.remove('active');
    contentContainer.classList.add('mobile-frame-view');
  });
}

/**
 * Helper to escape HTML to prevent XSS
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Application Bootstrap
 */
function init() {
  // 1. Initialize Profile Manager with browser localStorage
  profileManager = new ProfileManager(window.localStorage);

  // 2. Initialize Task Scheduler linked to dynamic scheduler time
  scheduler = new TaskScheduler({
    timeSource: () => getSchedulerTime()
  });

  // 3. Load or create initial active profile
  activeProfile = profileManager.getActiveProfile();
  activeProfileAvatar.textContent = activeProfile.name.charAt(0).toUpperCase();
  activeProfileName.textContent = activeProfile.name;

  // 4. Rehydrate scheduler from profile's isolated localStorage
  profileManager.rehydrateScheduler(activeProfile.id, scheduler);

  // 5. Setup event listeners
  openAddTaskBtn.addEventListener('click', openAddModalHandler);
  closeAddModal.addEventListener('click', closeAddModalHandler);
  cancelAddModal.addEventListener('click', closeAddModalHandler);
  addTaskForm.addEventListener('submit', handleAddTaskSubmit);

  profileModalTrigger.addEventListener('click', openProfileModalHandler);
  closeProfileModal.addEventListener('click', closeProfileModalHandler);
  createProfileForm.addEventListener('submit', handleCreateProfile);

  // Sort Filter
  taskViewOrder.addEventListener('change', (e) => {
    currentSortOrder = e.target.value;
    renderAll();
  });

  // Re-heapify / refresh button
  refreshUrgencyBtn.addEventListener('click', () => {
    scheduler.refresh();
    renderAll();
    showToast('Re-evaluated all urgency scores and rebuilt heap structure.', 'info');
  });

  // Click outside modal to close
  window.addEventListener('click', (e) => {
    if (e.target === addTaskModal) closeAddModalHandler();
    if (e.target === profileModal) closeProfileModalHandler();
  });

  // Setup additional interactive controls
  setupPresetChips();
  setupSimulationControls();
  setupViewportSwitcher();

  // 6. Initial Render
  renderAll();

  // 7. Live ticker: updates countdown every second without re-rendering everything unnecessarily
  liveTickerInterval = setInterval(() => {
    renderAll();
  }, 2000);
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
