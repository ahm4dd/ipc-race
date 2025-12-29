# Producer-Consumer Demo

## What This Demonstrates

This demonstrates the classic **producer-consumer problem**, a fundamental concurrency pattern where producers generate items and add them to a shared buffer, while consumers take and process items from the buffer.

## Concept

The producer-consumer pattern addresses:- **Decoupling**: Producers and consumers work independently

- **Buffer management**: Limited buffer size requires coordination
- **Backpressure**: What happens when buffer fills up?
- **Synchronization**: Avoiding race conditions on the buffer

## How It Works

### Main Process (`producer-consumer.ts`)

1. Creates a shared buffer file (max size: 5 items)
2. Spawns 2 producer processes
3. Spawns 2 consumer processes
4. Waits for producers to finish
5. Allows consumers to drain the buffer

### Producers (`producer.ts`)

Each producer:

- Generates a specified number of items
- Checks if buffer has space
- **If buffer full**: Waits and retries (backpressure)
- Adds item to buffer and increments production count
- Simulates variable production time

### Consumers (`consumer.ts`)

Each consumer:

- Continuously checks buffer for items
- **If items available**: Dequeues and processes one
- **If buffer empty**: Waits briefly, then shuts down if empty persists
- Tracks total items consumed

## Key Challenges Addressed

### 1. Buffer Overflow

When producers generate items faster than consumers can process them, the buffer fills up. Our producers handle this with **backpressure** - they wait and retry when buffer is full.

### 2. Buffer Underflow

When consumers are faster than producers, the buffer empties. Our consumers wait briefly and shut down gracefully when no more items are expected.

### 3. Coordination

Multiple producers and consumers access the same buffer. Without proper coordination (which we'll add in later race condition solutions), this can cause data corruption.

## How to Run

```bash
bun run src/ipc/producer-consumer.ts
```

## Expected Output

You should see:

- Buffer initialized with max size 5
- Producer-1 producing 5 items
- Producer-2 producing 4 items
- Both consumers consuming items concurrently
- Buffer full warnings when producers must wait
- Consumers draining buffer after producers finish
- Final stats: 9 produced, 9 consumed, 0 remaining

## Real-World Applications

- **Web servers**: Request queue with worker threads
- **Video streaming**: Buffering video chunks
- **Print spooler**: Print jobs queue
- **Database connections**: Connection pool management
- **Messaging systems**: Kafka, RabbitMQ use this pattern

## Design Patterns

This demo shows:

- **Queue-based coordination**: FIFO buffer
- **Backpressure handling**: Producers wait when buffer full
- **Graceful shutdown**: Consumers detect completion
- **Load balancing**: Multiple consumers share the workload
