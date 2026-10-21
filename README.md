# Priority-Based Task Scheduler

A high-performance **Priority-Based Task Scheduler** implemented in modern JavaScript (ES6+ modules), combining a custom **Binary Min-Heap** data structure with an adaptive **Dynamic Urgency Scoring Algorithm**, multi-user profile management, and zero-cost client-side persistence via `localStorage`.

---

## 🌟 Key Features

1. **Custom Binary Min-Heap from Scratch**:
   - Array-based binary tree representation with zero external dependencies.
   - `push(task)`: Inserts element and performs `heapifyUp` in **$O(\log n)$** time.
   - `pop()` / `extractMin()`: Removes the root element, replaces with last item, and performs `heapifyDown` in **$O(\log n)$** time.
   - `peek()`: Inspects the root element (most critical task) in **$O(1)$** time.
   - `rebuildHeap()`: Floyd's bottom-up heap construction in **$O(n)$** time for dynamic urgency updates.

2. **Adaptive Urgency Scoring Algorithm**:
   - Balances user-assigned priority weights ($W_{priority} \in \{ \text{HIGH: 3}, \text{MEDIUM: 2}, \text{LOW: 1} \}$) against time remaining until the deadline timestamp ($m$ minutes).
   - **Upcoming Tasks ($m > 0$)**:
     $$\text{UrgencyScore} = \frac{W_{priority} \times 1,000}{m + 15}$$
   - **Overdue Tasks ($m \le 0$)**:
     $$\text{UrgencyScore} = 10,000 + (|m| \times 50 \times W_{priority})$$
   - Guarantees that the most critical task always bubbles to **Index 0 (the root)**.

3. **Local Profile Management & Zero-Cost Persistence**:
   - $0 server budget: Stores profile metadata and isolated task lists in browser `localStorage`.
   - Isolated keys: `tasks_profile_<profileId>` (e.g., `tasks_profile_venkatesh`).
   - Auto-Save on every push, pop, complete, or delete operation.
   - State rehydration: Fully reconstructs a functional `MinHeap` instance across browser reloads or profile switches.

4. **Modern UI Design System**:
   - **Main Background**: `#F4F5F9`
   - **Cards & Modals**: Pure White `#FFFFFF` with subtle shadows
   - **Headings**: Deep Slate `#0F172A`
   - **Body Text**: Muted Gray `#64748B`
   - **Buttons & Accents**: Vibrant Violet/Indigo Gradient (`linear-gradient(135deg, #6366F1, #8B5CF6)`)
   - **Priority Status Badges**:
     - Coral Red: `#EF4444` (High Priority)
     - Warm Amber: `#F59E0B` (Medium Priority)
     - Emerald Green: `#10B981` (Low Priority)
   - **Layouts**: Responsive container fluidly adapting between Desktop Dashboard view and a Mobile App Viewport Frame.
   - **Min-Heap Inspector**: Visualizes the binary tree topology and array storage indices `[0..n-1]` with parent-child links in real time.

---

## 📁 Project Architecture

```
d:/DS_Minifinal/
├── package.json               # Project manifest & npm scripts
├── index.html                 # Semantic HTML5 UI layout & modals
├── style.css                  # Design system tokens, responsive framing, animations
├── app.js                     # Frontend state, event wiring, and dynamic rendering
├── server.js                  # Zero-dependency local static HTTP server
├── demo.js                    # Console verification and sequential pop demo
├── src/
│   ├── index.js               # Library entry point
│   ├── MinHeap.js             # Generic binary Min-Heap class
│   ├── Task.js                # Task model, Priority enum, deadline helpers
│   ├── UrgencyCalculator.js   # Mathematical urgency scoring and comparator
│   ├── TaskScheduler.js       # High-level scheduler integrating MinHeap
│   └── ProfileManager.js      # Zero-cost localStorage profile persistence
└── test/
    ├── MinHeap.test.js        # Unit tests for binary heap invariants and O(log n)
    ├── Scheduler.test.js      # Unit tests for urgency ranking and bubble-up
    ├── ProfileManager.test.js # Unit tests for isolated profile storage & rehydration
    └── runTests.js            # Automated test runner using node:assert
```

