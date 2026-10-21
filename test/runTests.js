import assert from 'node:assert';
import { runMinHeapTests } from './MinHeap.test.js';
import { runSchedulerTests } from './Scheduler.test.js';
import { runProfileManagerTests } from './ProfileManager.test.js';
import { runEdgeCaseTests } from './EdgeCases.test.js';

console.log('========================================================');
console.log('🚀 RUNNING TASK SCHEDULER & MIN-HEAP TEST SUITE');
console.log('========================================================');

let passed = true;

try {
  runMinHeapTests(assert);
  runSchedulerTests(assert);
  runProfileManagerTests(assert);
  runEdgeCaseTests(assert);
  console.log('\n========================================================');
  console.log('✅ ALL TEST SUITES PASSED SUCCESSFULLY!');
  console.log('========================================================\n');
} catch (error) {
  passed = false;
  console.error('\n❌ TEST FAILURE:');
  console.error(error);
  process.exit(1);
}
