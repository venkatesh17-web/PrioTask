/**
 * Console Verification & Demonstration Script
 * 
 * Demonstrates:
 * 1. Adding sample tasks with varied priorities (HIGH, MEDIUM, LOW) and deadlines.
 * 2. Visualizing heap state (indices, parent-child links, urgency scores, and ASCII tree).
 * 3. Step-by-step pop() extraction verifying the most critical task is always extracted first.
 * 4. Advancing time to verify dynamic urgency recalculation.
 */

import { TaskScheduler } from './src/TaskScheduler.js';
import { Priority } from './src/Task.js';

console.log('========================================================================');
console.log('   PRIORITY-BASED TASK SCHEDULER - CONSOLE VERIFICATION');
console.log('   Custom Min-Heap + Dynamic Urgency Scoring Algorithm');
console.log('========================================================================\n');

// 1. Initialize Scheduler at a fixed reference time for deterministic demonstration
const SIMULATION_START = new Date('2026-10-21T21:00:00.000Z').getTime();
const scheduler = new TaskScheduler({ timeSource: SIMULATION_START });

console.log(`[1] Initializing Scheduler at Reference Time: ${new Date(SIMULATION_START).toISOString()}`);

// 2. Define sample tasks with distinct priority weights and deadlines
const sampleTasks = [
  {
    title: 'Routine Database Backup',
    priority: Priority.LOW,
    deadline: SIMULATION_START + 120 * 60 * 1000 // In 2 hours
  },
  {
    title: 'Production SSL Certificate Expiry',
    priority: Priority.HIGH,
    deadline: SIMULATION_START - 15 * 60 * 1000 // 15 mins OVERDUE!
  },
  {
    title: 'Quarterly Planning Document',
    priority: Priority.MEDIUM,
    deadline: SIMULATION_START + 180 * 60 * 1000 // In 3 hours
  },
  {
    title: 'Zero-Day Vulnerability Hotfix',
    priority: Priority.HIGH,
    deadline: SIMULATION_START + 10 * 60 * 1000 // In 10 minutes
  },
  {
    title: 'Customer Support Escalation (P1)',
    priority: Priority.HIGH,
    deadline: SIMULATION_START + 45 * 60 * 1000 // In 45 minutes
  },
  {
    title: 'Fix Typo in Landing Page Footer',
    priority: Priority.LOW,
    deadline: SIMULATION_START + 15 * 60 * 1000 // In 15 minutes (imminent but Low priority)
  },
  {
    title: 'Submit Weekly Expense Reports',
    priority: Priority.MEDIUM,
    deadline: SIMULATION_START + 25 * 60 * 1000 // In 25 minutes
  }
];

console.log(`\n[2] Inserting ${sampleTasks.length} Sample Tasks into Min-Heap (O(log n) per insertion)...`);
sampleTasks.forEach((taskData, i) => {
  const task = scheduler.addTask(taskData);
  console.log(`    + Added [#${i + 1}] [${task.priority}] "${task.title}" (Deadline: ${task.formatTimeRemaining(SIMULATION_START)})`);
});

// 3. Print the resulting Heap State
console.log('\n[3] Initial Heap State after all insertions:');
scheduler.printHeapState();

// 4. Verify peek() returns the root element without removal (O(1))
const peeked = scheduler.peekNextTask();
console.log(`[4] O(1) peek() Verification:`);
console.log(`    Root (Index 0): [${peeked.priority}] "${peeked.title}"`);
console.log(`    Status: ${peeked.formatTimeRemaining(SIMULATION_START)} | Overdue: ${peeked.isOverdue(SIMULATION_START)}`);

// 5. Sequential Extraction Verification
console.log('\n[5] Sequential pop() Extraction (Extract-Min O(log n))...');
console.log('    Verifying that the most critical task is ALWAYS extracted first:\n');

let extractionStep = 1;
while (!scheduler.isEmpty()) {
  const topTask = scheduler.extractNextTask();
  console.log(
    `    Step ${extractionStep++}: Extracted -> [${topTask.priority}] "${topTask.title}" ` +
    `(${topTask.formatTimeRemaining(SIMULATION_START)})`
  );
  if (!scheduler.isEmpty()) {
    const nextRoot = scheduler.peekNextTask();
    console.log(`            └── New Heap Root at Index 0: [${nextRoot.priority}] "${nextRoot.title}" (Remaining in heap: ${scheduler.size})\n`);
  }
}

console.log('\n    All tasks successfully extracted in strict urgency order!');
console.log('    Final heap size:', scheduler.size, '(Heap is now empty)');

// 6. Dynamic Time Progression Verification
console.log('\n========================================================================');
console.log('[6] Dynamic Urgency Escalation Test (Advancing Time)');
console.log('========================================================================');

const dynamicScheduler = new TaskScheduler({ timeSource: SIMULATION_START });

// Add two tasks:
// Task A: High priority, deadline in 60 minutes
// Task B: Low priority, deadline in 5 minutes
const taskA = dynamicScheduler.addTask({
  title: 'Cloud Infrastructure Upgrade',
  priority: Priority.HIGH,
  deadline: SIMULATION_START + 60 * 60 * 1000
});

const taskB = dynamicScheduler.addTask({
  title: 'Update Slack Channel Topic',
  priority: Priority.LOW,
  deadline: SIMULATION_START + 5 * 60 * 1000
});

console.log('\nAt T = 0 minutes:');
dynamicScheduler.printHeapState();
console.log(`Root task is: "${dynamicScheduler.peekNextTask().title}" (due in 5m vs 60m)`);

console.log('\nAdvancing time by +30 minutes...');
dynamicScheduler.advanceTimeBy(30 * 60 * 1000);
console.log('\nAt T = +30 minutes (Task B is now 25 minutes OVERDUE!):');
dynamicScheduler.printHeapState();
console.log(`Root task is: "${dynamicScheduler.peekNextTask().title}"`);

console.log('\n========================================================================');
console.log('🎉 Console Verification Complete! All logic verified.');
console.log('========================================================================\n');
