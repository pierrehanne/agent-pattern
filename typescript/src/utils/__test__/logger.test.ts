import Logger from '../logger';

describe('Logger', () => {
  let mockConsole: Console;
  let logger: Logger;

  beforeEach(() => {
    mockConsole = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as unknown as Console;

    logger = new Logger(mockConsole);
  });

  const message = 'Test message';
  const params = ['param1', 42, { key: 'value' }];

  it('should log info message correctly', () => {
    logger.info(message, ...params);
    expect(mockConsole.info).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*\] \[INFO\] Test message/),
      ...params
    );
  });

  it('should log warn message correctly', () => {
    logger.warn(message, ...params);
    expect(mockConsole.warn).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*\] \[WARN\] Test message/),
      ...params
    );
  });

  it('should log error message correctly', () => {
    logger.error(message, ...params);
    expect(mockConsole.error).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*\] \[ERROR\] Test message/),
      ...params
    );
  });

  it('should log debug message correctly', () => {
    logger.debug(message, ...params);
    expect(mockConsole.debug).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*\] \[DEBUG\] Test message/),
      ...params
    );
  });

  it('should log generic log message correctly', () => {
    logger.log(message, ...params);
    expect(mockConsole.log).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*\] \[LOG\] Test message/),
      ...params
    );
  });
});
