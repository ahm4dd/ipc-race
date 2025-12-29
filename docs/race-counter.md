# Counter Increment Race Condition

## The Problem

When multiple processes increment a shared counter concurrently, **lost updates** occur due to the read-modify-write race condition.

## What Happens

Each worker performs three steps:

1. **READ**: Get current counter value
2. **MODIFY**: Add 1 to the value
3. **WRITE**: Save the new value

The race occurs when two processes read the same value before either writes:

```
Counter = 5

Worker A: READ (5)
Worker B: READ (5)      ← Both read same value!
Worker A: COMPUTE (5+1=6)
Worker B: COMPUTE (5+1=6)
Worker A: WRITE (6)
Worker B: WRITE (6)     ← Lost update! Should be 7
```

## Running the Demo

### Race Condition (Problem)

```bash
bun run src/race-conditions/counter/race.ts
```

**Expected**: 100 increments (5 workers × 20 each)  
**Actual**: ~20-30 (70-80 lost updates!)

### Solution with Mutex

```bash
bun run src/race-conditions/counter/solution.ts
```

**Result**: 100/100 correct ✓

## Why It Happens

- **No synchronization**: Workers don't coordinate access
- **Concurrent reads**: Multiple workers read same value
- **Overlapping writes**: Later write overwrites earlier write
- **Non-atomic operation**: Read-modify-write is three separate steps

## The Solution: Mutex

A **mutex** (mutual exclusion) ensures only one process can access the counter at a time:

```typescript
await mutex.acquire(); // Wait for exclusive access
try {
  // CRITICAL SECTION - only one process at a time
  const value = read();
  const newValue = value + 1;
  write(newValue);
} finally {
  mutex.release(); // Allow next process
}
```

## Key Concepts

- **Critical section**: Code that must not run concurrently
- **Mutual exclusion**: Only one process in critical section at a time
- **Atomicity**: Operation appears as single indivisible step
- **Synchronization**: Coordinating access to shared resources

## Real-World Impact

This same race condition causes:

- **Website view counters**: Undercounting visits
- **Inventory systems**: Overselling stock
- **Bank accounts**: Money disappearing
- **Social media likes**: Lost likes/upvotes
