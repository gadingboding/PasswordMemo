/**
 * Salt Update Test for Password Manager
 * 
 * This test verifies that after updating the KDF salt,
 * existing records can still be accessed correctly.
 * 
 * Test flow:
 * 1. Initialize the password manager
 * 2. Authenticate with master password
 * 3. Create a template with username and password fields
 * 4. Add a record using the template
 * 5. Verify the record content
 * 6. Update KDF configuration with new salt
 * 7. Verify that the record is still accessible
 * 8. Verify that the record content matches the original
 */

import { PasswordManager } from 'password-manager-core';
import { KDFConfigAPI } from 'password-manager-core';
import { createDataManager, createLogger, TestUtils, LogLevel } from '../../common/index.js';
import { cleanTestResults } from '../../common/test-utils.js';

export class SaltUpdateTest {
  private passwordManager: PasswordManager;
  private kdfConfigAPI: KDFConfigAPI;
  private dataManager: ReturnType<typeof createDataManager>;
  private logger: ReturnType<typeof createLogger>;
  private testData: any;
  private userProfile: any;
  private recordId: string | null = null;
  private templateId: string | null = null;

  constructor() {
    this.passwordManager = new PasswordManager();
    this.dataManager = createDataManager('salt-update-test');
    this.logger = createLogger('salt-update-test', LogLevel.INFO);
    
    // Load test data
    this.testData = this.dataManager.getTestData();
    this.userProfile = this.dataManager.getUserProfile();
    
    // Initialize KDFConfigAPI after password manager is created
    this.kdfConfigAPI = new KDFConfigAPI(
      (this.passwordManager as any).vaultManager,
      (this.passwordManager as any).authManager
    );
  }

  /**
   * Initialize the test environment
   */
  async initialize(): Promise<void> {
    // Clean up test results directory before running test
    this.cleanTestResults();
    
    this.logger.info('=== Initializing Test Environment ===');
    
    try {
      // Initialize password manager
      await this.passwordManager.initialize({
        storage: {
          basePath: 'test-results/salt-update-test',
          namespace: 'salt-update-test'
        }
      });

      // Wait a bit to ensure initialization is complete
      await TestUtils.wait(100);

      this.logger.info('Test environment initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize test environment', error as Error);
      throw error;
    }
  }

  /**
   * Clean up test results directory
   */
  private cleanTestResults(): void {
    cleanTestResults('salt-update-test', 'salt-update-test');
  }

