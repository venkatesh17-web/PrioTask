/**
 * ============================================================================
 * CUSTOM BINARY MIN-HEAP DATA STRUCTURE (FROM SCRATCH)
 * ============================================================================
 * 
 * VIVA & PRESENTATION QUICK-REFERENCE:
 * ----------------------------------------------------------------------------
 * 1. WHAT IS A BINARY MIN-HEAP?
 *    A complete binary tree stored inside a flat array where every parent node
 *    is smaller than or equal to its children (Heap Property):
 *        Heap[Parent] <= Heap[LeftChild] AND Heap[Parent] <= Heap[RightChild]
 *    Consequently, the minimum (most urgent) element is ALWAYS at Index 0 (Root).
 * 
 * 2. ZERO-BASED ARRAY INDEXING ARITHMETIC:
 *    For any node at index `i`:
 *    - Parent Index:       Math.floor((i - 1) / 2)
 *    - Left Child Index:   (2 * i) + 1
 *    - Right Child Index:  (2 * i) + 2
 * 
 *    ASCII MAPPING OF BINARY TREE TO ARRAY SLOTS:
 *    ---------------------------------------------------------
 *                  [Index 0]                <- Root (Min Element)
 *                 /         \
 *          [Index 1]       [Index 2]        <- Level 1
 *           /     \         /     \
 *       [Idx 3] [Idx 4]  [Idx 5] [Idx 6]   <- Level 2
 *    ---------------------------------------------------------
 *    Array: [0, 1, 2, 3, 4, 5, 6]
 * 
 * 3. TIME COMPLEXITY GUARANTEES:
 *    - peek():       O(1)        - Immediate access to root (Index 0).
 *    - push(item):   O(log n)    - Append to array, bubble up at most tree height.
 *    - pop():        O(log n)    - Swap root with last element, bubble down.
 *    - rebuildHeap():O(n)        - Floyd's bottom-up algorithm across internal nodes.
 *    - Space:        O(n)        - Contiguous memory array with zero pointer overhead.
 * ============================================================================
 */

export class MinHeap {
  /**
   * Initializes a new generic Min-Heap instance.
   * 
   * @param {Function} [comparator] - Comparison function (a, b) => number.
   *   - Returns < 0 if `a` has higher priority (smaller value) than `b`.
   *   - Returns > 0 if `b` has higher priority (smaller value) than `a`.
   *   - Returns 0 if both items are equally prioritized.
   */
  constructor(comparator = (a, b) => (a < b ? -1 : a > b ? 1 : 0)) {
    /** @type {Array<any>} Internal contiguous array representing binary tree */
    this.heap = [];
    /** @type {Function} Priority comparator */
    this.comparator = comparator;
  }

  // ==========================================================================
  // Array Index Arithmetic (Viva Question: "How do you navigate nodes?")
  // ==========================================================================

  /**
   * Calculates the parent index of a child node.
   * Arithmetic: Math.floor((childIndex - 1) / 2)
   * Example: Left child at index 3 -> Math.floor(2 / 2) = 1 (Parent is at index 1)
   *          Right child at index 4 -> Math.floor(3 / 2) = 1 (Parent is at index 1)
   * 
   * @param {number} childIndex 
   * @returns {number}
   */
  getParentIndex(childIndex) {
    return Math.floor((childIndex - 1) / 2);
  }

  /**
   * Calculates the left child index of a parent node.
   * Arithmetic: 2 * parentIndex + 1
   * Example: Root at index 0 -> 2 * 0 + 1 = 1
   * 
   * @param {number} parentIndex 
   * @returns {number}
   */
  getLeftChildIndex(parentIndex) {
    return 2 * parentIndex + 1;
  }

  /**
   * Calculates the right child index of a parent node.
   * Arithmetic: 2 * parentIndex + 2
   * Example: Root at index 0 -> 2 * 0 + 2 = 2
   * 
   * @param {number} parentIndex 
   * @returns {number}
   */
  getRightChildIndex(parentIndex) {
    return 2 * parentIndex + 2;
  }

  /**
   * Checks if a node at `index` has a valid parent (all nodes except root index 0).
   * @param {number} index 
   * @returns {boolean}
   */
  hasParent(index) {
    return index > 0;
  }

  /**
   * Checks if a node has a valid left child within array bounds.
   * @param {number} index 
   * @returns {boolean}
   */
  hasLeftChild(index) {
    return this.getLeftChildIndex(index) < this.heap.length;
  }

