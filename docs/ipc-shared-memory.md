# Shared Memory Simulation Demo

## What This Demonstrates

This demonstrates **shared memory** as an IPC mechanism, where multiple processes can access the same memory region. We simulate this using a file that acts as shared memory.

## Concept

Shared memory allows:

- **Fast data sharing**: No message copying, processes access same data
- **Concurrent access**: Multiple processes can read/write simultaneously
- **Race conditions**: Without coordination, concurrent access causes problems

This demo deliberately shows the **dangers** of uncoordinated shared memory access.

## How It Works

### Main Process (`shared-memory.ts`)

1. Creates a file representing shared memory
2. Initializes it with a counter set to 0
3. Spawns 3 worker processes
4. Each worker increments the counter 5 times
5. Checks if final value matches expected (should be 15)

### Worker Processes (`shared-memory-worker.ts`)

Each worker performs a **read-modify-write** operation:

1. **READ**: Load current counter value from file
2. **DELAY**: Simulate processing (where races happen!)
3. **MODIFY**: Increment the value
4. **WRITE**: Save back to file
5. **VERIFY**: Check if value was overwritten by another worker

## The Race Condition

The problem occurs in this sequence:

```
Worker 1: READ (counter = 5)
Worker 2: READ (counter = 5)  ← Both read same value!
Worker 1: WRITE (counter = 6)
Worker 2: WRITE (counter = 6)  ← Lost update! Should be 7
```

Worker 2's write **overwrites** Worker 1's write, causing a **lost update**.

## How to Run

```bash
bun run src/ipc/shared-memory.ts
```

## Expected Output

You should see:

- 3 workers spawned
- Workers reading and incrementing the counter
- **Race detection messages** when workers detect their writes were overwritten
- Final counter value **less than 15** (expected should be 15)
- Race condition warning

## Key Observations

- **Process IDs differ**: Each worker runs in its own process
- **Lost updates**: Final counter < 15 (e.g., 10 or 12)
- **Non-deterministic**: Running multiple times gives different results
- **Workers detect races**: Verification step catches when writes are lost

## Real-World Implications

Without proper synchronization (mutexes, semaphores, atomic operations):

- **Database corruption**: Concurrent updates to same record
- **Inventory errors**: Two purchases of the last item in stock
- **Account errors**: Race in bank transfers

## Solution Preview

Later demos will show solutions:

- **Mutexes**: Exclusive access locks
- **Atomic operations**: Hardware-level guarantees
- **Transactions**: Database-level coordination
