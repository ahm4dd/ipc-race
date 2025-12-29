# Bank Account Transfer Race Condition

## The Problem

When multiple processes attempt concurrent withdrawals from the same bank account, **check-then-act** race conditions can cause:

- **Negative balances** (withdrawing more than available)
- **Lost money** (overlapping transactions)
- **Incorrect balances**

## The Race Scenario

```
Account Balance: $1000

Process A: CHECK balance ($1000) ✓
Process B: CHECK balance ($1000) ✓  ← Both see same balance!
Process A: WITHDRAW $600
Process B: WITHDRAW $600           ← Should be rejected but isn't!
Final Balance: -$200               ← NEGATIVE BALANCE!
```

## Running the Demo

### Race Condition (Problem)

```bash
bun run src/race-conditions/bank-account/race.ts
```

4 processes try to withdraw $300 each from $1000:

- **Total attempt**: $1,200
- **Available**: $1,000
- **Race result**: May allow over-withdrawal or negative balance

### Solution with Mutex

```bash
bun run src/race-conditions/bank-account/solution.ts
```

With mutex protection:

- Only 3 withdrawals succeed ($900 total)
- 4th withdrawal rejected (insufficient funds)
- **Balance never goes negative** ✓

## Why It Happens

1. **Check balance**: Process sees sufficient funds
2. **Delay**: While processing, another process also checks
3. **Both see same balance**: Race window opens
4. **Both withdraw**: Overdraw the account

This is a **check-then-act** race condition - the check and the action are NOT atomic.

## The Solution: Mutex

```typescript
await mutex.acquire();
try {
  // ATOMIC OPERATION
  const balance = readBalance();
  if (balance >= amount) {
    withdraw(amount);
  }
} finally {
  mutex.release();
}
```

The mutex ensures:

- Only one withdrawal at a time
- Check and withdrawal happen atomically
- No race window between check and act

## Real-World Examples

This same pattern causes problems in:

- **Banking systems**: Overdrafts, double withdrawals
- **E-commerce**: Inventory overselling
- **Ticket sales**: Overbooking
- **Resource allocation**: Double-booking resources

## Key Takeaway

Never trust a check that happens separately from the action. Always make check-and-act operations atomic using synchronization primitives like mutexes.
