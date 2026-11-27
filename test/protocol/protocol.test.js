const https = require('https');
const { once } = require('node:events');
const WebSocket = require('ws');
const { createStartedTestServers } = require('../helpers/createTestApp');

describe('Protocol-specific levels', () => {
  let runtime;

  beforeAll(async () => {
    runtime = await createStartedTestServers();
  });

  afterAll(async () => {
    await runtime.close();
  });

  test('15 unlocks three progressively larger mazes in the same connection', async () => {
    const ws = new WebSocket(
      `ws://127.0.0.1:${runtime.httpPort}/api/15/challenge`
    );
    const read = async () => JSON.parse((await once(ws, 'message'))[0]);
    const send = (data) => {
      const response = read();
      ws.send(JSON.stringify(data));
      return response;
    };
    const move = (direction) => send({ action: 'move', direction });
    // 固定方向选择，让 DFS 逐列蛇形遍历房间。
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);

    try {
      expect((await read()).message).toContain('WebSocket connected');
      expect(await send(null)).toEqual({ error: 'invalid action' });
      expect(await move('down')).toEqual({ error: 'game not initialized' });

      let start = await send({ action: 'init' });
      const closed = once(ws, 'close');
      for (const [index, size] of [7, 13, 20].entries()) {
        expect(start).toMatchObject({
          stage: index + 1,
          stage_count: 3,
          x: size,
          y: size,
          current_location: { x: 1, y: 1 },
        });
        expect(await send({ action: 'init' })).toEqual(start);
        expect(await send({ action: 'next', flag: 'premature' })).toEqual({
          error: 'stage not completed',
        });

        const blocked = await move('up');
        expect(blocked).toEqual({
          success: false,
          wall: 1,
          win: false,
          current_location: start.current_location,
          view: start.view,
        });
        const responses = [start, blocked];

        const rooms = Math.floor((size - 1) / 2);
        for (let col = 0; col < rooms; col++) {
          if (col % 2 === 0 || col < rooms - 1) {
            for (let step = 0; step < size - 3; step++) {
              responses.push(await move(col % 2 === 0 ? 'down' : 'up'));
            }
          }
          if (col < rooms - 1) {
            const distance = col === rooms - 2 && size % 2 === 0 ? 3 : 2;
            for (let step = 0; step < distance; step++) {
              responses.push(await move('right'));
            }
          }
        }

        const win = responses.at(-1);
        const finalStage = index === 2;
        expect(win).toMatchObject({
          success: true,
          wall: 0,
          win: true,
          complete: finalStage,
          current_location: { x: size - 2, y: size - 2 },
        });
        const { maze } = win;
        expect(maze).toHaveLength(size);
        for (const [rowIndex, row] of maze.entries()) {
          expect(row).toHaveLength(size);
          if (rowIndex === 0 || rowIndex === size - 1) {
            expect(row).toEqual(Array(size).fill(1));
          } else {
            expect([row[0], row[size - 1]]).toEqual([1, 1]);
          }
        }
        for (const response of responses) {
          const { x, y } = response.current_location;
          expect(response.view).toEqual(
            maze.slice(y - 1, y + 2).map((row) => row.slice(x - 1, x + 2))
          );
          if (response !== win) {
            expect(response).not.toHaveProperty('flag');
            expect(response).not.toHaveProperty('maze');
          }
        }

        if (finalStage) {
          expect(win.flag).toBe('16-7kq2m9x4bz');
        } else {
          expect(win.flag).toMatch(/^15-[0-9a-f]{10}$/);
          expect(await move('left')).toEqual({ error: 'stage completed' });
          expect(await send({ action: 'next', flag: 'invalid' })).toEqual({
            error: 'invalid stage flag',
          });
          expect(await send({ action: 'init' })).toMatchObject({
            stage: index + 1,
            flag: win.flag,
            win: true,
          });
          start = await send({ action: 'next', flag: win.flag });
        }
      }
      expect((await closed)[0]).toBe(1000);
    } finally {
      random.mockRestore();
      ws.terminate();
    }
  });

  // 17 关把线索放在 Trailer 中，需通过真实 HTTPS 请求读取响应结束后的 trailers。
  test('17 returns the next clue in the response trailer', async () => {
    const res = await httpsRequest({
      port: runtime.httpsPort,
      path: '/api/17',
    });

    expect(res.status).toBe(200);
    expect(res.headers.trailer.toLowerCase()).toContain('x-never-be-apart');
    expect(res.trailers['x-never-be-apart']).toContain('18-p3t7w0j6kd');
  });
});

function httpsRequest({ port, path }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'GET',
        rejectUnauthorized: false,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            trailers: res.trailers,
            bodyText: data,
          });
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}
