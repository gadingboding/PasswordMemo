/**
 * Unified Workflow Test for Password Manager
 * 
 * This test simulates a complete user workflow using the unified PasswordManager interface:
 * 1. Initialize the password manager
 * 2. Authenticate (creates new user if not exists)
 * 3. Create a template with username and password fields
 * 4. Add a record using the template
 * 5. Lock the vault
 * 6. Unlock with master password
 * 7. Setup PIN for quick unlock
 * 8. Lock and unlock with PIN
 * 9. Verify that the record content is as expected
 */

import { PasswordManager } from 'password-manager-core';
import { createDataManager, createLogger, TestUtils, LogLevel } from '../../common/index.js';
import { cleanTestResults } from '../../common/test-utils.js';

export class UnifiedWorkflowTest {
  private passwordManager: PasswordManager;
  private dataManager: ReturnType<typeof createDataManager>;
  private logger: ReturnType<typeof createLogger>;
  private testData: any;
  private userProfile: any;

  constructor() {
    this.passwordManager = new PasswordManager();
    this.dataManager = createDataManager('unified-workflow-test');
    this.logger = createLogger('unified-workflow-test', LogLevel.INFO);
    
    // Load test data
    this.testData = this.dataManager.getTestData();
    this.userProfile = this.dataManager.getUserProfile();
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
          basePath: 'test-results/unified-workflow-test',
          namespace: 'unified-workflow-test'
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
    cleanTestResults('unified-workflow-test', 'unified-workflow-test');
  }

  /**
   * Step 1: Unlock vault with master password
   */
  async authenticate(): Promise<void> {
    const stepName = 'Master Password Unlock';
    this.logger.info(`=== Step 1: ${stepName} ===`);
    
    const startTime = Date.now();
    
    try {
      this.logger.info(`Attempting vault unlock with master password`, stepName);
      this.logger.info(`Master password: [REDACTED]`, stepName);
      
      // Note: This is a single-user password manager, only master password is used for authentication
      const authResult = await this.passwordManager.authenticate({
        password: this.userProfile.masterPassword
      });

      if (!authResult.success) {
        this.logger.error(`Vault unlock failed with error: ${authResult.error}`);
        this.logger.info(`Unlock details - master password length: ${this.userProfile.masterPassword.length}`, stepName);
        
        // Try to get more detailed error information
        if (authResult.error === 'Invalid credentials') {
          this.logger.info('This usually means either:', stepName);
          this.logger.info('1. Master password hash is not set in AuthManager', stepName);
          this.logger.info('2. User profile creation failed during first-time setup', stepName);
          this.logger.info('3. Password derivation or comparison failed', stepName);
        }
        
        throw new Error(`Vault unlock failed: ${authResult.error}`);
      }

      this.logger.info(`Vault unlocked successfully`, stepName, {
        sessionToken: authResult.session?.sessionToken,
        expiresAt: authResult.session?.expiresAt
      });
      
      this.logger.stepComplete(stepName, true, 'Vault unlocked successfully');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Vault unlock failed', error as Error);
      throw error;
    }
  }

  /**
   * Step 2: Create a template with username and password fields
   */
  async createTemplate(): Promise<string> {
    const stepName = 'Create Template';
    this.logger.info(`=== Step 2: ${stepName} ===`);
    
    const startTime = Date.now();
    
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
   * Step 4: Lock the vault
   */
  async lockVault(): Promise<void> {
    const stepName = 'Lock Vault';
    this.logger.info(`=== Step 4: ${stepName} ===`);
    
    try {
      this.passwordManager.lock();
      
      // Wait a bit to ensure lock is complete
      await TestUtils.wait(100);

      // Verify vault is locked
      if (this.passwordManager.isUnlocked()) {
        throw new Error('Vault should be locked but isUnlocked() returned true');
      }

      this.logger.stepComplete(stepName, true, 'Vault locked successfully');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to lock vault', error as Error);
      throw error;
    }
  }

  /**
   * Step 5: Unlock vault with master password (after being locked)
   */
  async unlockWithPassword(): Promise<void> {
    const stepName = 'Unlock Vault with Master Password';
    this.logger.info(`=== Step 5: ${stepName} ===`);
    
    try {
      const authResult = await this.passwordManager.authenticate({
        password: this.userProfile.masterPassword
      });

      if (!authResult.success) {
        throw new Error(`Unlock failed: ${authResult.error}`);
      }
      
      // Wait a bit to ensure unlock is complete
      await TestUtils.wait(100);

      // Verify vault is unlocked
      if (!this.passwordManager.isUnlocked()) {
        throw new Error('Vault should be unlocked but isUnlocked() returned false');
      }

      this.logger.stepComplete(stepName, true, 'Vault unlocked with master password successfully');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to unlock vault with master password', error as Error);
      throw error;
    }
  }

  /**
   * Step 6: Setup PIN for quick unlock
   */
  async setupPIN(): Promise<void> {
    const stepName = 'Setup PIN';
    this.logger.info(`=== Step 6: ${stepName} ===`);
    
    try {
      await this.passwordManager.setupPIN(this.userProfile.pin, this.testData.pinExpiryHours);

      // Verify PIN is enabled
      if (!this.passwordManager.isPINEnabled()) {
        throw new Error('PIN should be enabled but isPINEnabled() returned false');
      }

      this.logger.stepComplete(stepName, true, 'PIN setup successful');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to setup PIN', error as Error);
      throw error;
    }
  }

  /**
   * Step 7: Lock the vault again
   */
  async lockVaultAgain(): Promise<void> {
    const stepName = 'Lock Vault Again';
    this.logger.info(`=== Step 7: ${stepName} ===`);
    
    try {
      this.passwordManager.lock();
      
      // Wait a bit to ensure lock is complete
      await TestUtils.wait(100);

      this.logger.stepComplete(stepName, true, 'Vault locked successfully');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to lock vault', error as Error);
      throw error;
    }
  }

  /**
   * Step 8: Unlock with PIN
   */
  async unlockWithPIN(): Promise<void> {
    const stepName = 'Unlock with PIN';
    this.logger.info(`=== Step 8: ${stepName} ===`);
    
    try {
      const unlockResult = await this.passwordManager.unlockWithPIN(this.userProfile.pin);

      if (!unlockResult.success) {
        throw new Error(`PIN unlock failed: ${unlockResult.error}`);
      }
      
      // Wait a bit to ensure unlock is complete
      await TestUtils.wait(100);

      // Verify vault is unlocked
      if (!this.passwordManager.isUnlocked()) {
        throw new Error('Vault should be unlocked but isUnlocked() returned false');
      }

      this.logger.stepComplete(stepName, true, 'Vault unlocked with PIN successfully');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to unlock vault with PIN', error as Error);
      throw error;
    }
  }

  /**
   * Step 9: Verify that the record content is as expected
   */
  async verifyRecordContent(recordId: string): Promise<void> {
    const stepName = 'Verify Record Content';
    this.logger.info(`=== Step 9: ${stepName} ===`);
    
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

      this.logger.stepComplete(stepName, true, 'Record content verified successfully');
      this.logger.info('Record details:', stepName, {
        title: record.title,
        username: usernameField.value,
        password: '[REDACTED]'
      });
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Record verification failed', error as Error);
      throw error;
    }
  }

