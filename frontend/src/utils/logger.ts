/**
 * Development and production logging utility
 * Only logs in development environment to keep production console clean
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  log: (message: string, ...args: any[]) => void;
}

class DevLogger implements Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    // Always log errors, even in production
    console.error(this.formatMessage('error', message), ...args);
  }

  log(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage('info', message), ...args);
    }
  }
}

// Export a singleton logger instance
export const logger = new DevLogger();

// Export individual functions for convenience
export const { debug, info, warn, error, log } = logger;

// Default export
export default logger;