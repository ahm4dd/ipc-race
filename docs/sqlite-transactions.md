# SQLite Race Conditions & Transactions

## The Problem

Database race conditions occur when multiple processes read and modify the same data concurrently without proper isolation.

## Common Database Race Conditions

### 1. Lost Updates

```
Process A: READ balance ($1000)
Process B: READ balance ($1000)  ← Both read same value!
Process A: WRITE balance ($900)   ← Transfer $100
Process B: WRITE balance ($800)   ← Transfer $200
Result: Only B's update persists, A's is lost!
```

### 2. Dirty Reads

Reading uncommitted changes from other transactions that might be rolled back.

### 3. Non-Repeatable Reads

Reading same data twice in a transaction returns different values.

### 4. Phantom Reads

New rows appear between reads in the same transaction.

## Running the Demos

### Race Condition (Without Transactions)

```bash
bun run src/sqlite-demo/race-demo.ts
```

**Scenario**: 5 processes transfer $100 each from Alice to Bob  
**Expected**: Alice=$500, Bob=$1500  
**Actual**: Lost updates cause incorrect balances

### Solution (With Transactions)

```bash
bun run src/sqlite-demo/transaction-demo.ts
```

**Result**: Transactions prevent race conditions through locking and isolation

## What Are Transactions?

A **transaction** is a sequence of database operations that execute as a single, indivisible unit with **ACID** properties.

### ACID Properties

**Atomicity**: All-or-nothing execution

- Either ALL operations complete successfully
- Or NONE of them take effect (rollback)
- No partial updates

**Consistency**: Valid state transitions

- Database goes from one valid state to another
- Constraints and rules are maintained
- Data integrity preserved

**Isolation**: Concurrent transaction independence

- Transactions don't interfere with each other
- Each transaction sees a consistent view
- Prevents race conditions

**Durability**: Permanent changes

- Committed changes survive crashes
- Data persists to disk
- Guaranteed not to be lost

## Transaction Syntax

### Basic Transaction

```typescript
db.run("BEGIN TRANSACTION");
try {
  // All operations here are atomic
  db.run("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
  db.run("UPDATE accounts SET balance = balance + 100 WHERE id = 2");

  db.run("COMMIT"); // Make changes permanent
} catch (error) {
  db.run("ROLLBACK"); // Undo all changes
}
```

### With Savepoints

```sql
BEGIN TRANSACTION;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;

  SAVEPOINT after_debit;

  UPDATE accounts SET balance = balance + 100 WHERE id = 2;

  -- If something wrong, rollback to savepoint
  ROLLBACK TO SAVEPOINT after_debit;

COMMIT;
```

## Isolation Levels

SQLite supports different isolation levels:

### READ UNCOMMITTED

- Lowest isolation
- Can see uncommitted changes (dirty reads)
- Fast but unsafe

### READ COMMITTED (Default in many DBs)

- Only see committed changes
- Prevents dirty reads
- Still allows non-repeatable reads

### REPEATABLE READ

- Same query returns same data within transaction
- Prevents dirty and non-repeatable reads
- Still allows phantom reads

### SERIALIZABLE (SQLite default)

- Highest isolation
- Full isolation, as if transactions ran sequentially
- Prevents all race conditions
- Can cause more locking/blocking

## SQLite Locking Behavior

SQLite uses file-level locking:

1. **Reading**: Multiple readers allowed
2. **Writing**: Exclusive lock required
3. **Transaction**: Locks held until COMMIT or ROLLBACK

### Lock States

- **UNLOCKED**: No access
- **SHARED**: Reading allowed
- **RESERVED**: Preparing to write
- **PENDING**: Waiting for readers to finish
- **EXCLUSIVE**: Writing in progress

### Database Locked Errors

When you see "database is locked":

- Another transaction holds a write lock
- Your transaction must wait or retry
- This is **intentional** - preventing race conditions!

**Solution**: Implement retry logic

```typescript
async function withRetry(fn: () => void, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      fn();
      return;
    } catch (error) {
      if (error.message.includes("locked") && i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 100 * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
}
```

## When to Use Transactions

✅ **Multi-step operations** that must succeed together  
✅ **Financial transactions** (transfers, payments)  
✅ **Inventory updates** (reserve, confirm, purchase)  
✅ **Any operation** where partial completion is unacceptable

❌ **Single read operations** (unnecessary overhead)  
❌ **Read-heavy workloads** (can use lighter isolation)

## Performance Considerations

### Transaction Overhead

- **Locking**: Blocks other transactions
- **Logging**: Write-ahead log overhead
- **Coordination**: Synchronization costs

### Optimization Tips

1. **Keep transactions short** - minimize lock time
2. **Batch operations** - fewer transactions
3. **Use appropriate isolation level** - don't over-isolate
4. **Implement retry logic** - handle lock timeouts
5. **Consider optimistic locking** for low contention

## Alternative: Optimistic Locking

For scenarios with rare conflicts:

```sql
-- Version-based optimistic locking
UPDATE inventory
SET quantity = quantity - 1,
    version = version + 1
WHERE product_id = 123
  AND version = 5;  -- Only update if version unchanged

-- Check rows affected
IF rows_affected = 0 THEN
  -- Someone else updated, retry with new version
  retry();
END IF;
```

**When to use**:

- Low contention (conflicts are rare)
- High read-to-write ratio
- Can tolerate retries

## Summary

- **Transactions ensure ACID** properties
- **Prevent race conditions** through isolation
- **SQLite uses file-level locking** (serializable by default)
- **"Database locked" is good** - it's preventing races!
- **Implement retry logic** for production systems
- **Keep transactions short** for better performance
- **Use optimistic locking** when conflicts are rare

Transactions are the gold standard for database consistency in concurrent systems!
