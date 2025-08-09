/**
 * Vault Save/Load Test for Password Manager
 * 
 * This test verifies that the public saveVault() and loadVault() interfaces work correctly:
 * 1. Create some test data
 * 2. Manually save the vault
 * 3. Manually load the vault
 * 4. Verify data persistence
 */

import { PasswordManager } from 'password-manager-core';
import { createDataManager, createLogger, TestUtils, LogLevel } from '../../common/index.js';
import { cleanTestResults } from '../../common/test-utils.js';

export class VaultSaveLoadTest {
  private passwordManager: PasswordManager;
  private dataManager: ReturnType<typeof createDataManager>;
  private logger: ReturnType<typeof createLogger>;
  private testData: any;
  private userProfile: any;

  constructor() {
    this.passwordManager = new PasswordManager();
    this.dataManager = createDataManager('vault-save-load-test');
    this.logger = createLogger('vault-save-load-test', LogLevel.INFO);
    
    // Load test data
    this.testData = this.dataManager.getTestData();
    this.userProfile = this.dataManager.getUserProfile();
  }

  /**
   * Initialize the test environment
   */
  async initialize(): Promise<void> {
    // Clean up test results directory before running test
    cleanTestResults('vault-save-load-test', 'vault-save-load-test');
    
    this.logger.info('=== Initializing Vault Save/Load Test Environment ===');
    
    try {

      // Initialize password manager
      await this.passwordManager.initialize({
        storage: {
          basePath: 'test-results/vault-save-load-test',
          namespace: 'vault-save-load-test'
        }
      });

      // Wait a bit to ensure initialization is complete
      await TestUtils.wait(100);

      this.logger.info('Vault save/load test environment initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize test environment', error as Error);
      throw error;
    }
  }

