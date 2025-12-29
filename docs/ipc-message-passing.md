# Message Passing Demo

## What This Demonstrates

This demonstrates **message passing** as an IPC mechanism where independent processes communicate asynchronously through a message queue, without needing direct connections to each other.

## Concept

Message passing provides:

- **Decoupling**: Processes don't need to know about each other
- **Asynchronous communication**: Senders don't wait for receivers
- **Queue-based**: Messages are buffered in First-In-First-Out (FIFO) order
- **Reliability**: Messages persist even if receiver is temporarily unavailable

## How It Works

### Message Queue (`message-passing.ts`)

1. Creates a JSON file acting as a message queue
2. Spawns 2 sender processes and 1 receiver process
3. Senders add messages to the queue
4. Receiver dequeues and processes messages
5. All processes operate independently

### Senders (`message-sender.ts`)

- Each sender is given a name and message count
- Sends messages at random intervals
- Adds messages to the queue file
- Doesn't wait for acknowledgment

### Receiver (`message-receiver.ts`)

- Polls the queue for new messages
- Dequeues messages in FIFO order
- Calculates message latency (time from send to receive)
- Continues consuming until queue is empty

## Message Format

```typescript
{
  id: number; // Unique message ID
  from: string; // Sender process name
  to: string; // Receiver name
  content: string; // Message payload
  timestamp: number; // When message was sent
}
```

## How to Run

```bash
bun run src/ipc/message-passing.ts
```

## Expected Output

You should see:

- Queue initialized
- Sender-A sending 3 messages
- Sender-B sending 2 messages
- Receiver consuming all 5 messages
- Latency measurements for each message
- All messages consumed successfully

## Key Observations

- **Independent processes**: Senders and receiver don't coordinate directly
- **Non-deterministic order**: Message order depends on random send delays
- **Latency varies**: Shows time between message creation and consumption
- **Graceful handling**: Receiver waits for messages and shuts down when done

## Real-World Applications

- **Web services**: Request/response queues (like RabbitMQ, AWS SQS)
- **Microservices**: Inter-service communication
- **Task distribution**: Job queues for background workers
- **Event systems**: Publish/subscribe patterns

## Advantages Over Direct Communication

- Senders don't block waiting for receivers
- System can handle temporary receiver failures
- Can add more senders/receivers without changing code
- Natural load balancing with multiple receivers
