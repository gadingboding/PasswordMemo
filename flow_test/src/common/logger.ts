/**
 * Logger utility for flow tests
 * 
 * Provides structured logging with different levels and test result reporting
 * Follows the specification for concise but informative logging
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  testName?: string;
  step?: string;
  data?: any;
  error?: Error;
}

export interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  steps: StepResult[];
  error?: Error;
  dataDumps?: { [key: string]: any };
}

export interface StepResult {
  name: string;
  success: boolean;
  duration: number;
  message?: string;
  error?: Error;
}

export class Logger {
  private logLevel: LogLevel;
  private logEntries: LogEntry[] = [];
  private testName: string;
  private logsDir: string;
  private startTime: number;

  constructor(testName: string, logLevel: LogLevel = LogLevel.INFO) {
    this.testName = testName;
    this.logLevel = logLevel;
    this.logsDir = join('test-results', testName, 'logs');
    this.startTime = Date.now();
    
    // Ensure logs directory exists
    try {
      mkdirSync(this.logsDir, { recursive: true });
    } catch (error) {
      console.warn(`Warning: Failed to create logs directory: ${error}`);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, undefined, error, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, undefined, undefined, data);
  }

  /**
   * Log an info message
   */
  info(message: string, step?: string, data?: any): void {
    this.log(LogLevel.INFO, message, step, undefined, data);
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, undefined, undefined, data);
  }

  /**
   * Log a step completion
   */
  stepComplete(stepName: string, success: boolean, message?: string, error?: Error): void {
    const status = success ? '✅' : '❌';
    const logMessage = `${status} ${stepName}${message ? `: ${message}` : ''}`;
    this.log(
      success ? LogLevel.INFO : LogLevel.ERROR,
      logMessage,
      stepName,
      error
    );
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, step?: string, error?: Error, data?: any): void {
    if (level > this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      testName: this.testName,
      step,
      data,
      error
    };

    this.logEntries.push(entry);

    // Only output errors to console, everything else goes to log file
    if (level === LogLevel.ERROR) {
      const levelStr = LogLevel[level];
      const timestamp = new Date().toLocaleTimeString();
      const stepStr = step ? `[${step}] ` : '';
      const errorStr = error ? `\n  Error: ${error.message}` : '';

      console.log(`[${timestamp}] [${levelStr}] ${stepStr}${message}${errorStr}`);
    }
  }

  /**
   * Dump data to file for debugging
   */
  dumpData(filename: string, data: any): string {
    const filePath = join(this.logsDir, filename);
    try {
      const jsonData = JSON.stringify(data, null, 4);
      writeFileSync(filePath, jsonData, 'utf-8');
      // Removed debug log to keep console clean
      return filePath;
    } catch (error) {
      // Only log errors to console
      console.error(`Failed to dump data to ${filename}: ${error}`);
      return '';
    }
  }

  /**
   * Compare expected vs actual data and log differences
   */
  compareData(description: string, expected: any, actual: any): boolean {
    const isEqual = this.deepEqual(expected, actual);
    
    if (isEqual) {
      this.info(`✅ ${description}: Data matches expected values`);
    } else {
      this.error(`❌ ${description}: Data mismatch detected`);
      
      // Dump both expected and actual data for comparison
      const expectedFile = this.dumpData(`${description.replace(/\s+/g, '-').toLowerCase()}-expected.json`, expected);
      const actualFile = this.dumpData(`${description.replace(/\s+/g, '-').toLowerCase()}-actual.json`, actual);
      
      this.info(`Expected data dumped to: ${expectedFile}`);
      this.info(`Actual data dumped to: ${actualFile}`);
    }
    
    return isEqual;
  }

  /**
   * Deep equality check
   */
  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return false;
    
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 !== 'object') return false;
    
    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
    
    if (Array.isArray(obj1)) {
      if (obj1.length !== obj2.length) return false;
      for (let i = 0; i < obj1.length; i++) {
        if (!this.deepEqual(obj1[i], obj2[i])) return false;
      }
      return true;
    }
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  }

  /**
   * Generate test result summary
   */
  generateTestResult(steps: StepResult[], error?: Error): TestResult {
    const duration = Date.now() - this.startTime;
    const success = !error && steps.every(step => step.success);
    
    // Write logs as plain text file instead of JSON
    const logFile = this.writePlainTextLog();
    
    return {
      testName: this.testName,
      success,
      duration,
      steps,
      error,
      dataDumps: {
        logFile
      }
    };
  }

  /**
   * Save test result to file
   */
  saveTestResult(result: TestResult): string {
    const resultFile = join(this.logsDir, 'test-result.json');
    try {
      writeFileSync(resultFile, JSON.stringify(result, null, 4), 'utf-8');
      console.log(`\nTest result saved to: ${resultFile}`);
      return resultFile;
    } catch (error) {
      console.error(`Failed to save test result: ${error}`);
      return '';
    }
  }

  /**
   * Write logs as plain text file
   */
  private writePlainTextLog(): string {
    const logFile = join(this.logsDir, 'test-log.txt');
    try {
      let logContent = `Test Log: ${this.testName}\n`;
      logContent += `Started: ${new Date(this.startTime).toISOString()}\n`;
      logContent += '='.repeat(60) + '\n\n';

      let lastStep: string | undefined;
      
      for (const entry of this.logEntries) {
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        const level = LogLevel[entry.level];
        const step = entry.step ? `[${entry.step}] ` : '';
        
        // Add empty line between different steps
        if (lastStep && lastStep !== entry.step) {
          logContent += '\n';
        }
        lastStep = entry.step;
        
        // Remove emojis from message
        const cleanMessage = entry.message.replace(/[✅❌📊🚀📋🔧⚠️💥🎉]/g, '').trim();
        
        logContent += `[${timestamp}] [${level}] ${step}${cleanMessage}\n`;
        
        if (entry.error) {
          logContent += `  Error: ${entry.error.message}\n`;
          if (entry.error.stack) {
            logContent += `  Stack: ${entry.error.stack}\n`;
          }
        }
        
        if (entry.data && entry.level >= LogLevel.DEBUG) {
          logContent += `  Data: ${JSON.stringify(entry.data, null, 4)}\n`;
        }
      }

      writeFileSync(logFile, logContent, 'utf-8');
      return logFile;
    } catch (error) {
      console.error(`Failed to write plain text log: ${error}`);
      return '';
    }
  }
}

/**
 * Factory function to create logger
 */
export function createLogger(testName: string, logLevel?: LogLevel): Logger {
  return new Logger(testName, logLevel);
}