import type { Logger as ILogger } from './types';

const COLOR_RED = '\x1b[31m';
const COLOR_GREEN = '\x1b[32m';
const COLOR_YELLOW = '\x1b[33m';
const COLOR_MAGENTA = '\x1b[35m';

const COLOR_RESET = '\x1b[0m';

// eslint-disable-next-line no-control-regex
const FORMATING_PATTERN = /\u001b.*?m/g;

export class Logger implements ILogger {
  constructor(readonly name: string) {}

  debug(message: any, ...args: any[]): void {
    const logMessage = `[${this.name}] [DEBUG]:  ${message} ${args.join(' ')}`;

    console.debug(COLOR_MAGENTA, logMessage, COLOR_RESET);
  }

  log(message: any, ...args: any[]): void {
    const logMessage = `[${this.name}] [LOG]:  ${message} ${args.join(' ')}`;

    console.log(COLOR_GREEN, logMessage, COLOR_RESET);
  }

  warn(message: any, ...args: any[]): void {
    const logMessage = `[${this.name}] [WARN]:  ${message} ${args.join(' ')}`;

    console.warn(COLOR_YELLOW, logMessage, COLOR_RESET);
  }

  error(message: any, ...args: any[]): void {
    const logMessage = `[${this.name}] [ERROR]:  ${message} ${args.join(' ')}`;

    console.error(COLOR_RED, logMessage, COLOR_RESET);
  }
}
