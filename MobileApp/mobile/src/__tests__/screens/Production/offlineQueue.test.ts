import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  enqueue,
  getQueue,
  removeFromQueue,
  clearQueue,
} from '../../../screens/Production/services/offlineQueue';
import type { QualityCheckPayload } from '../../../screens/Production/types';

const mockPayload: QualityCheckPayload = {
  order_id: 'order-1',
  checklist_items: [
    { id: 'default_1', name: 'Item 1', checked: true },
    { id: 'default_2', name: 'Item 2', checked: false },
  ],
  overall_status: 'needs_review',
  notes: 'Test notes',
  checked_by: 'user-1',
};

const TOKEN = 'test-token-abc';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('offlineQueue', () => {
  describe('getQueue', () => {
    it('returns empty array when nothing is stored', async () => {
      const queue = await getQueue();
      expect(queue).toEqual([]);
    });

    it('returns empty array when stored value is invalid JSON', async () => {
      await AsyncStorage.setItem('@cardose_qc_offline_queue', 'not-json');
      const queue = await getQueue();
      expect(queue).toEqual([]);
    });
  });

  describe('enqueue', () => {
    it('adds an entry to the queue', async () => {
      await enqueue(mockPayload, TOKEN);
      const queue = await getQueue();
      expect(queue).toHaveLength(1);
    });

    it('returns a unique ID starting with "queued_"', async () => {
      const id = await enqueue(mockPayload, TOKEN);
      expect(id).toMatch(/^queued_/);
    });

    it('stores payload and token in the entry', async () => {
      await enqueue(mockPayload, TOKEN);
      const queue = await getQueue();
      expect(queue[0].payload).toEqual(mockPayload);
      expect(queue[0].token).toBe(TOKEN);
    });

    it('stores a queuedAt timestamp', async () => {
      await enqueue(mockPayload, TOKEN);
      const queue = await getQueue();
      const date = new Date(queue[0].queuedAt);
      expect(date.getTime()).not.toBeNaN();
    });

    it('appends to existing queue entries', async () => {
      await enqueue(mockPayload, TOKEN);
      await enqueue({ ...mockPayload, order_id: 'order-2' }, TOKEN);
      const queue = await getQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0].payload.order_id).toBe('order-1');
      expect(queue[1].payload.order_id).toBe('order-2');
    });

    it('generates unique IDs for each entry', async () => {
      const id1 = await enqueue(mockPayload, TOKEN);
      const id2 = await enqueue(mockPayload, TOKEN);
      expect(id1).not.toBe(id2);
    });
  });

  describe('removeFromQueue', () => {
    it('removes a specific entry by ID', async () => {
      const id1 = await enqueue(mockPayload, TOKEN);
      const id2 = await enqueue({ ...mockPayload, order_id: 'order-2' }, TOKEN);

      await removeFromQueue(id1);
      const queue = await getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe(id2);
    });

    it('clears storage when last entry is removed', async () => {
      const id = await enqueue(mockPayload, TOKEN);
      await removeFromQueue(id);
      const queue = await getQueue();
      expect(queue).toEqual([]);
    });

    it('does nothing for non-existent ID', async () => {
      await enqueue(mockPayload, TOKEN);
      await removeFromQueue('non-existent');
      const queue = await getQueue();
      expect(queue).toHaveLength(1);
    });
  });

  describe('clearQueue', () => {
    it('removes all entries', async () => {
      await enqueue(mockPayload, TOKEN);
      await enqueue(mockPayload, TOKEN);
      await clearQueue();
      const queue = await getQueue();
      expect(queue).toEqual([]);
    });

    it('works on already-empty queue', async () => {
      await clearQueue();
      const queue = await getQueue();
      expect(queue).toEqual([]);
    });
  });
});
