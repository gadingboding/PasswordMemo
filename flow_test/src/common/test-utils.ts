/**
 * Common test utilities for flow tests
 *
 * Provides shared utilities for test cleanup and other common operations
 */

import { rmSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Clean up test results directory
 * @param testName Name of the test
 * @param parentDir Optional parent directory for hierarchical structure
 */
export function cleanTestResults(testName: string, parentDir?: string): void {
  // Determine the base directory path
  const baseDir = parentDir
    ? join(process.cwd(), 'test-results', parentDir, testName)
    : join(process.cwd(), 'test-results', testName);
  
  // Clean up logs directory
  const logsDir = join(baseDir, 'logs');
  if (existsSync(logsDir)) {
    try {
      rmSync(logsDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors
    }
  }
  
  // Clean up vault data file in test results directory
  const vaultDataFile = join(baseDir, 'vault-data.json');
  if (existsSync(vaultDataFile)) {
    try {
      rmSync(vaultDataFile, { force: true });
    } catch (error) {
      // Ignore errors
    }
  }
  
  // Clean up user profile file in test results directory
  const userProfileFile = join(baseDir, 'user-profile.json');
  if (existsSync(userProfileFile)) {
    try {
      rmSync(userProfileFile, { force: true });
    } catch (error) {
      // Ignore errors
    }
  }
}