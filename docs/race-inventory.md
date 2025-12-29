# Inventory Management Race Condition

## The Problem

When multiple customers attempt to purchase from limited stock concurrently, **overselling** can occur - the system sells more items than available.

## The Race Scenario

```
Stock: 10 Laptops

Customer A: CHECK stock (10) ✓
Customer B: CHECK stock (10) ✓  ← Both see full stock!
Customer C: CHECK stock (10) ✓  ← All three see same stock!

Customer A: PURCHASE (stock → 9)
Customer B: PURCHASE (stock → 8)
Customer C: PURCHASE (stock → 7)

Expected: 10 sold, 0 remaining
Actual: Often shows lost updates or overselling
```

## Real-World Impact

This exact race condition causes:

- **E-commerce sites**: Selling out-of-stock items
- **Concert tickets**: Overbooking venues
- **Limited editions**: Selling more than manufactured
- **Flash sales**: System chaos during high demand

## Running the Demo

### Race Condition (Problem)

```bash
bun run src/race-conditions/inventory/race.ts
```

**Setup**: 10 laptops in stock, 15 customers trying to buy  
**Expected**: 10 sold, 5 rejected  
**Actual** (with race): Lost updates, inconsistent stock counts

### Solution with Mutex

```bash
bun run src/race-conditions/inventory/solution.ts
```

**Result**: Exactly 10 sold, 5 properly rejected, stock never negative ✓

## Why It Happens

This is a **check-then-act** race condition:

1. **Check**: Customer reads stock quantity
2. **Delay**: Processing payment, verification
3. **Act**: Deduct from stock

The problem: Multiple customers can **check** at the same time, all seeing sufficient stock. Then they all **act**, causing overselling.

## The Solution: Mutex

```typescript
await mutex.acquire();
try {
  // ATOMIC OPERATION
  const stock = readStock();
  if (stock >= quantity) {
    purchase(quantity); // Only one customer at a time!
  } else {
    reject(); // Properly reject when out of stock
  }
} finally {
  mutex.release();
}
```

## Alternative Solutions

### 1. Optimistic Locking (Version Numbers)

```typescript
const item = { product: 'Laptop', stock: 10, version: 1 };

// Customer reads version
const currentVersion = item.version;

// Try to update only if version hasn't changed
if (item.version === current Version) {
  item.stock -= 1;
  item.version += 1;
  save();
} else {
  retry();  // Someone else updated, try again
}
```

**When to use**: Low contention (rare purchases)

### 2. Database Constraints

```sql
UPDATE inventory
SET quantity = quantity - 1
WHERE product_id = 1
  AND quantity >= 1;  -- Only succeeds if stock available

-- Check rows affected
IF rows_affected = 0 THEN
  reject_purchase();
END IF;
```

**When to use**: Database-backed inventory

### 3. Pre-reservation System

```typescript
// Step 1: Reserve item (temporary hold)
reserveItem(customerId, productId, expiresIn: 5 minutes);

// Step 2: Customer completes payment
// Step 3: Convert reservation to purchase OR release

```

**When to use**: Complex checkout flows

## Key Takeaways

- **Never trust separate check and act operations**
- **Make check-and-update atomic** (single operation)
- **Mutex ensures exclusive access** during critical section
- **Database transactions** can also solve this
- **Lost update problem** is common in inventory systems

## Prevention in Production

1. Use database transactions
2. Implement row-level locking
3. Use optimistic locking for low contention
4. Add constraint checks in database
5. Monitor for negative stock (alert system)
6. Implement reservation/hold mechanisms
