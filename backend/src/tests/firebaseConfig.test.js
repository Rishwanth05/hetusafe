'use strict';

// lib/pushMessage is not matched by the moduleNameMapper entry for
// 'config/firebase', so the real module is loaded — no extra setup needed.
const { buildPushMessage } = require('../lib/pushMessage');

describe('buildPushMessage — FCM payload helper', () => {
  it('returns data-only: no notification key', () => {
    const msg = buildPushMessage('Title', 'Body', {});
    expect(msg).not.toHaveProperty('notification');
  });

  it('puts title and body in data', () => {
    const msg = buildPushMessage('My Title', 'My Body', {});
    expect(msg.data).toMatchObject({ title: 'My Title', body: 'My Body' });
  });

  it('stringifies numeric extra data fields', () => {
    const msg = buildPushMessage('T', 'B', { type: 'new_report', reportId: 99 });
    expect(msg.data).toEqual({ type: 'new_report', reportId: '99', title: 'T', body: 'B' });
  });

  it('title and body override caller keys of the same name', () => {
    const msg = buildPushMessage('Real Title', 'Real Body', {
      title: 'caller-title',
      body: 'caller-body',
      type: 'x',
    });
    expect(msg.data.title).toBe('Real Title');
    expect(msg.data.body).toBe('Real Body');
    expect(msg.data.type).toBe('x');
  });

  it('stringifies boolean extra data fields', () => {
    const msg = buildPushMessage('T', 'B', { urgent: true, count: 0 });
    expect(msg.data.urgent).toBe('true');
    expect(msg.data.count).toBe('0');
  });

  it('works with no extra data argument', () => {
    const msg = buildPushMessage('T', 'B');
    expect(msg.data).toEqual({ title: 'T', body: 'B' });
  });

  it('returns the correct shape for a typical new-report push', () => {
    const msg = buildPushMessage('🚨 New Report', 'A hazard nearby', {
      type: 'new_report',
      reportId: 42,
    });
    expect(msg).toEqual({
      data: {
        type: 'new_report',
        reportId: '42',
        title: '🚨 New Report',
        body: 'A hazard nearby',
      },
    });
    expect(msg).not.toHaveProperty('notification');
  });
});
