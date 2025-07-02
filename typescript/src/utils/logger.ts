export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  LOG = 'LOG'
}

export default class Logger {
  private readonly logger: Console;

  constructor(logger: Console = console) {
    this.logger = logger;
  }

  private format(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  info(message: string, ...params: unknown[]): void {
    this.logger.info(this.format(LogLevel.INFO, message), ...params);
  }

  warn(message: string, ...params: unknown[]): void {
    this.logger.warn(this.format(LogLevel.WARN, message), ...params);
  }

  error(message: string, ...params: unknown[]): void {
    this.logger.error(this.format(LogLevel.ERROR, message), ...params);
  }

  debug(message: string, ...params: unknown[]): void {
    this.logger.debug(this.format(LogLevel.DEBUG, message), ...params);
  }

  log(message: string, ...params: unknown[]): void {
    this.logger.log(this.format(LogLevel.LOG, message), ...params);
  }
}
