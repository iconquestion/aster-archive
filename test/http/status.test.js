const request = require('supertest');
const { createStartedTestAppServer } = require('../helpers/createTestApp');

describe('GET /api/status', () => {
  let runtime;

  beforeAll(async () => {
    runtime = await createStartedTestAppServer();
  });

  afterAll(async () => {
    await runtime.close();
  });

  test('returns ok response', async () => {
    const res = await request(runtime.origin).get('/api/status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'ok' });
  });
});
