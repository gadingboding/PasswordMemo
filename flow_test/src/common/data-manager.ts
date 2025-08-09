/**
 * Data Manager for Flow Tests
 * 
 * Provides centralized data access with configuration override support
 * Follows the specification for data management in flow tests
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface TestData {
  userProfile?: any;
  testData?: any;
  webdavConfig?: any;
  expectedResults?: any;
}

export interface DataManagerConfig {
  testName: string;
  overrideData?: Partial<TestData>;
}

export class DataManager {
  private config: DataManagerConfig;
  private data: TestData = {};
  private baseDataPath: string;
  private testDataPath: string;

  constructor(config: DataManagerConfig) {
    this.config = config;
    this.baseDataPath = join('data', 'common');
    this.testDataPath = join('data', config.testName);
    this.loadData();
  }

  /**
   * Load all data files with override support
   */
  private loadData(): void {
    // Load common data first
    this.loadCommonData();
    
    // Load test-specific data
    this.loadTestData();
    
    // Apply overrides
    if (this.config.overrideData) {
      this.data = {
        ...this.data,
        ...this.config.overrideData
      };
    }
    
    // Generate dynamic data
    this.generateDynamicData();
  }

  /**
   * Load common data files
   */
  private loadCommonData(): void {
    const commonFiles = {
      userProfile: 'user-profile.json',
      webdavConfig: 'webdav-config.json'
    };

    for (const [key, filename] of Object.entries(commonFiles)) {
      const filePath = join(this.baseDataPath, filename);
      if (existsSync(filePath)) {
        try {
          const fileContent = readFileSync(filePath, 'utf-8');
          (this.data as any)[key] = JSON.parse(fileContent);
        } catch (error) {
          console.warn(`Warning: Failed to load common data file ${filename}: ${error}`);
        }
      }
    }
  }

  /**
   * Load test-specific data files
   */
  private loadTestData(): void {
    const testFiles = {
      testData: 'test-data.json',
      expectedResults: 'expected-results.json'
    };

    for (const [key, filename] of Object.entries(testFiles)) {
      const filePath = join(this.testDataPath, filename);
      if (existsSync(filePath)) {
        try {
          const fileContent = readFileSync(filePath, 'utf-8');
          (this.data as any)[key] = JSON.parse(fileContent);
        } catch (error) {
          console.warn(`Warning: Failed to load test data file ${filename}: ${error}`);
        }
      }
    }
  }

  /**
   * Generate dynamic data (timestamps, random IDs, etc.)
   */
  private generateDynamicData(): void {
    // Add timestamp if not present
    if (!this.data.testData?.timestamp) {
      if (!this.data.testData) this.data.testData = {};
      this.data.testData.timestamp = new Date().toISOString();
    }

    // Add random ID if not present
    if (!this.data.testData?.testId) {
      if (!this.data.testData) this.data.testData = {};
      this.data.testData.testId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
  }

  /**
   * Get user profile data
   */
  getUserProfile(): any {
    return this.data.userProfile || {
      masterPassword: `test-password-${Math.random().toString(36).substring(2, 10)}`
    };
  }

  /**
   * Get test data
   */
  getTestData(): any {
    return this.data.testData || {};
  }

  /**
   * Get WebDAV configuration
   */
  getWebDAVConfig(): any {
    return this.data.webdavConfig || {};
  }

  /**
   * Get expected results
   */
  getExpectedResults(): any {
    return this.data.expectedResults || {};
  }

  /**
   * Get all data
   */
  getAllData(): TestData {
    return { ...this.data };
  }

  /**
   * Update data dynamically
   */
  updateData(updates: Partial<TestData>): void {
    this.data = {
      ...this.data,
      ...updates
    };
  }
}

/**
 * Factory function to create data manager
 */
export function createDataManager(testName: string, overrideData?: Partial<TestData>): DataManager {
  return new DataManager({
    testName,
    overrideData
  });
}