  /**
   * Additional test: Get template and label lists
   */
  async testListOperations(): Promise<void> {
    const stepName = 'List Operations';
    this.logger.info(`=== Additional Test: ${stepName} ===`);
    
    try {
      // Get template list
      const templates = await this.passwordManager.getTemplateList();
      this.logger.info(`Found ${templates.length} templates`, stepName);

      // Get label list
      const labels = await this.passwordManager.getLabelList();
      this.logger.info(`Found ${labels.length} labels`, stepName);

      // Get record list
      const records = await this.passwordManager.getRecordList();
      this.logger.info(`Found ${records.length} records`, stepName);

      this.logger.stepComplete(stepName, true, 'List operations completed successfully');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'List operations failed', error as Error);
      throw error;
    }
  }

  /**
   * Run the complete workflow test
   */
  async run(): Promise<void> {
    const startTime = Date.now();
    const steps: any[] = [];
    
    try {
      this.logger.info('Starting Password Manager Unified Interface Workflow Test\n');

      // Initialize test environment
      await this.initialize();
      steps.push({ name: 'Initialize', success: true, duration: Date.now() - startTime });

      // Step 1: Authenticate
      const authStart = Date.now();
      await this.authenticate();
      steps.push({ name: 'Authenticate', success: true, duration: Date.now() - authStart });

      // Step 2: Create template
      const templateStart = Date.now();
      const templateId = await this.createTemplate();
      steps.push({ name: 'Create Template', success: true, duration: Date.now() - templateStart });

      // Step 3: Add record
      const recordStart = Date.now();
      const recordId = await this.addRecord(templateId);
      steps.push({ name: 'Add Record', success: true, duration: Date.now() - recordStart });

      // Step 4: Lock vault
      const lockStart = Date.now();
      await this.lockVault();
      steps.push({ name: 'Lock Vault', success: true, duration: Date.now() - lockStart });

      // Step 5: Unlock with password
      const unlockPassStart = Date.now();
      await this.unlockWithPassword();
      steps.push({ name: 'Unlock with Password', success: true, duration: Date.now() - unlockPassStart });

      // Step 6: Setup PIN
      const pinSetupStart = Date.now();
      await this.setupPIN();
      steps.push({ name: 'Setup PIN', success: true, duration: Date.now() - pinSetupStart });

      // Step 7: Lock vault again
      const lockAgainStart = Date.now();
      await this.lockVaultAgain();
      steps.push({ name: 'Lock Vault Again', success: true, duration: Date.now() - lockAgainStart });

      // Step 8: Unlock with PIN
      const unlockPinStart = Date.now();
      await this.unlockWithPIN();
      steps.push({ name: 'Unlock with PIN', success: true, duration: Date.now() - unlockPinStart });

      // Step 9: Verify record content
      const verifyStart = Date.now();
      await this.verifyRecordContent(recordId);
      steps.push({ name: 'Verify Record Content', success: true, duration: Date.now() - verifyStart });

      // Additional test: List operations
      const listStart = Date.now();
      await this.testListOperations();
      steps.push({ name: 'List Operations', success: true, duration: Date.now() - listStart });

      const totalDuration = Date.now() - startTime;
      const testResult = this.logger.generateTestResult(steps);
      this.logger.saveTestResult(testResult);

      console.log(TestUtils.createTestSummary('Unified Workflow Test', true, totalDuration));
      console.log('All steps passed! The password manager unified interface is working correctly.');
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      const testResult = this.logger.generateTestResult(steps, error as Error);
      this.logger.saveTestResult(testResult);

      console.error(TestUtils.createTestSummary('Unified Workflow Test', false, totalDuration, error as Error));
      process.exit(1);
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new UnifiedWorkflowTest();
  test.run().catch(console.error);
}