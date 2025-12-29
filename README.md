# OS Concepts Demo: IPC & Race Conditions

An educational TypeScript project demonstrating fundamental operating system concepts including **Inter-Process Communication (IPC)**, **race conditions**, and **synchronization solutions**.

<p align="center">
  <strong>Purpose:</strong> Help developers understand concurrency challenges and solutions through hands-on demonstrations
</p>

---

## What You'll Learn

- **IPC Mechanisms**: How processes communicate and share data
- **Race Conditions**: Why and how concurrent access causes bugs
- **Synchronization**: Solutions using mutexes, semaphores, atomic operations, and transactions
- **Database Concurrency**: Race conditions in SQLite and transaction-based solutions

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) runtime installed
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd os-project

# Install dependencies
bun install

# Run the interactive CLI
bun start
```

### Running Individual Demos

Every demo can be run independently:

```bash
# IPC Demos
bun run src/ipc/child-process.ts
bun run src/ipc/shared-memory.ts
bun run src/ipc/message-passing.ts
bun run src/ipc/producer-consumer.ts

# Race Condition Demos (Problems)
bun run src/race-conditions/counter/race.ts
bun run src/race-conditions/bank-account/race.ts
bun run src/race-conditions/inventory/race.ts

# Race Condition Solutions
bun run src/race-conditions/counter/solution.ts
bun run src/race-conditions/bank-account/solution.ts
bun run src/race-conditions/inventory/solution.ts

