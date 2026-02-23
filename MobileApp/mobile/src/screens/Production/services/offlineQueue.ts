import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QualityCheckPayload } from '../types';

const QUEUE_KEY = '@cardose_qc_offline_queue';

export interface QueuedSubmission {
  id: string;
  payload: QualityCheckPayload;
  token: string;
  queuedAt: string;
}

export async function enqueue(
  payload: QualityCheckPayload,
  token: string
): Promise<string> {
  const queue = await getQueue();
  const id = `queued_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: QueuedSubmission = {
    id,
    payload,
    token,
    queuedAt: new Date().toISOString(),
  };
  queue.push(entry);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return id;
}

export async function getQueue(): Promise<QueuedSubmission[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((item) => item.id !== id);
  if (filtered.length === 0) {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } else {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  }
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