  /**
   * Step 1: Authenticate with master password
   */
  async authenticate(): Promise<void> {
    const stepName = 'Master Password Authentication';
    this.logger.info(`=== Step 1: ${stepName} ===`);
    
    try {
      this.logger.info(`Attempting authentication with master password`, stepName);
      
      const authResult = await this.passwordManager.authenticate({
        password: this.userProfile.masterPassword
      });

      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.error}`);
      }

      this.logger.info(`Authentication successful`, stepName, {
        sessionToken: authResult.session?.sessionToken,
        expiresAt: authResult.session?.expiresAt
      });
      
      this.logger.stepComplete(stepName, true, 'Authentication successful');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Authentication failed', error as Error);
      throw error;
    }
  }

  /**
   * Step 2: Create a template with username and password fields
   */
  async createTemplate(): Promise<string> {
    const stepName = 'Create Template';
    this.logger.info(`=== Step 2: ${stepName} ===`);
    
    try {
      const templateData = this.testData.template;
      const fields = templateData.fields.map((field: any) => ({
        id: crypto.randomUUID(),
        name: field.name,
        type: field.type,
        optional: field.optional
      }));

      const templateId = await this.passwordManager.createTemplate(templateData.name, fields);

      this.logger.stepComplete(stepName, true, `Template created with ID: ${templateId}`);
      return templateId;
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to create template', error as Error);
      throw error;
    }
  }

  /**
   * Step 3: Add a record using the template
   */
  async addRecord(templateId: string): Promise<string> {
    const stepName = 'Add Record';
    this.logger.info(`=== Step 3: ${stepName} ===`);
    
    try {
      const recordData = this.testData.record;
      
      const recordId = await this.passwordManager.createRecord(
        templateId,
        recordData.title,
        recordData.fieldData,
        recordData.labels
      );
      
      // Wait a bit to ensure record is saved
      await TestUtils.wait(100);

      this.logger.stepComplete(stepName, true, `Record added with ID: ${recordId}`);
      return recordId;
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to add record', error as Error);
      throw error;
    }
  }

  /**
   * Step 4: Verify the record content before salt update
   */
  async verifyRecordContentBeforeUpdate(recordId: string): Promise<void> {
    const stepName = 'Verify Record Content Before Update';
    this.logger.info(`=== Step 4: ${stepName} ===`);
    
    try {
      const record = await this.passwordManager.getRecord(recordId);
      if (!record) {
        throw new Error('Record not found');
      }

      const expectedData = this.testData.record;
      
      // Verify record title
      if (record.title !== expectedData.title) {
        throw new Error(`Record title mismatch. Expected: '${expectedData.title}', Actual: '${record.title}'`);
      }

      // Verify fields
      const usernameField = record.fields.find((f: any) => f.name === '用户名');
      const passwordField = record.fields.find((f: any) => f.name === '密码');

      if (!usernameField || !passwordField) {
        throw new Error('Required fields not found in record');
      }

      // Verify field values
      if (usernameField.value !== expectedData.fieldData['用户名']) {
        throw new Error(`Username value mismatch. Expected: '${expectedData.fieldData['用户名']}', Actual: '${usernameField.value}'`);
      }

      if (passwordField.value !== expectedData.fieldData['密码']) {
        throw new Error(`Password value mismatch. Expected: '${expectedData.fieldData['密码']}', Actual: '${passwordField.value}'`);
      }

      this.logger.stepComplete(stepName, true, 'Record content verified successfully before salt update');
      this.logger.info('Record details:', stepName, {
        title: record.title,
        username: usernameField.value,
        password: '[REDACTED]'
      });
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Record verification failed before salt update', error as Error);
      throw error;
    }
  }

  /**
   * Step 5: Get current KDF configuration
   */
  async getCurrentKDFConfig(): Promise<any> {
    const stepName = 'Get Current KDF Configuration';
    this.logger.info(`=== Step 5: ${stepName} ===`);
    
    try {
      const currentConfig = this.kdfConfigAPI.getCurrentKDFConfig();
      
      if (!currentConfig) {
        throw new Error('No current KDF configuration found');
      }

      this.logger.stepComplete(stepName, true, 'Current KDF configuration retrieved');
      this.logger.info('Current KDF config:', stepName, {
        algorithm: currentConfig.algorithm,
        iterations: (currentConfig.params as any).iterations,
        hash: (currentConfig.params as any).hash,
        keyLength: currentConfig.params.keyLength,
        salt: currentConfig.params.salt ? '[PRESENT]' : '[MISSING]'
      });

      return currentConfig;
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to get current KDF configuration', error as Error);
      throw error;
    }
  }

  /**
   * Step 6: Update KDF configuration with new salt
   */
  async updateKDFConfig(): Promise<void> {
    const stepName = 'Update KDF Configuration';
    this.logger.info(`=== Step 6: ${stepName} ===`);
    
    try {
      // Create new KDF configuration with new salt
      const newKdfConfig = await this.kdfConfigAPI.createKDFConfig('pbkdf2');
      
      // Update iterations to match test data
      (newKdfConfig.params as any).iterations = this.testData.newKdfConfig.params.iterations;
      
      this.logger.info('Updating KDF configuration with new salt', stepName, {
        algorithm: newKdfConfig.algorithm,
        iterations: (newKdfConfig.params as any).iterations,
        hash: (newKdfConfig.params as any).hash,
        keyLength: newKdfConfig.params.keyLength,
        newSalt: newKdfConfig.params.salt ? '[GENERATED]' : '[MISSING]'
      });

      // Update KDF configuration
      const updateResult = await this.kdfConfigAPI.updateKDFConfig(
        newKdfConfig, 
        this.userProfile.masterPassword
      );

      if (!updateResult.success) {
        throw new Error(`KDF configuration update failed: ${updateResult.error}`);
      }

      this.logger.stepComplete(stepName, true, 'KDF configuration updated successfully with new salt');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to update KDF configuration', error as Error);
      throw error;
    }
  }

  /**
   * Step 7: Verify vault is still unlocked after salt update
   */
  async verifyVaultUnlocked(): Promise<void> {
    const stepName = 'Verify Vault Unlocked After Salt Update';
    this.logger.info(`=== Step 7: ${stepName} ===`);
    
    try {
      if (!this.passwordManager.isUnlocked()) {
        throw new Error('Vault should be unlocked but isUnlocked() returned false');
      }

      this.logger.stepComplete(stepName, true, 'Vault is still unlocked after salt update');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Vault is not unlocked after salt update', error as Error);
      throw error;
    }
  }

  /**
   * Step 8: Verify the record content after salt update
   */
  async verifyRecordContentAfterUpdate(recordId: string): Promise<void> {
    const stepName = 'Verify Record Content After Salt Update';
    this.logger.info(`=== Step 8: ${stepName} ===`);
    
    try {
      const record = await this.passwordManager.getRecord(recordId);
      if (!record) {
        throw new Error('Record not found after salt update');
      }

      const expectedData = this.testData.record;
      
      // Verify record title
      if (record.title !== expectedData.title) {
        throw new Error(`Record title mismatch after salt update. Expected: '${expectedData.title}', Actual: '${record.title}'`);
      }

      // Verify fields
      const usernameField = record.fields.find((f: any) => f.name === '用户名');
      const passwordField = record.fields.find((f: any) => f.name === '密码');

      if (!usernameField || !passwordField) {
        throw new Error('Required fields not found in record after salt update');
      }

      // Verify field values
      if (usernameField.value !== expectedData.fieldData['用户名']) {
        throw new Error(`Username value mismatch after salt update. Expected: '${expectedData.fieldData['用户名']}', Actual: '${usernameField.value}'`);
      }

      if (passwordField.value !== expectedData.fieldData['密码']) {
        throw new Error(`Password value mismatch after salt update. Expected: '${expectedData.fieldData['密码']}', Actual: '${passwordField.value}'`);
      }

      this.logger.stepComplete(stepName, true, 'Record content verified successfully after salt update');
      this.logger.info('Record details after salt update:', stepName, {
        title: record.title,
        username: usernameField.value,
        password: '[REDACTED]'
      });
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Record verification failed after salt update', error as Error);
      throw error;
    }
  }

  /**
   * Step 9: Verify KDF configuration was actually updated
   */
  async verifyKDFConfigUpdated(): Promise<void> {
    const stepName = 'Verify KDF Configuration Updated';
    this.logger.info(`=== Step 9: ${stepName} ===`);
    
    try {
      const currentConfig = this.kdfConfigAPI.getCurrentKDFConfig();
      
      if (!currentConfig) {
        throw new Error('No KDF configuration found after update');
      }

      // Verify that iterations were updated
      if ((currentConfig.params as any).iterations !== this.testData.newKdfConfig.params.iterations) {
        throw new Error(`Iterations not updated. Expected: ${this.testData.newKdfConfig.params.iterations}, Actual: ${(currentConfig.params as any).iterations}`);
      }

      this.logger.stepComplete(stepName, true, 'KDF configuration was successfully updated');
      this.logger.info('Updated KDF config:', stepName, {
        algorithm: currentConfig.algorithm,
        iterations: (currentConfig.params as any).iterations,
        hash: (currentConfig.params as any).hash,
        keyLength: currentConfig.params.keyLength,
        salt: currentConfig.params.salt ? '[PRESENT]' : '[MISSING]'
      });
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'KDF configuration was not updated correctly', error as Error);
      throw error;
    }
  }

  /**
   * Run the complete salt update test
   */
  async run(): Promise<void> {
    const startTime = Date.now();
    const steps: any[] = [];
    
    try {
      this.logger.info('Starting Password Manager Salt Update Test\n');

      // Initialize test environment
      await this.initialize();
      steps.push({ name: 'Initialize', success: true, duration: Date.now() - startTime });

      // Step 1: Authenticate
      const authStart = Date.now();
      await this.authenticate();
      steps.push({ name: 'Authenticate', success: true, duration: Date.now() - authStart });

      // Step 2: Create template
      const templateStart = Date.now();
      this.templateId = await this.createTemplate();
      steps.push({ name: 'Create Template', success: true, duration: Date.now() - templateStart });

      // Step 3: Add record
      const recordStart = Date.now();
      this.recordId = await this.addRecord(this.templateId);
      steps.push({ name: 'Add Record', success: true, duration: Date.now() - recordStart });

      // Step 4: Verify record content before update
      const verifyBeforeStart = Date.now();
      await this.verifyRecordContentBeforeUpdate(this.recordId);
      steps.push({ name: 'Verify Record Before Update', success: true, duration: Date.now() - verifyBeforeStart });

      // Step 5: Get current KDF configuration
      const getKdfStart = Date.now();
      await this.getCurrentKDFConfig();
      steps.push({ name: 'Get Current KDF Config', success: true, duration: Date.now() - getKdfStart });

      // Step 6: Update KDF configuration
      const updateKdfStart = Date.now();
      await this.updateKDFConfig();
      steps.push({ name: 'Update KDF Config', success: true, duration: Date.now() - updateKdfStart });

      // Step 7: Verify vault is still unlocked
      const verifyUnlockedStart = Date.now();
      await this.verifyVaultUnlocked();
      steps.push({ name: 'Verify Vault Unlocked', success: true, duration: Date.now() - verifyUnlockedStart });

      // Step 8: Verify record content after update
      const verifyAfterStart = Date.now();
      await this.verifyRecordContentAfterUpdate(this.recordId);
      steps.push({ name: 'Verify Record After Update', success: true, duration: Date.now() - verifyAfterStart });

      // Step 9: Verify KDF configuration was updated
      const verifyKdfUpdatedStart = Date.now();
      await this.verifyKDFConfigUpdated();
      steps.push({ name: 'Verify KDF Config Updated', success: true, duration: Date.now() - verifyKdfUpdatedStart });

      const totalDuration = Date.now() - startTime;
      const testResult = this.logger.generateTestResult(steps);
      this.logger.saveTestResult(testResult);

      console.log(TestUtils.createTestSummary('Salt Update Test', true, totalDuration));
      console.log('All steps passed! Salt update test completed successfully.');
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      const testResult = this.logger.generateTestResult(steps, error as Error);
      this.logger.saveTestResult(testResult);

      console.error(TestUtils.createTestSummary('Salt Update Test', false, totalDuration, error as Error));
      process.exit(1);
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new SaltUpdateTest();
  test.run().catch(console.error);
}