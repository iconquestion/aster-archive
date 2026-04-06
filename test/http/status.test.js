const request = require('supertest');
const { createTestApp } = require('../helpers/createTestApp');

describe('GET /api/status', () => {
  test('returns ok response', async () => {
    const app = createTestApp();

    const res = await request(app).get('/api/status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'ok' });
  });
});