---

## 🌐 Live Production Deployment

Your application is live in production on Vercel:
**[https://priotask-eight.vercel.app](https://priotask-eight.vercel.app)**

- **Vercel Project Dashboard:** [https://vercel.com/venkatesh-5247/priotask](https://vercel.com/venkatesh-5247/priotask)
- **Deployment Status:** Active &bull; Zero-config Edge CDN &bull; SSL/TLS Enabled

---

## 🚀 Getting Started Locally

### 1. Run Automated Unit Tests (19 Tests)
```bash
node test/runTests.js
```

### 2. Run Console Verification Demo
```bash
node demo.js
```

### 3. Launch the Local Web Application
```bash
node dev-server.js
```
Open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Console Verification Output Preview

```
=================== SCHEDULER HEAP STATE (7 Tasks) ===================
Current Time: 2026-10-21T21:00:00.000Z
Root / Index 0 Task: "Production SSL Certificate Expiry"

┌─────────┬─────┬────────┬─────────────────────────────────────┬──────────┬───────────────┬─────────────────────┬─────────┐
│ (index) │ Idx │ Parent │ Title                               │ Priority │ Urgency Score │ Time Remaining      │ Overdue │
├─────────┼─────┼────────┼─────────────────────────────────────┼──────────┼───────────────┼─────────────────────┼─────────┤
│ 0       │ 0   │ '-'    │ 'Production SSL Certificate Expiry' │ 'HIGH'   │ 12250         │ 'OVERDUE by 15m 0s' │ 'YES'   │
│ 1       │ 1   │ 0      │ 'Zero-Day Vulnerability Hotfix'     │ 'HIGH'   │ 120           │ 'in 10m 0s'         │ 'NO'    │
│ 2       │ 2   │ 0      │ 'Submit Weekly Expense Reports'     │ 'MEDIUM' │ 50            │ 'in 25m 0s'         │ 'NO'    │
│ 3       │ 3   │ 1      │ 'Routine Database Backup'           │ 'LOW'    │ 7.41          │ 'in 2h 0m'          │ 'NO'    │
│ 4       │ 4   │ 1      │ 'Customer Support Escalation (P1)'  │ 'HIGH'   │ 50            │ 'in 45m 0s'         │ 'NO'    │
│ 5       │ 5   │ 2      │ 'Quarterly Planning Document'       │ 'MEDIUM' │ 10.26         │ 'in 3h 0m'          │ 'NO'    │
│ 6       │ 6   │ 2      │ 'Fix Typo in Landing Page Footer'   │ 'LOW'    │ 33.33         │ 'in 15m 0s'         │ 'NO'    │
└─────────┴─────┴────────┴─────────────────────────────────────┴──────────┴───────────────┴─────────────────────┴─────────┘

--- Min-Heap Tree Topology ---
[Root #0] [HIGH] "Production SSL Certificate Expiry" (Score: 12250.0, OVERDUE by 15m 0s)
├── [#1] [HIGH] "Zero-Day Vulnerability Hotfix" (Score: 120.0, in 10m 0s)
│   ├── [#3] [LOW] "Routine Database Backup" (Score: 7.4, in 2h 0m)
│   └── [#4] [HIGH] "Customer Support Escalation (P1)" (Score: 50.0, in 45m 0s)
└── [#2] [MEDIUM] "Submit Weekly Expense Reports" (Score: 50.0, in 25m 0s)
    ├── [#5] [MEDIUM] "Quarterly Planning Document" (Score: 10.3, in 3h 0m)
    └── [#6] [LOW] "Fix Typo in Landing Page Footer" (Score: 33.3, in 15m 0s)
```
