# OS Concepts Demo: Comprehensive Technical Report

**Date:** December 31, 2025  
**Project:** OS Concepts Demo (TypeScript/Bun)  
**Target Audience:** Technical Reviewers & implementation Teams

---

## 1. Executive Summary

This project serves as an interactive, code-first educational platform for understanding **Operating System Concurrency Concepts**. Unlike theoretical textbooks, this project uses real system processes (spawned via the Bun runtime) to demonstrate actual concurrency bugs—specifically **Race Conditions**—and their correct solutions using synchronization primitives.

The system is architected to be **observable**. By using the filesystem and SQLite as shared memory mediums, we allow multiple independent processes to contend for resources in a way that is visible, debuggable, and provable.

---

## 2. System Architecture

### 2.1 Technology Stack

- **Runtime**: [Bun](https://bun.sh/). Chosen for its fast startup time (critical for spawning multiple short-lived worker processes) and first-class TypeScript support.
- **Language**: TypeScript. Enforces type safety on IPC messages and shared state structures.
- **Concurrency Model**: **Process-based Concurrency**.
  - We do _not_ use threads (Worker Threads).
  - We use `bun.spawn()` to create independent OS-level processes.
  - This creates "true" isolation; processes share NO memory space, forcing all communication to go through designated IPC channels (Files/DB), which mirrors distributed system challenges.

### 2.2 Directory Structure

The codebase is organized by concept rather than file type, ensuring self-contained demos:

- `src/ipc/`: Inter-Process Communication patterns (Producer-Consumer).
- `src/race-conditions/`: "Broken" implementations showing specific race classes.
- `src/solutions/`: The fix layer (Mutex implementations, etc.).
- `src/sqlite-demo/`: Database-specific concurrency.
- `src/cli/`: The unified control plane.

---

## 3. Deep Dive: Race Conditions & Mechanics

We demonstrate three distinct classes of concurrency defects.

### 3.1 The "Read-Modify-Write" Gap (Demonstrated by: Counter)

**The Problem**: The most fundamental race.

1. Process A reads `value: 0`.
2. Process A intends to write `1`.
3. _Context Switch / Delay_
4. Process B reads `value: 0`.
5. Process B writes `1`.
6. Process A resumes and writes `1`.
   **Result**: Two increments happened, but value is `1` (Lost Update).

**Implementation Detail**:

- We use `src/race-conditions/counter/worker.ts`.
- We artificially inject `Math.random()` delays between the read (`readFileSync`) and the write (`writeFileSync`) to widen the race window, making the bug deterministic enough to demo reliably.
- **Visual Proof**: The system dumps the `counter.json` file content before and after, verifying mathematically that $N \times increments \neq FinalValue$.

### 3.2 The "Check-Then-Act" Race (Demonstrated by: Bank Account)

**The Problem**: Using stale data to make a decision.

1. Process A checks `balance >= 300` (True, balance is 1000).
2. _Context Switch_
3. Process B, C, D all check `balance >= 300` (True, balance is still 1000).
4. All 4 processes proceed to deduct 300.
   **Result**: $1200 withdrawn from a $1000 account. Balance becomes -$200.

**Implementation Detail**:

- The "Check" phase (`if (balance >= amount)`) is separated from the "Act" phase (`write(balance - amount)`).
- This mirrors reentrancy attacks in smart contracts or overselling in ticket systems.

### 3.3 Database Interleaving (Demonstrated by: SQLite)

**The Problem**: Atomicity of single statements vs. atomicity of business logic.

- Even if individual SQL statements (`UPDATE accounts SET balance = ...`) are atomic, the _sequence_ of "Select balance" -> "Calculate new balance in app" -> "Update balance" is NOT.
- **Implementation**: We spawn workers that perform this `SELECT` -> `Application Logic` -> `UPDATE` cycle without wrapping it in a `BEGIN TRANSACTION`.
- **Result**: Lost money (~$400 in typical runs), proving that standard SQL queries are insufficient for logic that spans multiple round-trips.

---

## 4. The Solution Layer: Synchronization Primitives

### 4.1 File-Based Mutex (`FileMutex`)

To solve file-based races, we implemented a custom Mutual Exclusion algorithm in `src/solutions/mutex.ts`.

**How it works (The Nitty-Gritty)**:

- We use the **Filesystem** as the arbiter of truth.
- **Acquire**: We attempt to write a lockfile `/tmp/{name}.lock` using the flag `{ flag: 'wx' }`.
  - `w`: Write.
  - `x`: **Exclusive** (Fail if path exists).
  - This maps to the OS-level `O_EXCL` flag, which is an atomic operation provided by the kernel.
- **Spin-Wait**: If `acquire` fails (file exists), the process enters a sleep-retry loop (Spinlock behavior) until it succeeds or times out.
- **Release**: The owner deletes the file. We verify `process.pid` inside the lockfile to ensure we don't delete someone else's lock (Owner validation).

### 4.2 ACID Transactions

For the SQLite demo, we switch to using the database's native lock manager.

- `db.run('BEGIN TRANSACTION')`: Tells SQLite to hold a rigid view of the world.
- **Lock Escalation**: SQLite moves from SHARED (Reading) to RESERVED/EXCLUSIVE (Writing).
- **Outcome**: Processes attempting to write while another transaction is open receive `SQLITE_BUSY` (Database Locked). We handle this by rolling back, effectively preventing the race (at the cost of throughput).

---

## 5. Visual Proof Methodology

A critical requirement (Phase 7) was to move beyond "Trust me, it broke" to "Here is the broken state".

**Implementation**:

- **Direct State Inspection**: The CLI does not rely on process logs. It reads the raw artifacts (`buffer.json`, `database.db`) directly from disk after execution.
- **Verification Tables**:
  ```
  ╔════════════════════════════════════╗
  ║  VERIFICATION SUMMARY              ║
  ╠════════════════════════════════════╣
  ║ Expected:      100                 ║
  ║ Actual:        23                  ║
  ║ Lost Updates:  77 ⚠️                ║
  ╚════════════════════════════════════╝
  ```
- This proves that even though 5 processes _claimed_ they finished their work, the data physically isn't there.

---

## 6. Project Status & Roadmap

### Current Status

- **Core 4 Demos**: Fully functional and visually verified.
- **Structure**: Consolidated. Redundant demos (Inventory, Simple Message Passing) were removed to focus on distinct patterns.
- **Reliability**: High. Delays are tuned to ensure races occur on almost every run on standard hardware.

### Future Work (Phase 8 Plan)

- **Semaphores**: To implement true flow control in the Producer-Consumer pattern (currently just relies on `MAX_BUFFER` checks).
- **Atomics**: Moving from FS locking to `SharedArrayBuffer` for high-performance, lock-free synchronization.
- **Optimistic Locking**: Reducing contention in the Bank demo by using version numbers instead of heavy Mutex locks.

---

_End of Report_
