import { TaskScheduler } from '../src/TaskScheduler.js';
import { Priority } from '../src/Task.js';

export function runSchedulerTests(assert) {
  console.log('\n--- Running TaskScheduler & Urgency Scoring Unit Tests ---');

  const BASE_TIME = 1700000000000; // Static simulation reference timestamp (ms)

  // Test 1: Priority dominance when deadlines are identical
  {
    const scheduler = new TaskScheduler({ timeSource: BASE_TIME });
    const deadline = BASE_TIME + 60 * 60 * 1000; // 1 hour in future

    scheduler.addTask({ title: 'Low Priority Task', priority: Priority.LOW, deadline });
    scheduler.addTask({ title: 'High Priority Task', priority: Priority.HIGH, deadline });
    scheduler.addTask({ title: 'Medium Priority Task', priority: Priority.MEDIUM, deadline });

    assert.strictEqual(scheduler.peekNextTask().priority, Priority.HIGH, 'Root must be HIGH priority');

    const first = scheduler.pop();
    const second = scheduler.pop();
    const third = scheduler.pop();

    assert.strictEqual(first.priority, Priority.HIGH, '1st extracted must be HIGH');
    assert.strictEqual(second.priority, Priority.MEDIUM, '2nd extracted must be MEDIUM');
    assert.strictEqual(third.priority, Priority.LOW, '3rd extracted must be LOW');
    console.log('  ✓ Test 1: Priority ordering (HIGH -> MEDIUM -> LOW) holds for identical deadlines');
  }

  // Test 2: Deadline proximity dominance when priorities are identical
  {
    const scheduler = new TaskScheduler({ timeSource: BASE_TIME });

    scheduler.addTask({ title: 'Due in 2 hours', priority: Priority.HIGH, deadline: BASE_TIME + 120 * 60 * 1000 });
    scheduler.addTask({ title: 'Due in 10 minutes', priority: Priority.HIGH, deadline: BASE_TIME + 10 * 60 * 1000 });
    scheduler.addTask({ title: 'Due in 45 minutes', priority: Priority.HIGH, deadline: BASE_TIME + 45 * 60 * 1000 });

    assert.strictEqual(scheduler.peekNextTask().title, 'Due in 10 minutes', 'Most imminent task must be root');

    assert.strictEqual(scheduler.pop().title, 'Due in 10 minutes');
    assert.strictEqual(scheduler.pop().title, 'Due in 45 minutes');
    assert.strictEqual(scheduler.pop().title, 'Due in 2 hours');
    console.log('  ✓ Test 2: Imminent deadlines extract before distant deadlines with same priority');
  }

  // Test 3: Overdue tasks strictly dominate upcoming future tasks
  {
    const scheduler = new TaskScheduler({ timeSource: BASE_TIME });

    scheduler.addTask({ title: 'Upcoming High Priority', priority: Priority.HIGH, deadline: BASE_TIME + 5 * 60 * 1000 });
    scheduler.addTask({ title: 'Overdue Medium Priority', priority: Priority.MEDIUM, deadline: BASE_TIME - 10 * 60 * 1000 });
    scheduler.addTask({ title: 'Upcoming Low Priority', priority: Priority.LOW, deadline: BASE_TIME + 1 * 60 * 1000 });

    const root = scheduler.peekNextTask();
    assert.strictEqual(root.title, 'Overdue Medium Priority', 'Overdue task must immediately bubble to root (index 0)');

    const popped = scheduler.pop();
    assert.strictEqual(popped.title, 'Overdue Medium Priority');
    console.log('  ✓ Test 3: Overdue task bubbles to root over upcoming high-priority task');
  }

  // Test 4: Between two overdue tasks, priority and elapsed overdue time govern order
  {
    const scheduler = new TaskScheduler({ timeSource: BASE_TIME });

    scheduler.addTask({ title: 'Overdue Low (10m ago)', priority: Priority.LOW, deadline: BASE_TIME - 10 * 60 * 1000 });
    scheduler.addTask({ title: 'Overdue High (10m ago)', priority: Priority.HIGH, deadline: BASE_TIME - 10 * 60 * 1000 });

    assert.strictEqual(scheduler.pop().title, 'Overdue High (10m ago)', 'Overdue High must precede overdue Low with same elapsed time');
    assert.strictEqual(scheduler.pop().title, 'Overdue Low (10m ago)');
    console.log('  ✓ Test 4: Overdue tasks scale appropriately with priority weight');
  }

  // Test 5: Peek invariant (peek is always identical to the next pop)
  {
    const scheduler = new TaskScheduler({ timeSource: BASE_TIME });

    scheduler.addTask({ title: 'Task A', priority: Priority.MEDIUM, deadline: BASE_TIME + 20 * 60 * 1000 });
    scheduler.addTask({ title: 'Task B', priority: Priority.HIGH, deadline: BASE_TIME + 5 * 60 * 1000 });
    scheduler.addTask({ title: 'Task C', priority: Priority.LOW, deadline: BASE_TIME + 15 * 60 * 1000 });

    while (!scheduler.isEmpty()) {
      const peeked = scheduler.peekNextTask();
      const popped = scheduler.pop();
      assert.strictEqual(peeked, popped, 'peekNextTask() must reference the exact same task returned by pop()');
    }
    console.log('  ✓ Test 5: Peek consistency invariant verified across all extractions');
  }

  // Test 6: Advancing simulated time dynamically triggers heap re-adjustment
  {
    let currentTime = BASE_TIME;
    const scheduler = new TaskScheduler({ timeSource: () => currentTime });

    // Task X is Low priority, due in 5 minutes
    // Task Y is High priority, due in 60 minutes
    scheduler.addTask({ title: 'Task X (Low, 5m)', priority: Priority.LOW, deadline: BASE_TIME + 5 * 60 * 1000 });
    scheduler.addTask({ title: 'Task Y (High, 60m)', priority: Priority.HIGH, deadline: BASE_TIME + 60 * 60 * 1000 });

    // Initially at BASE_TIME:
    // Task X urgency: (1 * 1000) / (5 + 15) = 50.0
    // Task Y urgency: (3 * 1000) / (60 + 15) = 40.0
    // Task X is more urgent due to imminent deadline
    assert.strictEqual(scheduler.peekNextTask().title, 'Task X (Low, 5m)');

    // Now advance time by 10 minutes:
    // Task X is now 5 minutes OVERDUE!
    // Task X urgency explodes to 10000 + (5 * 50 * 1) = 10250
    currentTime += 10 * 60 * 1000;
    scheduler.refresh();

    assert.strictEqual(scheduler.peekNextTask().title, 'Task X (Low, 5m)');
    assert.strictEqual(scheduler.peekNextTask().isOverdue(currentTime), true);
    console.log('  ✓ Test 6: Advancing simulation time maintains correct dynamic priority');
  }
}
