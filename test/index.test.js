const { registerShutdownHandlers } = require('../src/index');

describe('registerShutdownHandlers', () => {
  test('gracefully stops servers and exits 0 on SIGTERM', async () => {
    const calls = [];
    let stopResolve;
    const processRef = createProcessRef();
    const logger = createLoggerSpy();
    const servers = {
      stop: jest.fn(() => {
        return new Promise((resolve) => {
          stopResolve = resolve;
        });
      }),
    };
    const exit = jest.fn((code) => {
      calls.push(code);
    });

    registerShutdownHandlers({
      logger,
      servers,
      processRef,
      exit,
    });

    processRef.emit('SIGTERM');
    processRef.emit('SIGINT');
    await waitForMicrotasks();

    expect(servers.stop).toHaveBeenCalledTimes(1);
    expect(exit).not.toHaveBeenCalled();

    stopResolve();
    await waitForMicrotasks();

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
    expect(calls).toEqual([0]);
    expect(logger.info).toHaveBeenCalledWith(
      'received SIGTERM, starting graceful shutdown'
    );
    expect(logger.info).toHaveBeenCalledWith('graceful shutdown completed');
  });

  test('logs fatal rejection and exits 1 after shutdown', async () => {
    const processRef = createProcessRef();
    const logger = createLoggerSpy();
    const servers = {
      stop: jest.fn().mockResolvedValue(undefined),
    };
    const exit = jest.fn();
    const reason = new Error('boom');

    registerShutdownHandlers({
      logger,
      servers,
      processRef,
      exit,
    });

    processRef.emit('unhandledRejection', reason);
    await waitForMicrotasks();

    expect(logger.error).toHaveBeenCalledWith(
      `unhandledRejection: ${reason.stack}`
    );
    expect(servers.stop).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  test('exits 1 if graceful shutdown itself fails', async () => {
    const processRef = createProcessRef();
    const logger = createLoggerSpy();
    const servers = {
      stop: jest.fn().mockRejectedValue(new Error('close failed')),
    };
    const exit = jest.fn();

    registerShutdownHandlers({
      logger,
      servers,
      processRef,
      exit,
    });

    processRef.emit('SIGINT');
    await waitForMicrotasks();

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('graceful shutdown failed: Error: close failed')
    );
    expect(exit).toHaveBeenCalledWith(1);
  });
});

function createProcessRef() {
  const listeners = new Map();

  return {
    on(event, handler) {
      listeners.set(event, handler);
    },
    emit(event, ...args) {
      const handler = listeners.get(event);
      if (handler) {
        handler(...args);
      }
    },
  };
}

function createLoggerSpy() {
  return {
    info: jest.fn(),
    error: jest.fn(),
  };
}

function waitForMicrotasks() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}
