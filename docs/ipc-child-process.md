# Child Process Communication Demo

## What This Demonstrates

This demonstrates **Inter-Process Communication (IPC)** using parent-child process relationships with **stdin/stdout** as the communication channel.

## Concept

When a parent process spawns a child process:

- The parent can write to the child's **stdin** (standard input)
- The child can write to its **stdout** (standard output)
- The parent reads from the child's **stdout**
- Messages are exchanged in both directions

This pattern enables:

- **Task distribution**: Parent delegates work to child processes
- **Process isolation**: Each process has its own memory space
- **Coordinated work**: Processes can synchronize through messages

## How It Works

### Parent Process (`child-process.ts`)

1. Spawns a child process using Bun's `spawn()` API
2. Sends structured JSON messages via the child's stdin
3. Reads responses from the child's stdout
4. Coordinates task execution and graceful shutdown

### Child Process (`child-worker.ts`)

1. Listens for messages on stdin
2. Processes different message types: PING, TASK, EXIT
3. Performs work (e.g., mathematical operations)
4. Sends results back via stdout

### Message Protocol

All messages follow this structure:
\`\`\`typescript
{
type: string; // Message type (PING, TASK, RESULT, etc.)
payload: unknown; // Message-specific data
timestamp: number; // When the message was sent
processId: number; // Sender's process ID
}
\`\`\`

## How to Run

\`\`\`bash
bun run src/ipc/child-process.ts
\`\`\`

## Expected Output

You should see:

1. **Parent** spawning the child process
2. **Parent** sending PING → **Child** responding with PONG
3. **Parent** sending multiple tasks
4. **Child** processing eachtask and returning results
5. **Parent** sending EXIT signal
6. **Child** sending GOODBYE and gracefully shutting down

Each message will show:

- Timestamp
- Process ID (different for parent and child)
- Message type and payload

## Real-World Applications

- **Web servers**: Master process spawns worker processes
- **Task queues**: Distribute jobs to worker processes
- **Build systems**: Parallel compilation in separate processes
- **Testing**: Run tests in isolated processes
