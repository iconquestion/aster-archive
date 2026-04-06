const fs = require('fs');
const os = require('os');
const path = require('path');
const DailyRotateFile = require('winston-daily-rotate-file');
const { createLogger } = require('../src/logger');

describe('createLogger', () => {
  test('creates log directory and registers rotate file transports', () => {
    const logsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-test-'));
    const nestedLogsDir = path.join(logsDir, 'nested-logs');

    const logger = createLogger({
      logsDir: nestedLogsDir,
      logRotateDatePattern: 'YYYY-MM-DD',
      logRotateMaxFiles: '14d',
      logRotateMaxSize: '20m',
      logRotateZippedArchive: true,
    });

    expect(fs.existsSync(nestedLogsDir)).toBe(true);

    const rotateTransports = logger.transports.filter((transport) => {
      return transport instanceof DailyRotateFile;
    });

    expect(rotateTransports).toHaveLength(2);
    expect(
      rotateTransports.map((transport) => {
        return transport.filename;
      })
    ).toEqual(['info-%DATE%.log', 'error-%DATE%.log']);
    expect(
      rotateTransports.map((transport) => {
        return transport.dirname;
      })
    ).toEqual([nestedLogsDir, nestedLogsDir]);
    expect(
      rotateTransports.map((transport) => {
        return transport.options.maxFiles;
      })
    ).toEqual(['14d', '14d']);
    expect(
      rotateTransports.map((transport) => {
        return transport.options.maxSize;
      })
    ).toEqual(['20m', '20m']);
    expect(
      rotateTransports.map((transport) => {
        return transport.options.zippedArchive;
      })
    ).toEqual([true, true]);

    logger.close();
  });

  test('separates info and error levels into dedicated rotate transports', () => {
    const logsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-levels-'));
    const logger = createLogger({ logsDir });

    const infoTransport = logger.transports.find((transport) => {
      return (
        transport instanceof DailyRotateFile &&
        transport.filename === 'info-%DATE%.log'
      );
    });
    const errorTransport = logger.transports.find((transport) => {
      return (
        transport instanceof DailyRotateFile &&
        transport.filename === 'error-%DATE%.log'
      );
    });

    expect(infoTransport.level).toBe('info');
    expect(errorTransport.level).toBe('error');
    expect(infoTransport.format.transform({ level: 'info' })).toEqual({
      level: 'info',
    });
    expect(infoTransport.format.transform({ level: 'error' })).toBe(false);

    logger.close();
  });
});
