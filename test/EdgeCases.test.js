/**
 * Edge Case Test Suite for Priority-Based Task Scheduler
 * 
 * Verifies:
 * 1. Empty Heap & 0-task profiles (graceful null returns)
 * 2. Past / Overdue deadlines (immediate emergency escalation to Root #0)
 * 3. Identical deadlines down to the millisecond (tie-breaking by priority, then FIFO createdAt)
 * 4. Multi-profile switching without state leakage or cross-contamination
 * 5. Single remaining element extractions and re-insertions
 */

import { TaskScheduler } from '../src/TaskScheduler.js';
import { Priority, Task } from '../src/Task.js';
import { ProfileManager } from '../src/ProfileManager.js';

class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store.hasOwnProperty(k) ? this.store[k] : null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

export function runEdgeCaseTests(assert) {
  console.log('\n--- Running Edge Case & Robustness Unit Tests ---');

  const BASE_TIME = 1700000000000;

  // Edge Case 1: Empty Profile & Graceful Null Handling
  {
    const scheduler = new TaskScheduler({ timeSource: BASE_TIME });
    assert.strictEqual(scheduler.size, 0, 'Size must be 0 for empty scheduler');
    assert.strictEqual(scheduler.isEmpty(), true, 'isEmpty() must be true');
    assert.strictEqual(scheduler.peekNextTask(), null, 'peek() on empty scheduler must return null gracefully');
    assert.strictEqual(scheduler.extractNextTask(), null, 'pop() on empty scheduler must return null gracefully');
    assert.strictEqual(scheduler.renderTree(), '(empty heap - root is null)', 'Tree rendering must report empty state');

    // Add and remove single task
    const task = scheduler.addTask({ title: 'Solo Task', deadline: BASE_TIME + 60000 });
    assert.strictEqual(scheduler.size, 1);
    assert.strictEqual(scheduler.peekNextTask().id, task.id);
    const popped = scheduler.extractNextTask();
    assert.strictEqual(popped.id, task.id);
    assert.strictEqual(scheduler.size, 0);
    assert.strictEqual(scheduler.peekNextTask(), null);
    console.log('  ✓ Edge Case 1: Completely empty heap and single-item lifecycle handled gracefully');
  }

  // Edge Case 2: Past / Overdue Deadlines Bubble to Root Immediately
  {
    const scheduler = new TaskScheduler({ timeSource: BASE_TIME });

    // Add upcoming task
    scheduler.addTask({
      title: 'Upcoming High Priority Task',
      priority: Priority.HIGH,
      deadline: BASE_TIME + 2 * 60 * 1000 // due in 2 mins
    });

    // Add task with deadline in the past (overdue by 10 minutes)
    const overdueTask = scheduler.addTask({
      title: 'Overdue Low Priority Task',
      priority: Priority.LOW,
      deadline: BASE_TIME - 10 * 60 * 1000 // 10 minutes AGO
    });

    assert.strictEqual(overdueTask.isOverdue(BASE_TIME), true, 'Task must be flagged as overdue');
    const root = scheduler.peekNextTask();
    assert.strictEqual(root.id, overdueTask.id, 'Overdue task must immediately bubble to index 0 over upcoming task');
    assert(root.getTimeRemaining(BASE_TIME) < 0, 'Time remaining must be negative');
    console.log('  ✓ Edge Case 2: Past/Overdue deadline correctly bubbles to index 0 (Root)');
  }

  // Edge Case 3: Identical Deadlines (Millisecond Precision)
  {
    const scheduler = new TaskScheduler({ timeSource: BASE_TIME });
    const exactDeadline = BASE_TIME + 30 * 60 * 1000;

    // Three tasks with identical deadline but different priorities
    scheduler.addTask({ title: 'Task Low', priority: Priority.LOW, deadline: exactDeadline });
    scheduler.addTask({ title: 'Task Med', priority: Priority.MEDIUM, deadline: exactDeadline });
    scheduler.addTask({ title: 'Task High', priority: Priority.HIGH, deadline: exactDeadline });

    assert.strictEqual(scheduler.pop().title, 'Task High', 'High must win on identical deadlines');
    assert.strictEqual(scheduler.pop().title, 'Task Med', 'Medium must come second');
    assert.strictEqual(scheduler.pop().title, 'Task Low', 'Low must come third');

    // Two tasks with identical priority AND identical deadline: FIFO createdAt tie-breaker
    const fifoScheduler = new TaskScheduler({ timeSource: BASE_TIME });
    fifoScheduler.addTask({ title: 'First Created', priority: Priority.HIGH, deadline: exactDeadline, createdAt: 1000 });
    fifoScheduler.addTask({ title: 'Second Created', priority: Priority.HIGH, deadline: exactDeadline, createdAt: 2000 });

    assert.strictEqual(fifoScheduler.pop().title, 'First Created', 'FIFO ordering must break ties on identical priority & deadline');
    assert.strictEqual(fifoScheduler.pop().title, 'Second Created');
    console.log('  ✓ Edge Case 3: Identical deadlines resolved via priority, then deterministic FIFO');
  }

  // Edge Case 4: Multiple Profiles Without Cross-Contamination
  {
    const storage = new MockStorage();
    const manager = new ProfileManager(storage);
    const scheduler = new TaskScheduler({ timeSource: BASE_TIME });

    // Profile 1: Work (3 tasks)
    const prof1 = manager.createProfile('Work', [
      { title: 'Work Task 1', priority: Priority.HIGH, deadline: BASE_TIME + 1000 },
      { title: 'Work Task 2', priority: Priority.MEDIUM, deadline: BASE_TIME + 2000 }
    ]);

    // Profile 2: Clean Empty Profile (0 tasks)
    const prof2 = manager.createProfile('EmptyPersonal', []);

    // Verify Profile 2 is completely empty
    manager.rehydrateScheduler(prof2.id, scheduler);
    assert.strictEqual(scheduler.size, 0, 'Empty profile must rehydrate with 0 tasks');
    assert.strictEqual(scheduler.peekNextTask(), null);

    // Switch back to Profile 1
    manager.rehydrateScheduler(prof1.id, scheduler);
    assert.strictEqual(scheduler.size, 2, 'Work profile must rehydrate with its 2 tasks');
    assert.strictEqual(scheduler.peekNextTask().title, 'Work Task 1');

    // Mutate Profile 1 by popping a task
    scheduler.extractNextTask();
    manager.saveTasksForProfile(prof1.id, scheduler.heap.toArray());

    // Switch to Profile 2 again
    manager.rehydrateScheduler(prof2.id, scheduler);
    assert.strictEqual(scheduler.size, 0, 'Empty profile remains 0 (no cross-contamination)');

    // Add 1 task to Profile 2
    scheduler.addTask({ title: 'Personal Chore', priority: Priority.LOW, deadline: BASE_TIME + 5000 });
    manager.saveTasksForProfile(prof2.id, scheduler.heap.toArray());

    // Switch back to Profile 1: should have exactly 1 task remaining
    manager.rehydrateScheduler(prof1.id, scheduler);
    assert.strictEqual(scheduler.size, 1);
    assert.strictEqual(scheduler.peekNextTask().title, 'Work Task 2');
    console.log('  ✓ Edge Case 4: Zero cross-contamination between empty and active profiles');
  }
}
