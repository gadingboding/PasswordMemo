/**
 * Main test runner for all flow tests
 * 
 * This script runs all flow tests and provides a summary of results
 */

import { UnifiedWorkflowTest } from './tests/unified-workflow-test/test.js';
import { WebDAVSyncTest } from './tests/webdav-sync-test/test.js';
import { SimpleWebDAVSyncTest } from './tests/webdav-simple-test/test.js';
import { VaultSaveLoadTest } from './tests/vault-save-load-test/test.js';
import { KDFConfigTest } from './tests/kdf-config-test/test.js';
import { SaltUpdateTest } from './tests/salt-update-test/test.js';
import { createLogger, LogLevel, TestUtils } from './common/index.js';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: Error;
}

class TestRunner {
  private results: TestResult[] = [];

  async run(): Promise<void> {
    console.log('🚀 Starting All Flow Tests\n');
    
    const startTime = Date.now();
    
    // Run each test
    await this.runTest('Unified Workflow Test', () => this.runUnifiedWorkflowTest());
    await this.runTest('WebDAV Sync Test', () => this.runWebDAVSyncTest());
    await this.runTest('Simple WebDAV Sync Test', () => this.runSimpleWebDAVSyncTest());
    await this.runTest('Vault Save/Load Interface Test', () => this.runVaultSaveLoadTest());
    await this.runTest('KDF Configuration Test', () => this.runKDFConfigTest());
    await this.runTest('Salt Update Test', () => this.runSaltUpdateTest());
    
    const totalDuration = Date.now() - startTime;
    
    // Generate summary
    this.generateSummary(totalDuration);
  }

  private async runTest(name: string, testFunction: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`\n📋 Running ${name}...`);
      await testFunction();
      
      const duration = Date.now() - startTime;
      this.results.push({
        name,
        success: true,
        duration
      });
      
      console.log(`✅ ${name} completed successfully`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        name,
        success: false,
        duration,
        error: error as Error
      });
      
      console.error(`❌ ${name} failed: ${(error as Error).message}`);
    }
  }

  private async runUnifiedWorkflowTest(): Promise<void> {
    const test = new UnifiedWorkflowTest();
    await test.run();
  }

  private async runWebDAVSyncTest(): Promise<void> {
    const test = new WebDAVSyncTest();
    await test.run();
  }

  private async runSimpleWebDAVSyncTest(): Promise<void> {
    const test = new SimpleWebDAVSyncTest();
    await test.run();
  }

  private async runVaultSaveLoadTest(): Promise<void> {
    const test = new VaultSaveLoadTest();
    await test.run();
  }

  private async runKDFConfigTest(): Promise<void> {
    const test = new KDFConfigTest();
    await test.run();
  }

  private async runSaltUpdateTest(): Promise<void> {
    const test = new SaltUpdateTest();
    await test.run();
  }

  private generateSummary(totalDuration: number): void {
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.filter(r => !r.success).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${successfulTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️  Total Duration: ${TestUtils.formatDuration(totalDuration)}`);
    
    console.log('\n📋 Individual Test Results:');
    console.log('-'.repeat(40));
    
    for (const result of this.results) {
      const status = result.success ? '✅' : '❌';
      const duration = TestUtils.formatDuration(result.duration);
      console.log(`${status} ${result.name} (${duration})`);
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (failedTests === 0) {
      console.log('🎉 All tests passed! Everything is working correctly.');
      process.exit(0);
    } else {
      console.log('💥 Some tests failed. Please check the logs above for details.');
      process.exit(1);
    }
  }
}

export { TestRunner };

// Run the test runner if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  runner.run().catch(console.error);
}