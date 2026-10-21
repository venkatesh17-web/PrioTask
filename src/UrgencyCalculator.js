/**
 * ============================================================================
 * ADAPTIVE URGENCY SCORING ALGORITHM & MIN-HEAP COMPARATOR
 * ============================================================================
 * 
 * VIVA & PRESENTATION QUICK-REFERENCE:
 * ----------------------------------------------------------------------------
 * 1. THE SCHEDULING DILEMMA:
 *    A standard priority queue only considers static priority (High/Med/Low),
 *    causing low-priority tasks with imminent deadlines to starve.
 *    Conversely, Earliest Deadline First (EDF) ignores priority weight entirely.
 *    Our algorithm dynamically harmonizes BOTH dimensions into a single
 *    Urgency Score.
 * 
 * 2. MATHEMATICAL FORMULATION:
 *    Let:
 *      W_priority = User-assigned weight (HIGH = 3, MEDIUM = 2, LOW = 1)
 *      T_remaining = task.deadline - currentTime (ms)
 *      m = T_remaining / (60 * 1000) (minutes remaining)
 * 
 *    CASE A: UPCOMING TASKS (m > 0)
 *    ------------------------------
 *                 W_priority * 1,000
 *      Score = -----------------------
 *                     m + 15
 * 
 *      VIVA EXPLANATION OF CONSTANTS:
 *      - Denominator (m + 15): As the deadline nears (m -> 0), the score
 *        hyperbolically surges towards (W * 1000 / 15) = 200 * W.
 *      - Smoothing Constant (+15 mins): Eliminates division-by-zero singularities
 *        and allows a low-priority task due in 2 minutes to naturally outrank
 *        a high-priority task due in 6 hours.
 * 
 *    CASE B: OVERDUE TASKS (m <= 0)
 *    ------------------------------
 *      Score = 10,000 + (|m| * 50 * W_priority)
 * 
 *      VIVA EXPLANATION OF OVERDUE LOGIC:
 *      - Strict Dominance: Base score 10,000 guarantees ANY overdue task
 *        strictly outranks ALL upcoming tasks (whose maximum score is < 1,000).
 *      - Priority Scaled Growth: An overdue HIGH task gains 150 points/minute,
 *        surpassing an overdue LOW task (50 points/minute) overdue by the same time.
 * 
 * 3. MIN-HEAP COMPARATOR MAPPING:
 *    - In our MinHeap, element `a` sits above `b` when `comparator(a, b) < 0`.
 *    - To place the MOST urgent task (highest UrgencyScore) at Root [Index 0]:
 *        comparator(taskA, taskB) = scoreB - scoreA
 *      When scoreA > scoreB, (scoreB - scoreA) is negative -> taskA bubbles to Root!
 * 
 * 4. DETERMINISTIC TIE-BREAKING:
 *    If two tasks have identical urgency scores:
 *      1. Earliest absolute deadline wins.
 *      2. FIFO ordering: Task created earlier (smaller `createdAt`) wins.
 * ============================================================================
 */

import { PRIORITY_WEIGHTS, Priority } from './Task.js';

export const URGENCY_CONFIG = {
  BASE_OVERDUE_SCORE: 10000,
  OVERDUE_GROWTH_RATE: 50, // Additional score points per overdue minute per priority weight
  UPCOMING_SCALE_FACTOR: 1000,
  SMOOTHING_MINUTES: 15 // Prevents division by near-zero and tunes priority vs proximity
};

/**
 * Calculates a numerical urgency score for a task at a given point in time.
 * Higher score indicates higher urgency / criticality.
 * 
 * @param {import('./Task.js').Task} task 
 * @param {number} [currentTime=Date.now()]
 * @param {typeof URGENCY_CONFIG} [config=URGENCY_CONFIG]
 * @returns {number} Urgency score
 */
export function calculateUrgencyScore(task, currentTime = Date.now(), config = URGENCY_CONFIG) {
  const timeRemainingMs = task.deadline - currentTime;
  const timeRemainingMinutes = timeRemainingMs / (1000 * 60);
  const priorityWeight = PRIORITY_WEIGHTS[task.priority] || 1;

  if (timeRemainingMinutes <= 0) {
    // Task is overdue - critical emergency
    const overdueMinutes = Math.abs(timeRemainingMinutes);
    return (
      config.BASE_OVERDUE_SCORE +
      overdueMinutes * config.OVERDUE_GROWTH_RATE * priorityWeight
    );
  }

  // Task is upcoming - hyperbolic urgency curve scaled by priority
  return (
    (priorityWeight * config.UPCOMING_SCALE_FACTOR) /
    (timeRemainingMinutes + config.SMOOTHING_MINUTES)
  );
}

/**
 * Calculates the Effective Virtual Deadline (EDF variant with priority bonus).
 * Shifts the deadline backwards based on priority weight.
 * Lower effective deadline = more urgent.
 * 
 * @param {import('./Task.js').Task} task 
 * @param {number} [priorityBonusMs=60 * 60 * 1000] // 1 hour per priority weight point
 * @returns {number} Virtual deadline timestamp in ms
 */
export function calculateEffectiveDeadline(task, priorityBonusMs = 60 * 60 * 1000) {
  const priorityWeight = PRIORITY_WEIGHTS[task.priority] || 1;
  return task.deadline - priorityWeight * priorityBonusMs;
}

/**
 * Creates a comparator function for the MinHeap.
 * 
 * Returns:
 *   < 0 : if taskA is MORE critical than taskB (taskA bubbles towards root / Index 0)
 *   > 0 : if taskB is MORE critical than taskA (taskB bubbles towards root / Index 0)
 *   = 0 : if both tasks are equally critical
 * 
 * @param {Function|number} [timeSource=Date.now] - Function returning current time ms, or static timestamp
 * @param {typeof URGENCY_CONFIG} [config=URGENCY_CONFIG]
 * @returns {(a: import('./Task.js').Task, b: import('./Task.js').Task) => number}
 */
export function createTaskComparator(timeSource = Date.now, config = URGENCY_CONFIG) {
  return function compareTasks(taskA, taskB) {
    const currentTime = typeof timeSource === 'function' ? timeSource() : timeSource;

    const scoreA = calculateUrgencyScore(taskA, currentTime, config);
    const scoreB = calculateUrgencyScore(taskB, currentTime, config);

    // Primary Ordering: Urgency score difference
    const scoreDiff = scoreB - scoreA;
    if (Math.abs(scoreDiff) > 1e-6) {
      // In MinHeap, returning negative means taskA is "smaller" (higher priority to be at root)
      // Since higher urgency score = more critical, scoreB - scoreA will be negative when scoreA > scoreB
      return scoreDiff;
    }

    // Tie-breaker 1: Task with earlier absolute deadline has precedence
    const deadlineDiff = taskA.deadline - taskB.deadline;
    if (deadlineDiff !== 0) {
      return deadlineDiff;
    }

    // Tie-breaker 2: FIFO ordering based on creation timestamp
    return taskA.createdAt - taskB.createdAt;
  };
}