  /**
   * Checks if a node has a valid right child within array bounds.
   * @param {number} index 
   * @returns {boolean}
   */
  hasRightChild(index) {
    return this.getRightChildIndex(index) < this.heap.length;
  }

  /**
   * Swaps elements in-place between two array indices.
   * Time Complexity: O(1)
   * 
   * @param {number} i 
   * @param {number} j 
   */
  swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  // ==========================================================================
  // Core Public API
  // ==========================================================================

  /**
   * Total number of elements currently stored in the heap.
   * @returns {number}
   */
  get size() {
    return this.heap.length;
  }

  /**
   * Returns true if the heap contains no elements.
   * @returns {boolean}
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Inspects the minimum element at the root (Index 0) without removing it.
   * 
   * VIVA POINT:
   * "Because the min-heap invariant ensures the smallest element is always at
   * index 0, peek() runs in strict O(1) constant time without traversal."
   * 
   * @returns {any | null} The root item or null if heap is empty.
   */
  peek() {
    if (this.isEmpty()) {
      return null;
    }
    return this.heap[0];
  }

  /**
   * Inserts a new element into the heap and restores the heap invariant.
   * 
   * VIVA POINT - O(log n) PUSH MECHANICS:
   * 1. Place the new element at the very end of the array (maintains completeness).
   * 2. Call `heapifyUp()` to bubble the element upwards by repeatedly comparing
   *    and swapping it with its parent.
   * 3. In the worst case, the element travels from a leaf node to the root,
   *    which takes at most tree height = ceil(log2(n + 1)) - 1 steps = O(log n).
   * 
   * @param {any} element - Item to schedule
   * @returns {number} New size of the heap
   */
  push(element) {
    this.heap.push(element);
    this.heapifyUp(this.heap.length - 1);
    return this.size;
  }

  /**
   * Extracts and returns the minimum element (root at Index 0).
   * 
   * VIVA POINT - O(log n) POP MECHANICS:
   * 1. If empty, return null gracefully.
   * 2. If only 1 element, simply pop and return it.
   * 3. Otherwise, save the root element (Index 0) to return.
   * 4. Move the LAST element in the array to Index 0 (preserves array structure).
   * 5. Call `heapifyDown()` from Index 0, repeatedly swapping with the smaller
   *    child until the min-heap property is fully restored.
   * 6. Takes at most 2 * tree height comparisons = O(log n).
   * 
   * @returns {any | null} The extracted root item or null if empty.
   */
  pop() {
    if (this.isEmpty()) {
      return null;
    }

    if (this.heap.length === 1) {
      return this.heap.pop();
    }

    const minElement = this.heap[0];
    // Move the last element to the root position and shrink the array
    this.heap[0] = this.heap.pop();
    // Restore the min-heap property by bubbling downwards from the root
    this.heapifyDown(0);

    return minElement;
  }

  // ==========================================================================
  // Heapify Algorithms (Heap Invariant Maintenance)
  // ==========================================================================

  /**
   * Bubbles an element upwards to restore the min-heap property.
   * Compares the element at `startIndex` with its parent. If the child is smaller
   * (higher priority), they swap positions, and the process repeats upwards.
   * 
   * Terminating conditions:
   * - Element reaches the root (index 0).
   * - Element is greater than or equal to its parent.
   * 
   * Time Complexity: O(log n)
   * 
   * @param {number} [startIndex=this.heap.length - 1] - Starting node index
   */
  heapifyUp(startIndex = this.heap.length - 1) {
    let currentIndex = startIndex;

    while (this.hasParent(currentIndex)) {
      const parentIndex = this.getParentIndex(currentIndex);

      // If child has higher precedence than parent (< 0), swap them
      if (this.comparator(this.heap[currentIndex], this.heap[parentIndex]) < 0) {
        this.swap(currentIndex, parentIndex);
        currentIndex = parentIndex;
      } else {
        // Heap property is satisfied; terminate early
        break;
      }
    }
  }

