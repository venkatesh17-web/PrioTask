/**
 * Priority-Based Task Scheduler
 * Integrates custom Min-Heap with dynamic Urgency Scoring algorithm.
 */

import { MinHeap } from './MinHeap.js';
import { Task, Priority } from './Task.js';
import { calculateUrgencyScore, createTaskComparator, URGENCY_CONFIG } from './UrgencyCalculator.js';

export class TaskScheduler {
  /**
   * @param {Object} [options]
   * @param {Function|number} [options.timeSource=Date.now] - Function or static timestamp for time
   * @param {typeof URGENCY_CONFIG} [options.urgencyConfig]
   */
  constructor(options = {}) {
    this._timeSource = options.timeSource || (() => Date.now());
    this.urgencyConfig = options.urgencyConfig || URGENCY_CONFIG;

    this.comparator = createTaskComparator(() => this.getCurrentTime(), this.urgencyConfig);
    this.heap = new MinHeap(this.comparator);
  }

  /**
   * Get the current scheduler time in ms
   * @returns {number}
   */
  getCurrentTime() {
    return typeof this._timeSource === 'function' ? this._timeSource() : this._timeSource;
  }

  /**
   * Set dynamic time source or advance simulated clock
   * @param {Function|number} timeSource 
   */
  setTimeSource(timeSource) {
    this._timeSource = timeSource;
    this.refresh();
  }

  /**
   * Advance simulated clock by milliseconds
   * @param {number} ms 
   */
  advanceTimeBy(ms) {
    const current = this.getCurrentTime();
    this.setTimeSource(current + ms);
  }

  /**
   * Number of pending tasks in scheduler
   * @returns {number}
   */
  get size() {
    return this.heap.size;
  }

  /**
   * Check if scheduler has any pending tasks
   * @returns {boolean}
   */
  isEmpty() {
    return this.heap.isEmpty();
  }

  /**
   * Add a task to the scheduler.
   * Bubbles the task up to its correct position in O(log n) time.
   * 
   * @param {Object|Task} taskData 
   * @returns {Task} The scheduled task instance
   */
  addTask(taskData) {
    const task = taskData instanceof Task ? taskData : new Task(taskData);
    this.heap.push(task);
    return task;
  }

  /**
   * View the most urgent task (root at index 0) without removing it.
   * Time Complexity: O(1)
   * @returns {Task | null}
   */
  peekNextTask() {
    return this.heap.peek();
  }

  /**
   * Extract and return the most urgent task (root at index 0).
   * Restores heap property in O(log n) time.
   * Time Complexity: O(log n)
   * @returns {Task | null}
   */
  extractNextTask() {
    return this.heap.pop();
  }

  /**
   * Alias for extractNextTask
   * @returns {Task | null}
   */
  pop() {
    return this.extractNextTask();
  }

  /**
   * Re-evaluates urgency scores for all pending tasks and rebuilds the heap.
   * Run periodically or when time jumps significantly.
   * Time Complexity: O(n)
   */
  refresh() {
    this.heap.rebuildHeap();
  }

  /**
   * Return array of all tasks with their computed metrics at current time
   * @returns {Array<Object>}
   */
  getHeapState() {
    const now = this.getCurrentTime();
    return this.heap.toArray().map((task, index) => {
      const urgencyScore = calculateUrgencyScore(task, now, this.urgencyConfig);
      const parentIdx = this.heap.getParentIndex(index);
      return {
        index,
        id: task.id,
        title: task.title,
        priority: task.priority,
        weight: task.priorityWeight,
        deadline: new Date(task.deadline).toISOString(),
        timeRemainingText: task.formatTimeRemaining(now),
        isOverdue: task.isOverdue(now),
        urgencyScore: Number(urgencyScore.toFixed(2)),
        parentIndex: parentIdx >= 0 ? parentIdx : null,
        task
      };
    });
  }

  /**
   * Render a visual tree of the scheduler min-heap
   * @returns {string}
   */
  renderTree() {
    const now = this.getCurrentTime();
    return this.heap.toTreeString((task, index) => {
      const score = calculateUrgencyScore(task, now, this.urgencyConfig).toFixed(1);
      const remaining = task.formatTimeRemaining(now);
      return `[${task.priority}] "${task.title}" (Score: ${score}, ${remaining})`;
    });
  }

  /**
   * Print a formatted dashboard of the current heap state to console
   */
  printHeapState() {
    const state = this.getHeapState();
    const now = this.getCurrentTime();

    console.log(`\n=================== SCHEDULER HEAP STATE (${this.size} Tasks) ===================`);
    console.log(`Current Time: ${new Date(now).toISOString()}`);
    console.log(`Root / Index 0 Task: ${this.heap.peek() ? `"${this.heap.peek().title}"` : 'None'}\n`);

    if (state.length === 0) {
      console.log('Heap is empty.');
      console.log('========================================================================\n');
      return;
    }

    console.table(
      state.map((item) => ({
        Idx: item.index,
        Parent: item.parentIndex !== null ? item.parentIndex : '-',
        Title: item.title,
        Priority: item.priority,
        'Urgency Score': item.urgencyScore,
        'Time Remaining': item.timeRemainingText,
        Overdue: item.isOverdue ? 'YES' : 'NO'
      }))
    );

    console.log('\n--- Min-Heap Tree Topology ---');
    console.log(this.renderTree());
    console.log('========================================================================\n');
  }
}
