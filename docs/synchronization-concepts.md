# Synchronization Concepts Guide

This guide explains the fundamental concepts and solutions for preventing race conditions in concurrent systems.

## Table of Contents

1. [The Race Condition Problem](#the-race-condition-problem)
2. [Mutexes (Mutual Exclusion)](#mutexes-mutual-exclusion)
3. [Semaphores](#semaphores)
4. [Atomic Operations](#atomic-operations)
5. [Database Transactions](#database-transactions)
6. [Locks: Optimistic vs Pessimistic](#locks-optimistic-vs-pessimistic)
7. [Compare-and-Swap (CAS)](#compare-and-swap-cas)
8. [When to Use What](#when-to-use-what)

---

## The Race Condition Problem

A **race condition** occurs when:

1. Multiple processes/threads access shared data concurrently
2. At least one process modifies the data
3. The outcome depends on the **timing** of execution (non-deterministic)
4. Results in incorrect behavior

### Common Race Patterns

**Read-Modify-Write Race:**

```
Process A: READ(x=5) → MODIFY(x+1) → WRITE(x=6)
Process B: READ(x=5) → MODIFY(x+1) → WRITE(x=6)
Result: x=6 (should be 7) ❌
```

**Check-Then-Act Race:**

```
Process A: CHECK(balance≥100) ✓ → WITHDRAW(100)
Process B: CHECK(balance≥100) ✓ → WITHDRAW(100)
Result: Negative balance ❌
```

---

## Mutexes (Mutual Exclusion)

### What is a Mutex?

A **mutex** is a synchronization primitive that ensures **only one process/thread** can access a critical section at a time.

Think of it as a **bathroom lock**:

- Only one person can be inside (have the lock)
- Others must wait outside (blocked)
- When done, unlock for next person (release)

### How It Works

```typescript
mutex.acquire(); // Lock the door
try {
  // CRITICAL SECTION
  // Only ONE process executes this at a time
  const value = read();
  const newValue = value + 1;
  write(newValue);
} finally {
  mutex.release(); // Unlock the door
}
```

### Key Properties

- **Mutual Exclusion**: Only one process in critical section
- **Blocking**: Other processes wait (blocked) until mutex is released
- **Ownership**: Only the process that acquired can release
- **Deadlock risk**: If not released properly, system hangs

### When to Use

✅ Protecting read-modify-write operations  
✅ Ensuring atomic multi-step operations  
✅ Preventing concurrent access to shared resources  
✅ When exclusive access is required

### Pros & Cons

**Pros:**

- Simple to understand and use
- Strong guarantees (exclusive access)
- Works for any critical section

**Cons:**

- Performance overhead (blocking)
- Deadlock risk (if multiple mutexes)
- Priority inversion possible
- Doesn't scale well to many processes

---

## Semaphores

### What is a Semaphore?

A **semaphore** is a synchronization primitive with a **counter** that controls access to a resource pool.

Think of it as **parking lot with N spaces**:

- Counter = available spaces
- `wait()`: Take a space (decrement counter)
- `signal()`: Free a space (increment counter)
- If counter = 0, wait until someone leaves

### Types of Semaphores

#### Binary Semaphore (counter = 0 or 1)

Similar to mutex, but no ownership concept.

```typescript
semaphore.wait(); // Decrement counter (block if 0)
// Critical section
semaphore.signal(); // Increment counter
```

#### Counting Semaphore (counter = N)

Controls access to N identical resources.

```typescript
// Example: Connection pool with 5 connections
const semaphore = new Semaphore(5);

semaphore.wait(); // Get a connection (block if all 5 in use)
useConnection();
semaphore.signal(); // Release connection
```

### When to Use

✅ Limiting concurrent access to N resources  
✅ Producer-consumer problems (buffer management)  
✅ Resource pools (connection pools, thread pools)  
✅ Signaling between processes (not just mutual exclusion)

### Pros & Cons

**Pros:**

- Flexible (binary or counting)
- Good for producer-consumer
- Can signal across processes

**Cons:**

- Easy to misuse (forget signal)
- No ownership tracking
- Can cause deadlocks
- More complex than mutex

---

## Atomic Operations

### What are Atomic Operations?

**Atomic operations** execute as a single, indivisible unit with **hardware support**. They cannot be interrupted mid-execution.

Think of it as **pressing an elevator button**:

- Either fully pressed or not
- No "half-pressed" state
- Cannot be interrupted

### Common Atomic Operations

```typescript
// Atomic increment (read-modify-write in ONE step)
Atomics.add(array, index, value);

// Atomic compare-and-swap
Atomics.compareExchange(array, index, expectedValue, newValue);

// Atomic load/store
const value = Atomics.load(array, index);
Atomics.store(array, index, value);
```

### Example: Atomic Counter

**Without Atomics (Race Condition):**

```typescript
// Three separate steps - race possible!
const value = counter;
const newValue = value + 1;
counter = newValue;
```

**With Atomics (No Race):**

```typescript
// Single atomic operation - no race!
Atomics.add(sharedArray, 0, 1);
```

### When to Use

✅ Simple operations (increment, decrement, swap)  
✅ Lock-free data structures  
✅ Performance-critical code  
✅ Simple synchronization needs

### Pros & Cons

**Pros:**

- Extremely fast (hardware-level)
- No deadlocks
- Lock-free programming
- Minimal overhead

**Cons:**

- Limited to simple operations
- Requires SharedArrayBuffer or similar
- Complex to reason about
- Not available for all data types

---

## Database Transactions

### What is a Transaction?

A **transaction** is a sequence of database operations that execute as a single logical unit with **ACID** properties.

Think of it as **bank transfers**:

- Withdraw $100 from Account A
- Deposit $100 to Account B
- Either BOTH happen or NEITHER happens

### ACID Properties

**Atomicity**: All-or-nothing (transaction fully completes or fully rolls back)

**Consistency**: Database goes from one valid state to another

**Isolation**: Concurrent transactions don't interfere (various levels)

**Durability**: Committed changes persist even after crashes

### Isolation Levels

From weakest to strongest:

1. **READ UNCOMMITTED**: Can read uncommitted changes (dirty reads)
2. **READ COMMITTED**: Only see committed changes
3. **REPEATABLE READ**: Same query returns same data within transaction
4. **SERIALIZABLE**: Full isolation, as if transactions ran sequentially

### SQL Transaction Example

```sql
BEGIN TRANSACTION;

  -- Check balance
  SELECT balance FROM accounts WHERE id = 1;

  -- If sufficient, withdraw
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;

  -- If all good, commit
COMMIT;

-- If error, ROLLBACK undoes everything
```

### When to Use

✅ Database operations requiring consistency  
✅ Multi-step operations that must succeed together  
✅ Financial transactions  
✅ Any operation where partial completion is unacceptable

### Pros & Cons

**Pros:**

- Strong consistency guarantees
- Automatic rollback on failure
- Well-tested and reliable
- Built into databases

**Cons:**

- Performance overhead
- Can cause deadlocks
- Locks can block other transactions
- Only works with databases

---

## Locks: Optimistic vs Pessimistic

### Pessimistic Locking

**Assume conflicts WILL happen** → Lock data before reading

```typescript
// Lock immediately
mutex.acquire();
const data = read();
data.value += 1;
write(data);
mutex.release();
```

**When to use:**

- High contention (many writes)
- Conflicts are expensive
- Must prevent conflicts

### Optimistic Locking

**Assume conflicts WON'T happen** → Check for conflicts before writing

Uses a **version number** or **timestamp**:

```typescript
// Read without locking
const data = read(); // version: 5
data.value += 1;

// Try to write only if version unchanged
if (currentVersion === 5) {
  data.version = 6;
  write(data); // Success!
} else {
  // Conflict detected! Retry
  retry();
}
```

**When to use:**

- Low contention (few writes)
- Reads are common
- Conflicts are rare

### Comparison

| Aspect      | Pessimistic           | Optimistic                 |
| ----------- | --------------------- | -------------------------- |
| When locks  | Before read           | Never (uses versions)      |
| Performance | Slower (always locks) | Faster (rarely conflicts)  |
| Best for    | High contention       | Low contention             |
| Complexity  | Simpler               | More complex (retry logic) |
| Deadlocks   | Possible              | Impossible                 |

---

## Compare-and-Swap (CAS)

### What is CAS?

**Compare-and-Swap** is an atomic operation that:

1. Compares a value to an expected value
2. If equal, swaps in a new value
3. Returns whether swap succeeded

All in **one atomic step**!

### How It Works

```typescript
function compareAndSwap(location, expected, newValue) {
  // This happens ATOMICALLY
  if (location === expected) {
    location = newValue;
    return true; // Success!
  }
  return false; // Someone else changed it
}
```

### Lock-Free Counter Example

```typescript
function increment(counter) {
  while (true) {
    const current = counter.value;
    const next = current + 1;

    // Try to swap
    if (CAS(counter, current, next)) {
      break; // Success!
    }
    // Failed - someone else incremented. Retry.
  }
}
```

### When to Use

✅ Lock-free data structures  
✅ High-performance concurrent code  
✅ Avoiding mutex overhead  
✅ Building other synchronization primitives

### Pros & Cons

**Pros:**

- No locks (no deadlocks)
- Very fast
- Wait-free for single operations
- Scales well

**Cons:**

- Complex to implement correctly
- ABA problem (value changes and changes back)
- Spin-waiting (wastes CPU)
- Only works for single-word values

---

## When to Use What

### Decision Table

| Problem                  | Recommended Solution        | Why                                |
| ------------------------ | --------------------------- | ---------------------------------- |
| Counter increment        | Atomic operation            | Simple, fast, lock-free            |
| Bank account transfer    | Mutex or Transaction        | Multiple steps, need atomicity     |
| Resource pool (N items)  | Semaphore                   | Count-based access control         |
| Database updates         | Transaction                 | ACID guarantees                    |
| Rare conflicts           | Optimistic locking          | Low contention, good performance   |
| Frequent conflicts       | Pessimistic locking (Mutex) | High contention, prevent conflicts |
| High-performance 需求    | Atomic ops or CAS           | Minimal overhead                   |
| Complex multi-step logic | Mutex                       | Any critical section               |

### General Guidelines

**Use Mutex when:**

- Need exclusive access to a resource
- Multiple steps must be atomic
- Simplicity is important

**Use Semaphore when:**

- Managing a pool of N resources
- Producer-consumer pattern
- Need to limit concurrent access

**Use Atomic Operations when:**

- Simple operations (increment, swap)
- Performance is critical
- Can express logic atomically

**Use Transactions when:**

- Working with databases
- Need ACID guarantees
- Multi-table operations

**Use Optimistic Locking when:**

- Low contention
- Reads >> Writes
- Can tolerate retries

**Use CAS when:**

- Building lock-free structures
- Maximum performance needed
- Can handle retry logic

---

## Summary

Race conditions are a fundamental problem in concurrent systems. The solution depends on:

1. **Type of operation**: Read-modify-write? Check-then-act?
2. **Contention level**: High or low?
3. **Performance requirements**: How fast must it be?
4. **Complexity tolerance**: Simple mutex or complex lock-free?
5. **Context**: In-memory or database?

**Start simple** (mutex), **optimize later** (atomic operations, CAS) when needed.

Remember: **Premature optimization is the root of all evil!**
