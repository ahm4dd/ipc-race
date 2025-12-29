/**
 * Shared TypeScript types for the OS concepts demo
 */

export interface DemoResult {
  success: boolean;
  message: string;
  output?: string;
  error?: string;
}

export interface IPCMessage {
  type: string;
  payload: unknown;
  timestamp: number;
  processId: number;
}

export interface RaceConditionScenario {
  name: string;
  description: string;
  expectedValue: number;
  actualValue: number;
  raceDetected: boolean;
}

export interface Account {
  id: number;
  balance: number;
}

export interface InventoryItem {
  id: number;
  product: string;
  quantity: number;
}

export interface Booking {
  id: number;
  seatNumber: number;
  userId: number;
}
