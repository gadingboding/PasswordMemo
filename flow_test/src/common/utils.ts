/**
 * Common utilities for flow tests
 * 
 * Provides helper functions for test execution, data validation, and error handling
 */

import { randomUUID } from 'crypto';

/**
 * Test execution utilities
 */
export class TestUtils {
  /**
   * Wait for a specified duration
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a random test ID
   */
  static generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate random password
   */
  static generateRandomPassword(length: number = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Generate random username
   */
  static generateRandomUsername(): string {
    const adjectives = ['happy', 'brave', 'clever', 'swift', 'bright', 'calm', 'eager', 'fancy'];
    const nouns = ['tiger', 'eagle', 'dolphin', 'falcon', 'panther', 'phoenix', 'dragon', 'wolf'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000);
    return `${adjective}-${noun}-${number}`;
  }

  /**
   * Retry an async operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw new Error(`Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`);
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        // Removed log to keep console output clean
        await this.wait(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Validate data structure (check if required fields exist)
   */
  static validateDataStructure(data: any, requiredFields: string[]): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    for (const field of requiredFields) {
      if (!(field in data)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare record counts and basic structure (not encrypted content)
   */
  static compareRecordStructure(expected: any[], actual: any[]): { match: boolean; differences: string[] } {
    const differences: string[] = [];

    if (expected.length !== actual.length) {
      differences.push(`Record count mismatch: expected ${expected.length}, got ${actual.length}`);
    }

    for (let i = 0; i < Math.min(expected.length, actual.length); i++) {
      const expRecord = expected[i];
      const actRecord = actual[i];

      // Check basic structure (not encrypted values)
      if (expRecord.title !== actRecord.title) {
        differences.push(`Record ${i} title mismatch: expected "${expRecord.title}", got "${actRecord.title}"`);
      }

      if (expRecord.fields.length !== actRecord.fields.length) {
        differences.push(`Record ${i} field count mismatch: expected ${expRecord.fields.length}, got ${actRecord.fields.length}`);
      }

      // Check field names and types (not values)
      for (let j = 0; j < Math.min(expRecord.fields.length, actRecord.fields.length); j++) {
        const expField = expRecord.fields[j];
        const actField = actRecord.fields[j];

        if (expField.name !== actField.name) {
          differences.push(`Record ${i} field ${j} name mismatch: expected "${expField.name}", got "${actField.name}"`);
        }

        if (expField.type !== actField.type) {
          differences.push(`Record ${i} field ${j} type mismatch: expected "${expField.type}", got "${actField.type}"`);
        }
      }
    }

    return {
      match: differences.length === 0,
      differences
    };
  }

  /**
   * Safe JSON parsing with fallback
   */
  static safeJsonParse(jsonString: string, fallback: any = {}): any {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return fallback;
    }
  }


  /**
   * Format duration in human-readable format
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Create a test summary
   */
  static createTestSummary(testName: string, success: boolean, duration: number, error?: Error): string {
    const status = success ? 'PASSED' : 'FAILED';
    const durationStr = this.formatDuration(duration);
    
    let summary = `\n=== ${testName} ${status} ===\n`;
    summary += `Duration: ${durationStr}\n`;
    
    if (error) {
      summary += `Error: ${error.message}\n`;
    }
    
    return summary;
  }
}

/**
 * Data validation utilities
 */
export class ValidationUtils {
  /**
   * Validate that data exists and is not empty
   */
  static validateExists(data: any, name: string): void {
    if (data == null) {
      throw new Error(`${name} is required but was not provided`);
    }
    
    if (Array.isArray(data) && data.length === 0) {
      throw new Error(`${name} cannot be empty`);
    }
    
    if (typeof data === 'object' && Object.keys(data).length === 0) {
      throw new Error(`${name} cannot be empty`);
    }
  }

  /**
   * Validate data type
   */
  static validateType(data: any, expectedType: string, name: string): void {
    const actualType = Array.isArray(data) ? 'array' : typeof data;
    
    if (actualType !== expectedType) {
      throw new Error(`${name} must be of type ${expectedType}, got ${actualType}`);
    }
  }

  /**
   * Validate string format (email, URL, etc.)
   */
  static validateStringFormat(data: string, format: 'email' | 'url' | 'uuid', name: string): void {
    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      url: /^https?:\/\/.+/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    };

    if (!patterns[format].test(data)) {
      throw new Error(`${name} must be a valid ${format}`);
    }
  }
}

/**
 * Error handling utilities
 */
export class ErrorUtils {
  /**
   * Wrap error with additional context
   */
  static wrapError(error: Error, context: string): Error {
    const wrappedError = new Error(`${context}: ${error.message}`);
    wrappedError.stack = error.stack;
    return wrappedError;
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: Error): boolean {
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'EHOSTUNREACH'
    ];
    
    return retryableErrors.some(pattern => error.message.includes(pattern));
  }

  /**
   * Extract error details for logging
   */
  static extractErrorDetails(error: Error): {
    message: string;
    stack?: string;
    code?: string;
    details?: any;
  } {
    const details: any = {
      message: error.message,
      stack: error.stack
    };

    // Try to extract error code if present
    const codeMatch = error.message.match(/(E[A-Z]+)/);
    if (codeMatch) {
      details.code = codeMatch[1];
    }

    return details;
  }
}