/**
 * Task Model and Priority Enums
 */

export const Priority = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
});

export const PRIORITY_WEIGHTS = Object.freeze({
  [Priority.HIGH]: 3,
  [Priority.MEDIUM]: 2,
  [Priority.LOW]: 1
});

export class Task {
  /**
   * @param {Object} options
   * @param {string} [options.id] - Unique task identifier
   * @param {string} options.title - Task title or description
   * @param {string} [options.priority='MEDIUM'] - 'HIGH', 'MEDIUM', or 'LOW'
   * @param {number|Date|string} options.deadline - Deadline timestamp or Date string
   * @param {number} [options.createdAt=Date.now()] - Timestamp when task was registered
   * @param {Object} [options.metadata={}] - Optional custom metadata
   */
  constructor({
    id,
    title,
    priority = Priority.MEDIUM,
    deadline,
    createdAt = Date.now(),
    metadata = {}
  }) {
    if (!title || typeof title !== 'string') {
      throw new Error('Task title must be a non-empty string');
    }

    const normalizedPriority = String(priority).toUpperCase();
    if (!PRIORITY_WEIGHTS[normalizedPriority]) {
      throw new Error(`Invalid priority: "${priority}". Allowed: HIGH, MEDIUM, LOW`);
    }

    const parsedDeadline = deadline instanceof Date
      ? deadline.getTime()
      : typeof deadline === 'string'
        ? new Date(deadline).getTime()
        : Number(deadline);

    if (isNaN(parsedDeadline)) {
      throw new Error(`Invalid deadline timestamp: ${deadline}`);
    }

    this.id = id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.title = title;
    this.priority = normalizedPriority;
    this.deadline = parsedDeadline;
    this.createdAt = createdAt;
    this.metadata = metadata;
  }

  /**
   * Weight corresponding to user-assigned priority
   * @returns {number}
   */
  get priorityWeight() {
    return PRIORITY_WEIGHTS[this.priority] || 1;
  }

  /**
   * Milliseconds remaining until deadline relative to a given timestamp
   * @param {number} [currentTime=Date.now()] 
   * @returns {number} Negative if overdue
   */
  getTimeRemaining(currentTime = Date.now()) {
    return this.deadline - currentTime;
  }

  /**
   * Check if task is overdue at given timestamp
   * @param {number} [currentTime=Date.now()] 
   * @returns {boolean}
   */
  isOverdue(currentTime = Date.now()) {
    return this.getTimeRemaining(currentTime) < 0;
  }

  /**
   * Human readable description of time remaining / overdue status
   * @param {number} [currentTime=Date.now()] 
   * @returns {string}
   */
  formatTimeRemaining(currentTime = Date.now()) {
    const diffMs = this.getTimeRemaining(currentTime);
    const isPast = diffMs < 0;
    const absSeconds = Math.round(Math.abs(diffMs) / 1000);
    const minutes = Math.floor(absSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSecs = absSeconds % 60;

    let timeStr = '';
    if (hours > 0) {
      timeStr = `${hours}h ${remainingMinutes}m`;
    } else if (minutes > 0) {
      timeStr = `${minutes}m ${remainingSecs}s`;
    } else {
      timeStr = `${absSeconds}s`;
    }

    return isPast ? `OVERDUE by ${timeStr}` : `in ${timeStr}`;
  }

  /**
   * String representation of task
   * @returns {string}
   */
  toString() {
    return `[${this.priority}] "${this.title}" (Deadline: ${new Date(this.deadline).toISOString()})`;
  }
}