  /**
   * Bubbles an element downwards to restore the min-heap property.
   * Compares the parent node with its left and right children, identifying the
   * smallest among the three. If the smallest is a child, they swap, and the
   * process repeats downwards.
   * 
   * Terminating conditions:
   * - Node has no children (is a leaf node).
   * - Node is smaller than or equal to both of its children.
   * 
   * Time Complexity: O(log n)
   * 
   * @param {number} [startIndex=0] - Starting node index (typically root = 0)
   */
  heapifyDown(startIndex = 0) {
    let currentIndex = startIndex;

    // Continue as long as at least a left child exists
    while (this.hasLeftChild(currentIndex)) {
      let smallestChildIndex = this.getLeftChildIndex(currentIndex);
      const rightChildIndex = this.getRightChildIndex(currentIndex);

      // If right child exists, compare it with left child to find the absolute minimum child
      if (
        rightChildIndex < this.heap.length &&
        this.comparator(this.heap[rightChildIndex], this.heap[smallestChildIndex]) < 0
      ) {
        smallestChildIndex = rightChildIndex;
      }

      // If parent is already smaller than or equal to the smallest child, stop
      if (this.comparator(this.heap[currentIndex], this.heap[smallestChildIndex]) <= 0) {
        break;
      }

      // Otherwise, swap parent with smallest child and descend
      this.swap(currentIndex, smallestChildIndex);
      currentIndex = smallestChildIndex;
    }
  }

  /**
   * Rebuilds the entire heap in-place using Floyd's bottom-up algorithm.
   * 
   * VIVA POINT - WHY O(n) INSTEAD OF O(n log n)?
   * - Instead of inserting elements one-by-one from the top (which is O(n log n)),
   *   Floyd's algorithm starts from the lowest internal parent node:
   *     startIndex = Math.floor(n / 2) - 1
   *   and runs heapifyDown towards the root (index 0).
   * - Nodes near the bottom travel at most 1 level; nodes near the top travel more,
   *   forming the convergent geometric series:
   *     sum_{h=0}^{log n} (h / 2^h) <= 2  => Total comparisons <= 2n = O(n).
   * 
   * Time Complexity: O(n)
   */
  rebuildHeap() {
    if (this.heap.length <= 1) return;
    const lastParentIndex = Math.floor(this.heap.length / 2) - 1;
    for (let i = lastParentIndex; i >= 0; i--) {
      this.heapifyDown(i);
    }
  }

  /**
   * Dynamically change comparator function and re-heapify
   * @param {Function} newComparator 
   */
  setComparator(newComparator) {
    this.comparator = newComparator;
    this.rebuildHeap();
  }

  /**
   * Returns a shallow copy of the underlying array storage.
   * @returns {Array<any>}
   */
  toArray() {
    return [...this.heap];
  }

  /**
   * Clears all items from the heap.
   */
  clear() {
    this.heap = [];
  }

  // ==========================================================================
  // Visual Inspection & String Representations
  // ==========================================================================

  /**
   * Generates a hierarchical ASCII tree diagram of the binary heap.
   * Excellent for visualizing parent-child branches during live presentations.
   * 
   * @param {Function} [formatter] - Formatter function (node, index) => string
   * @returns {string} Formatted ASCII tree
   */
  toTreeString(formatter = (node) => String(node)) {
    if (this.isEmpty()) {
      return '(empty heap - root is null)';
    }

    const lines = [];
    const buildTree = (index, prefix = '', isTail = true) => {
      if (index >= this.heap.length) return;

      const nodeLabel = formatter(this.heap[index], index);
      lines.push(`${prefix}${isTail ? '└── ' : '├── '}[#${index}] ${nodeLabel}`);

      const left = this.getLeftChildIndex(index);
      const right = this.getRightChildIndex(index);

      const hasLeft = left < this.heap.length;
      const hasRight = right < this.heap.length;

      if (hasLeft && hasRight) {
        buildTree(left, `${prefix}${isTail ? '    ' : '│   '}`, false);
        buildTree(right, `${prefix}${isTail ? '    ' : '│   '}`, true);
      } else if (hasLeft) {
        buildTree(left, `${prefix}${isTail ? '    ' : '│   '}`, true);
      }
    };

    const rootLabel = formatter(this.heap[0], 0);
    lines.push(`[Root #0] ${rootLabel}`);

    const left = this.getLeftChildIndex(0);
    const right = this.getRightChildIndex(0);
    const hasLeft = left < this.heap.length;
    const hasRight = right < this.heap.length;

    if (hasLeft && hasRight) {
      buildTree(left, '', false);
      buildTree(right, '', true);
    } else if (hasLeft) {
      buildTree(left, '', true);
    }

    return lines.join('\n');
  }
}
