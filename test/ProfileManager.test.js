import { ProfileManager, generateDefaultTasks } from '../src/ProfileManager.js';
import { TaskScheduler } from '../src/TaskScheduler.js';
import { Priority } from '../src/Task.js';

/**
 * Mock localStorage implementation for Node.js unit testing
 */
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store.hasOwnProperty(key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

export function runProfileManagerTests(assert) {
  console.log('\n--- Running ProfileManager & Zero-Cost Persistence Unit Tests ---');

  // Test 1: Auto-initializes default profile 'Venkatesh' with sample tasks
  {
    const storage = new MockLocalStorage();
    const manager = new ProfileManager(storage);

    const activeProfile = manager.getActiveProfile();
    assert.strictEqual(activeProfile.name, 'Venkatesh', 'Default profile should be Venkatesh');
    assert.strictEqual(activeProfile.id, 'venkatesh', 'Default profile ID should be venkatesh');

    const tasks = manager.loadTasksForProfile('venkatesh');
    assert(tasks.length >= 5, 'Should have pre-populated initial sample tasks');
    console.log('  ✓ Test 1: Default profile initialization with sample urgent tasks verified');
  }

  // Test 2: Isolated storage keys per profile
  {
    const storage = new MockLocalStorage();
    const manager = new ProfileManager(storage);

    manager.createProfile('Alice', [
      { title: 'Alice Task 1', priority: Priority.HIGH, deadline: Date.now() + 10000 }
    ]);
    manager.createProfile('Bob', [
      { title: 'Bob Task 1', priority: Priority.LOW, deadline: Date.now() + 50000 },
      { title: 'Bob Task 2', priority: Priority.MEDIUM, deadline: Date.now() + 80000 }
    ]);

    assert.strictEqual(manager.getStorageKeyForProfile('alice'), 'tasks_profile_alice');
    assert.strictEqual(manager.getStorageKeyForProfile('bob'), 'tasks_profile_bob');

    const aliceTasks = manager.loadTasksForProfile('alice');
    const bobTasks = manager.loadTasksForProfile('bob');

    assert.strictEqual(aliceTasks.length, 1, 'Alice tasks must be isolated');
    assert.strictEqual(bobTasks.length, 2, 'Bob tasks must be isolated');
    assert.strictEqual(aliceTasks[0].title, 'Alice Task 1');
    assert.strictEqual(bobTasks[0].title, 'Bob Task 1');
    console.log('  ✓ Test 2: Isolated storage keys (tasks_profile_<id>) preserve data boundaries');
  }

  // Test 3: State Rehydration into TaskScheduler
  {
    const storage = new MockLocalStorage();
    const manager = new ProfileManager(storage);
    const scheduler = new TaskScheduler();

    manager.createProfile('DevOps');
    const rehydratedCount = manager.rehydrateScheduler('devops', scheduler);

    assert(rehydratedCount > 0, 'Rehydration should load tasks into scheduler');
    assert.strictEqual(scheduler.size, rehydratedCount, 'Scheduler size must match rehydrated count');
    assert(scheduler.peekNextTask() !== null, 'Scheduler must have a root task ready for O(1) peek');
    console.log('  ✓ Test 3: State rehydration successfully reconstructs functional MinHeap instance');
  }

  // Test 4: Switching profiles and auto-saving modifications
  {
    const storage = new MockLocalStorage();
    const manager = new ProfileManager(storage);
    const scheduler = new TaskScheduler();

    const p1 = manager.createProfile('Team Alpha');
    const p2 = manager.createProfile('Team Beta');

    // Add task to Team Alpha
    manager.setActiveProfileId(p1.id);
    manager.rehydrateScheduler(p1.id, scheduler);
    scheduler.addTask({ title: 'Alpha Urgent Deploy', priority: Priority.HIGH, deadline: Date.now() + 5000 });
    // Save updated array
    manager.saveTasksForProfile(p1.id, scheduler.heap.toArray());

    // Switch to Team Beta
    manager.setActiveProfileId(p2.id);
    manager.rehydrateScheduler(p2.id, scheduler);
    const betaInitialSize = scheduler.size;

    // Switch back to Team Alpha and verify state rehydration
    manager.setActiveProfileId(p1.id);
    manager.rehydrateScheduler(p1.id, scheduler);
    const found = scheduler.heap.toArray().some((t) => t.title === 'Alpha Urgent Deploy');
    assert.strictEqual(found, true, 'Task added to Team Alpha must persist across profile switches');
    console.log('  ✓ Test 4: Profile switching and state persistence verified');
  }
}