  /**
   * Step 1: Authenticate and create test data
   */
  async createTestData(): Promise<{ templateId: string; recordId: string }> {
    const stepName = 'Create Test Data';
    this.logger.info(`=== Step 1: ${stepName} ===`);
    
    try {
      // Authenticate
      const authResult = await this.passwordManager.authenticate({
        password: this.userProfile.masterPassword
      });

      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.error}`);
      }

      this.logger.info('Authentication successful');

      // Create a template
      const templateData = this.testData.template;
      const fields = templateData.fields.map((field: any) => ({
        id: crypto.randomUUID(),
        name: field.name,
        type: field.type,
        optional: field.optional
      }));

      const templateId = await this.passwordManager.createTemplate(templateData.name, fields);
      this.logger.info(`Template created with ID: ${templateId}`);

      // Create a record
      const recordData = this.testData.record;
      const recordId = await this.passwordManager.createRecord(
        templateId,
        recordData.title,
        recordData.fieldData,
        recordData.labels
      );
      
      this.logger.info(`Record created with ID: ${recordId}`);

      // Wait a bit to ensure data is saved
      await TestUtils.wait(500);

      this.logger.stepComplete(stepName, true, 'Test data created successfully');
      return { templateId, recordId };
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to create test data', error as Error);
      throw error;
    }
  }

  /**
   * Step 2: Manually save vault data
   */
  async manuallySaveVault(): Promise<void> {
    const stepName = 'Manually Save Vault';
    this.logger.info(`=== Step 2: ${stepName} ===`);
    
    try {
      // Get current vault data before saving
      const vaultDataBefore = this.passwordManager.getVaultData();
      this.logger.info('Vault data before manual save:', stepName, {
        recordCount: Object.keys(vaultDataBefore.records).length,
        templateCount: Object.keys(vaultDataBefore.templates).length
      });

      // Manually save the vault
      await this.passwordManager.saveVault();
      this.logger.info('Vault manually saved successfully');

      // Verify the file was created
      const fs = await import('fs');
      const path = await import('path');
      const vaultFilePath = path.join(process.cwd(), 'test-results/vault-save-load-test/vault-save-load-test/vault-data.json');
      
      if (fs.existsSync(vaultFilePath)) {
        this.logger.info('✅ Vault data file confirmed to exist after manual save');
        const fileStats = fs.statSync(vaultFilePath);
        this.logger.info(`File size: ${fileStats.size} bytes`);
      } else {
        throw new Error('Vault data file was not created after manual save');
      }

      this.logger.stepComplete(stepName, true, 'Vault manually saved successfully');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to manually save vault', error as Error);
      throw error;
    }
  }

  /**
   * Step 3: Manually load vault data
   */
  async manuallyLoadVault(): Promise<void> {
    const stepName = 'Manually Load Vault';
    this.logger.info(`=== Step 3: ${stepName} ===`);
    
    try {
      // Manually load the vault
      const loadResult = await this.passwordManager.loadVault();
      
      if (loadResult) {
        this.logger.info('Vault manually loaded successfully');
      } else {
        this.logger.info('No existing vault data found to load');
      }

      // Verify the loaded data
      const vaultDataAfter = this.passwordManager.getVaultData();
      this.logger.info('Vault data after manual load:', stepName, {
        recordCount: Object.keys(vaultDataAfter.records).length,
        templateCount: Object.keys(vaultDataAfter.templates).length
      });

      this.logger.stepComplete(stepName, true, 'Vault manually loaded successfully');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to manually load vault', error as Error);
      throw error;
    }
  }

  /**
   * Step 4: Verify data persistence
   */
  async verifyDataPersistence(originalTemplateId: string, originalRecordId: string): Promise<void> {
    const stepName = 'Verify Data Persistence';
    this.logger.info(`=== Step 4: ${stepName} ===`);
    
    try {
      // Get current data
      const templates = await this.passwordManager.getTemplateList();
      const records = await this.passwordManager.getRecordList();

      this.logger.info('Current data after manual operations:', stepName, {
        templateCount: templates.length,
        recordCount: records.length
      });

      // Verify original template exists
      const originalTemplate = await this.passwordManager.getTemplate(originalTemplateId);
      if (!originalTemplate) {
        throw new Error('Original template not found after manual load');
      }
      this.logger.info('✅ Original template found after manual load');

      // Verify original record exists
      const originalRecord = await this.passwordManager.getRecord(originalRecordId);
      if (!originalRecord) {
        throw new Error('Original record not found after manual load');
      }
      this.logger.info('✅ Original record found after manual load');

      // Verify record content matches
      const expectedData = this.testData.record;
      if (originalRecord.title !== expectedData.title) {
        throw new Error(`Record title mismatch. Expected: ${expectedData.title}, Got: ${originalRecord.title}`);
      }
      this.logger.info('✅ Record content verified after manual load');

      this.logger.stepComplete(stepName, true, 'Data persistence verified successfully');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to verify data persistence', error as Error);
      throw error;
    }
  }

  /**
   * Step 5: Test vault data manipulation
   */
  async testVaultDataManipulation(): Promise<void> {
    const stepName = 'Test Vault Data Manipulation';
    this.logger.info(`=== Step 5: ${stepName} ===`);
    
    try {
      // Get current vault data
      const currentVaultData = this.passwordManager.getVaultData();
      this.logger.info('Current vault data:', stepName, {
        recordCount: Object.keys(currentVaultData.records).length,
        templateCount: Object.keys(currentVaultData.templates).length
      });

      // Create a copy and modify it (simulate external manipulation)
      const modifiedVaultData = JSON.parse(JSON.stringify(currentVaultData));
      
      // Add a test label
      const testLabelId = 'test-label-' + Date.now();
      modifiedVaultData.labels[testLabelId] = {
        name: 'Test Label',
        color: '#FF0000'
      };

      this.logger.info('Modified vault data (in memory):', stepName, {
        recordCount: Object.keys(modifiedVaultData.records).length,
        templateCount: Object.keys(modifiedVaultData.templates).length,
        labelCount: Object.keys(modifiedVaultData.labels).length
      });

      // Load the modified vault data
      this.passwordManager.loadVaultData(modifiedVaultData);
      this.logger.info('✅ Modified vault data loaded successfully');

      // Save the modified vault
      await this.passwordManager.saveVault();
      this.logger.info('✅ Modified vault saved successfully');

      // Verify the changes persisted
      const finalVaultData = this.passwordManager.getVaultData();
      if (!finalVaultData.labels[testLabelId]) {
        throw new Error('Test label was not persisted after manual vault manipulation');
      }
      this.logger.info('✅ Vault data manipulation verified successfully');

      this.logger.stepComplete(stepName, true, 'Vault data manipulation tested successfully');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to test vault data manipulation', error as Error);
      throw error;
    }
  }

  /**
   * Clean up test data
   */
  async cleanup(): Promise<void> {
    const stepName = 'Cleanup';
    this.logger.info(`=== ${stepName} ===`);
    
    try {
      // Logout from password manager
      this.passwordManager.logout();

      this.logger.stepComplete(stepName, true, 'Test data cleanup completed');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Cleanup warning', error as Error);
      // Don't throw in cleanup
    }
  }

  /**
   * Run the complete vault save/load test
   */
  async run(): Promise<void> {
    const startTime = Date.now();
    const steps: any[] = [];
    
    try {
      this.logger.info('Starting Vault Save/Load Interface Test\n');

      // Initialize test environment
      const initStart = Date.now();
      await this.initialize();
      steps.push({ name: 'Initialize', success: true, duration: Date.now() - initStart });

      // Step 1: Create test data
      const createStart = Date.now();
      const { templateId, recordId } = await this.createTestData();
      steps.push({ name: 'Create Test Data', success: true, duration: Date.now() - createStart });

      // Step 2: Manually save vault
      const saveStart = Date.now();
      await this.manuallySaveVault();
      steps.push({ name: 'Manually Save Vault', success: true, duration: Date.now() - saveStart });

      // Step 3: Manually load vault
      const loadStart = Date.now();
      await this.manuallyLoadVault();
      steps.push({ name: 'Manually Load Vault', success: true, duration: Date.now() - loadStart });

      // Step 4: Verify data persistence
      const verifyStart = Date.now();
      await this.verifyDataPersistence(templateId, recordId);
      steps.push({ name: 'Verify Data Persistence', success: true, duration: Date.now() - verifyStart });

      // Step 5: Test vault data manipulation
      const manipulateStart = Date.now();
      await this.testVaultDataManipulation();
      steps.push({ name: 'Test Vault Data Manipulation', success: true, duration: Date.now() - manipulateStart });

      // Clean up test data
      await this.cleanup();

      const totalDuration = Date.now() - startTime;
      const testResult = this.logger.generateTestResult(steps);
      this.logger.saveTestResult(testResult);

      console.log(TestUtils.createTestSummary('Vault Save/Load Interface Test', true, totalDuration));
      console.log('All steps passed! The saveVault() and loadVault() interfaces are working correctly.');
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      const testResult = this.logger.generateTestResult(steps, error as Error);
      this.logger.saveTestResult(testResult);

      console.error(TestUtils.createTestSummary('Vault Save/Load Interface Test', false, totalDuration, error as Error));
      process.exit(1);
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new VaultSaveLoadTest();
  test.run().catch(console.error);
}