# SQLite Demos
bun run src/sqlite-demo/race-demo.ts
bun run src/sqlite-demo/transaction-demo.ts
```

---

## Project Structure

```
os-concepts-demo/
├── src/
│   ├── ipc/                    # IPC demonstrations
│   │   ├── child-process.ts    # Parent-child messaging
│   │   ├── shared-memory.ts    # File-based shared memory
│   │   ├── message-passing.ts  # Queue-based communication
│   │   └── producer-consumer.ts # Classic concurrency pattern
│   │
│   ├── race-conditions/        # Race condition examples
│   │   ├── counter/            # Lost updates demo
│   │   ├── bank-account/       # Negative balance demo
│   │   └── inventory/          # Overselling demo
│   │
│   ├── solutions/              # Reusable synchronization primitives
│   │   └── mutex.ts            # File-based mutex implementation
│   │
│   ├── sqlite-demo/            # Database race conditions
│   │   ├── schema.sql          # Database schema
│   │   ├── race-demo.ts        # Without transactions
│   │   └── transaction-demo.ts # With ACID transactions
│   │
│   ├── cli/                    # Interactive CLI interface
│   │   └── index.ts            # Main menu system
│   │
│   └── utils/                  # Shared utilities
│       ├── logger.ts           # Colored logging
│       └── types.ts            # TypeScript interfaces
│
├── docs/                       # Comprehensive documentation
│   ├── synchronization-concepts.md     # Theory guide
│   ├── ipc-*.md                        # IPC explanations
│   ├── race-*.md                       # Race condition guides
│   └── sqlite-transactions.md          # Transaction deep-dive
│
└── tests/                      # Test suites
```

---

## Demonstrations

### 1. IPC (Inter-Process Communication)

#### Child Process Communication

**Concept**: Parent and child processes exchange messages via stdin/stdout

**What it shows**:

- Spawning child processes
- Bidirectional communication
- Task distribution pattern

**Run**: `bun run src/ipc/child-process.ts`

**Learn more**: [docs/ipc-child-process.md](docs/ipc-child-process.md)

---

#### Shared Memory Simulation

**Concept**: Multiple processes access the same memory region (simulated with files)

**What it shows**:

- Shared memory benefits (fast data sharing)
- Race conditions from concurrent access
- Lost updates when unsynchronized

**Run**: `bun run src/ipc/shared-memory.ts`

**Learn more**: [docs/ipc-shared-memory.md](docs/ipc-shared-memory.md)

---

#### Message Passing

**Concept**: Asynchronous communication via message queues

**What it shows**:

- Decoupled process architecture
- FIFO queue behavior
- Async message handling

**Run**: `bun run src/ipc/message-passing.ts`

**Learn more**: [docs/ipc-message-passing.md](docs/ipc-message-passing.md)

---

#### Producer-Consumer Pattern

**Concept**: Producers generate items, consumers process them from a bounded buffer

**What it shows**:

- Buffer management
- Backpressure handling
- Coordination between producers/consumers

**Run**: `bun run src/ipc/producer-consumer.ts`

**Learn more**: [docs/ipc-producer-consumer.md](docs/ipc-producer-consumer.md)

---

### 2. Race Conditions & Solutions

#### Counter Increment (Simplest Race)

**Problem**: Multiple processes incrementing a shared counter

**Expected**: 100 increments  
**Actual (race)**: ~23 (77 lost updates!)  
**Solution (mutex)**: 100/100 ✓

**Files**:

- Problem: `src/race-conditions/counter/race.ts`
- Solution: `src/race-conditions/counter/solution.ts`

**Learn more**: [docs/race-counter.md](docs/race-counter.md)

---

#### Bank Account Transfers

**Problem**: Concurrent withdrawals can cause negative balance

**Scenario**: 4 processes withdraw $300 each from $1000 account  
**Race Result**: Over-withdrawal or negative balance  
**Solution**: Mutex ensures atomic check-and-withdraw

**Files**:

- Problem: `src/race-conditions/bank-account/race.ts`
- Solution: `src/race-conditions/bank-account/solution.ts`

**Learn more**: [docs/race-bank-account.md](docs/race-bank-account.md)

---

#### Inventory Management

**Problem**: Overselling from concurrent purchases

**Scenario**: 15 customers buying from stock of 10  
**Race Result**: Overselling or lost updates  
**Solution**: Mutex prevents overselling, correctly rejects excess

**Files**:

- Problem: `src/race-conditions/inventory/race.ts`
- Solution: `src/race-conditions/inventory/solution.ts`

**Learn more**: [docs/race-inventory.md](docs/race-inventory.md)

---

### 3. Database Concurrency (SQLite)

#### SQLite Without Transactions

**Problem**: Concurrent database operations cause lost updates

**Scenario**: 5 processes transfer $100 each  
**Expected**: Alice=$500, Bob=$1500  
**Actual**: Lost updates cause incorrect balances

**Run**: `bun run src/sqlite-demo/race-demo.ts`

---

#### SQLite With Transactions

**Solution**: ACID transactions prevent race conditions

**Features**:

- Atomicity (all-or-nothing)
- Consistency (valid states)
- Isolation (concurrent safety)
- Durability (persistent changes)

**Run**: `bun run src/sqlite-demo/transaction-demo.ts`

**Learn more**: [docs/sqlite-transactions.md](docs/sqlite-transactions.md)

---

## Learning Resources

### Essential Concepts Guide

**[Synchronization Concepts](docs/synchronization-concepts.md)** - Comprehensive guide covering:

- Mutexes (mutual exclusion)
- Semaphores (counting & binary)
- Atomic operations
- Database transactions
- Optimistic vs pessimistic locking
- Compare-and-swap (CAS)
- When to use each solution

### Individual Demo Documentation

Each demo has its own README in the `docs/` directory explaining:

- What the demo shows
- Why it matters
- How it works technically
- How to run it
- Expected output
- Real-world applications

---

## 🔧 Development

### Running Tests

```bash
bun test
```

### Code Style

- **TypeScript strict mode** enabled
- **No `any` types** (explicit typing throughout)
- **Meaningful names** over abbreviations
- **Comments** only where behavior is non-obvious

### Adding New Demos

1. Create demo file in appropriate directory
2. Add corresponding README in `docs/`
3. Register demo in `src/cli/index.ts`
4. Test independently and via CLI
5. Update main README

---

## Educational Goals

This project teaches:

1. **Why concurrency is hard**: Race conditions are subtle and non-deterministic
2. **Common patterns**: Read-modify-write, check-then-act
3. **Solution trade-offs**: Mutexes vs atomics vs transactions
4. **Real-world relevance**: Banks, e-commerce, inventory systems
5. **Best practices**: When to use which synchronization primitive

---

## Contributing

This is an educational project. Contributions that:

- Add new race condition demonstrations
- Improve documentation clarity
- Add more synchronization solutions
- Fix bugs or improve code quality

are welcome!

---

## License

Educational project for learning OS concepts.

---

## Acknowledgments

Built with:

- [Bun](https://bun.sh/) - Fast TypeScript/JavaScript runtime
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [chalk](https://github.com/chalk/chalk) - Terminal colors
- SQLite - Embedded database

---

## Project Stats

- **12 working demonstrations**
- **30+ TypeScript files**
- **~2000 lines of code**
- **Comprehensive documentation**
- **All demos tested and working**

---

## Learning Path

### Beginners

1. Start with **Counter Race** (simplest example)
2. Run **Counter Solution** to see mutex in action
3. Read **[Synchronization Concepts](docs/synchronization-concepts.md)**
4. Try **IPC** demos to understand process communication

### Intermediate

1. **Bank Transfer** race (check-then-act pattern)
2. **Inventory** race (real-world scenario)
3. **SQLite** demos (database-level races)
4. Read individual demo READMEs

### Advanced

1. Study **mutex implementation** (`src/solutions/mutex.ts`)
2. Compare different isolation levels
3. Implement optimistic locking variant
4. Add new race condition scenarios

---

## Key Takeaways

1. **Race conditions are everywhere** in concurrent systems
2. **They're hard to reproduce** (non-deterministic)
3. **Prevention is better than debugging** (use synchronization)
4. **Choose the right tool**: mutex, semaphore, atomic, or transaction
5. **Start simple** (mutex), optimize later (atomics) if needed

---

**Happy Learning!**

For questions or issues, please open a GitHub issue.
