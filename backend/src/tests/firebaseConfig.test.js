'use strict';

// Mock firebase-admin before the real module loads — the mock is applied when
// config/firebase.js requires 'firebase-admin' inside jest.requireActual below.
const mockSend = jest.fn();
const mockSendEachForMulticast = jest.fn();

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  messaging: () => ({
    send: mockSend,
    sendEachForMulticast: mockSendEachForMulticast,
  }),
}));

// jest.requireActual bypasses moduleNameMapper, loading the real config/firebase.js
// instead of the jest.fn() stub in __mocks__/firebase.js.
const { sendPushNotification, sendPushNotificationBatch } =
  jest.requireActual('../config/firebase');

describe('FCM payload shape — data-only (no notification field)', () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockSendEachForMulticast.mockReset();
    mockSend.mockResolvedValue('projects/proj/messages/msg-id');
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });
  });

  // ── sendPushNotification ────────────────────────────────────────────────────

  describe('sendPushNotification', () => {
    it('omits the notification key', async () => {
      await sendPushNotification('tok', 'Title', 'Body', { type: 'x' });
      const msg = mockSend.mock.calls[0][0];
      expect(msg).not.toHaveProperty('notification');
    });

    it('puts title and body in data', async () => {
      await sendPushNotification('tok', 'My Title', 'My Body', {});
      const msg = mockSend.mock.calls[0][0];
      expect(msg.data).toMatchObject({ title: 'My Title', body: 'My Body' });
    });

    it('stringifies extra data fields alongside title and body', async () => {
      await sendPushNotification('tok', 'T', 'B', { type: 'new_report', reportId: 99 });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.data).toEqual({ title: 'T', body: 'B', type: 'new_report', reportId: '99' });
    });
  });

  // ── sendPushNotificationBatch ───────────────────────────────────────────────

  describe('sendPushNotificationBatch', () => {
    it('omits the notification key in the multicast payload', async () => {
      await sendPushNotificationBatch(['t1', 't2'], 'Title', 'Body', { type: 'x' });
      const msg = mockSendEachForMulticast.mock.calls[0][0];
      expect(msg).not.toHaveProperty('notification');
    });

    it('puts title and body in data for batch', async () => {
      await sendPushNotificationBatch(['t1'], 'Batch Title', 'Batch Body', {});
      const msg = mockSendEachForMulticast.mock.calls[0][0];
      expect(msg.data).toMatchObject({ title: 'Batch Title', body: 'Batch Body' });
    });

    it('returns early without calling send when tokens array is empty', async () => {
      await sendPushNotificationBatch([], 'T', 'B', {});
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });
  });
});
