import { MinHeap } from '../src/MinHeap.js';

export function runMinHeapTests(assert) {
  console.log('\n--- Running MinHeap Unit Tests ---');

  // Test 1: Empty heap initialization
  {
    const heap = new MinHeap();
    assert.strictEqual(heap.size, 0, 'Initial heap size should be 0');
    assert.strictEqual(heap.isEmpty(), true, 'isEmpty() should return true for new heap');
    assert.strictEqual(heap.peek(), null, 'peek() on empty heap should return null');
    assert.strictEqual(heap.pop(), null, 'pop() on empty heap should return null');
    console.log('  ✓ Test 1: Empty heap behavior verified');
  }

  // Test 2: Single element heap
  {
    const heap = new MinHeap();
    heap.push(42);
    assert.strictEqual(heap.size, 1, 'Size should be 1 after push');
    assert.strictEqual(heap.isEmpty(), false, 'isEmpty() should be false');
    assert.strictEqual(heap.peek(), 42, 'peek() should return 42');
    const popped = heap.pop();
    assert.strictEqual(popped, 42, 'pop() should return 42');
    assert.strictEqual(heap.size, 0, 'Size should be 0 after pop');
    assert.strictEqual(heap.isEmpty(), true, 'isEmpty() should be true after popping only element');
    console.log('  ✓ Test 2: Single element push and pop verified');
  }

  // Test 3: Numerical Min-Heap sorting verification
  {
    const heap = new MinHeap();
    const input = [45, 12, 85, 32, 89, 39, 69, 22, 1, 99, 15];
    input.forEach((n) => heap.push(n));

    assert.strictEqual(heap.size, input.length, 'Heap size should match input length');
    assert.strictEqual(heap.peek(), 1, 'peek() should be the minimum element (1)');

    const extracted = [];
    while (!heap.isEmpty()) {
      extracted.push(heap.pop());
    }

    const expected = [...input].sort((a, b) => a - b);
    assert.deepStrictEqual(extracted, expected, 'Extracted elements must strictly match sorted order');
    console.log('  ✓ Test 3: Min-Heap extracts elements in sorted ascending order');
  }

  // Test 4: Heap invariant maintained at all nodes (parent <= children)
  {
    const heap = new MinHeap();
    const randomNumbers = Array.from({ length: 100 }, () => Math.floor(Math.random() * 1000));
    randomNumbers.forEach((n) => heap.push(n));

    const verifyHeapInvariant = (arr) => {
      for (let i = 0; i < arr.length; i++) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        if (left < arr.length) {
          assert(arr[i] <= arr[left], `Invariant failed at index ${i}: parent ${arr[i]} > left child ${arr[left]}`);
        }
        if (right < arr.length) {
          assert(arr[i] <= arr[right], `Invariant failed at index ${i}: parent ${arr[i]} > right child ${arr[right]}`);
        }
      }
    };

    verifyHeapInvariant(heap.toArray());

    // Extract half and verify invariant continues to hold
    for (let k = 0; k < 50; k++) {
      heap.pop();
      verifyHeapInvariant(heap.toArray());
    }
    console.log('  ✓ Test 4: Binary min-heap invariant holds across 100 insertions and 50 extractions');
  }

  // Test 5: Custom comparator (e.g. descending/max-heap behavior using MinHeap)
  {
    // A comparator where larger numbers have precedence: (a, b) => b - a
    const maxStyleHeap = new MinHeap((a, b) => b - a);
    [10, 50, 20, 90, 30].forEach((n) => maxStyleHeap.push(n));

    assert.strictEqual(maxStyleHeap.pop(), 90, 'Custom comparator root should be 90');
    assert.strictEqual(maxStyleHeap.pop(), 50, 'Next should be 50');
    assert.strictEqual(maxStyleHeap.pop(), 30, 'Next should be 30');
    console.log('  ✓ Test 5: Custom comparator flexibility verified');
  }
}
