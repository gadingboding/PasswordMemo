/**
 * Simple WebDAV Sync Test for Password Manager
 * 
 * This test verifies that the WebDAV synchronization functionality works correctly:
 * 1. Create a local vault with simple test data
 * 2. Sync data to WebDAV server
 * 3. Create a new session and pull data back
 * 4. Compare results to verify consistency
 */

import { PasswordManager } from 'password-manager-core';
import { cleanTestResults, createDataManager, createLogger, TestUtils, LogLevel } from '../../common/index.js';

export class SimpleWebDAVSyncTest {
  private passwordManager1: PasswordManager;
  private passwordManager2: PasswordManager;
  private dataManager: ReturnType<typeof createDataManager>;
  private logger: ReturnType<typeof createLogger>;
  private testData: any;
  private userProfile: any;
  private webdavConfig: any;

  constructor() {
    this.passwordManager1 = new PasswordManager();
    this.passwordManager2 = new PasswordManager();
    this.dataManager = createDataManager('webdav-simple-test');
    this.logger = createLogger('webdav-simple-test', LogLevel.INFO);
    
    // Load test data
    this.testData = this.dataManager.getTestData();
    this.userProfile = this.dataManager.getUserProfile();
    this.webdavConfig = this.dataManager.getWebDAVConfig();
  }

  /**
   * Initialize the test environment
   */
  async initialize(): Promise<void> {
    // Clean up test results directory before running test
    cleanTestResults('instance-1', 'webdav-simple-test');
    cleanTestResults('instance-2', 'webdav-simple-test');
    
    this.logger.info('=== Initializing Simple WebDAV Sync Test Environment ===');
    
    try {

      // Initialize first password manager
      await this.passwordManager1.initialize({
        storage: {
          basePath: 'test-results/webdav-simple-test',
          namespace: 'instance-1'
        }
      });

      // Initialize second password manager (for new session)
      await this.passwordManager2.initialize({
        storage: {
          basePath: 'test-results/webdav-simple-test',
          namespace: 'instance-2'
        }
      });

      // Wait a bit to ensure initialization is complete
      await TestUtils.wait(100);

      this.logger.info('Simple WebDAV sync test environment initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize test environment', error as Error);
      throw error;
    }
  }

  /**
   * Step 1: Create local vault with simple test data
   */
  async createLocalVaultWithSimpleData(): Promise<void> {
    const stepName = 'Create Local Vault with Simple Data';
    this.logger.info(`=== Step 1: ${stepName} ===`);
    
    try {
      // Authenticate with first password manager
      const authResult = await this.passwordManager1.authenticate({
        password: this.userProfile.masterPassword
      });

      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.error}`);
      }

      // Configure WebDAV
      await this.passwordManager1.configureWebDAV(this.webdavConfig);

      this.logger.info('Authentication and WebDAV configuration successful');

      // Create a simple template with just one field
      const templateData = this.testData.template;
      const fields = templateData.fields.map((field: any) => ({
        id: crypto.randomUUID(),
        name: field.name,
        type: field.type,
        optional: field.optional
      }));

      const templateId = await this.passwordManager1.createTemplate(templateData.name, fields);

      this.logger.info(`Template created with ID: ${templateId}`);

      // Create a simple record
      const recordData = this.testData.record;
      const recordId = await this.passwordManager1.createRecord(
        templateId,
        recordData.title,
        recordData.fieldData,
        recordData.labels
      );
      
      this.logger.info(`Record created with ID: ${recordId}`);

      // Wait a bit to ensure record is saved
      await TestUtils.wait(500);

      this.logger.stepComplete(stepName, true, 'Simple test data created successfully');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to create local vault with simple data', error as Error);
      throw error;
    }
  }

  /**
   * Step 2: Sync data to WebDAV server
   */
  async syncToWebDAV(): Promise<void> {
    const stepName = 'Sync to WebDAV';
    this.logger.info(`=== Step 2: ${stepName} ===`);
    
    try {
      const syncResult = await this.passwordManager1.push(this.userProfile.masterPassword);

      if (!syncResult.success) {
        throw new Error(`Push failed: ${syncResult.error}`);
      }

      this.logger.stepComplete(stepName, true, `Push completed: ${syncResult.recordsPushed} records, ${syncResult.conflictsResolved} conflicts`);
      this.logger.info('Push details:', stepName, {
        recordsPushed: syncResult.recordsPushed,
        conflictsResolved: syncResult.conflictsResolved,
        timestamp: syncResult.timestamp
      });
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to sync to WebDAV', error as Error);
      throw error;
    }
  }

  /**
   * Step 3: Create new session and pull data back
   */
  async createNewSessionAndPullData(): Promise<void> {
    const stepName = 'Create New Session and Pull Data';
    this.logger.info(`=== Step 3: ${stepName} ===`);
    
    try {
      // Authenticate with second password manager (new session)
      const authResult = await this.passwordManager2.authenticate({
        password: this.userProfile.masterPassword
      });

      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.error}`);
      }

      // Configure WebDAV for second password manager
      await this.passwordManager2.configureWebDAV(this.webdavConfig);

      this.logger.info('New session authentication and WebDAV configuration successful');

      // Perform sync to pull data from WebDAV
      const syncResult = await this.passwordManager2.pull(this.userProfile.masterPassword);

      if (!syncResult.success) {
        throw new Error(`Pull failed: ${syncResult.error}`);
      }

      this.logger.info('Pull from WebDAV server completed successfully');
      this.logger.info('Pull details:', stepName, {
        recordsPulled: syncResult.recordsPulled,
        conflictsResolved: syncResult.conflictsResolved,
        timestamp: syncResult.timestamp
      });

      // Get templates and records from the second password manager
      const templates = await this.passwordManager2.getTemplateList();
      if (templates.length === 0) {
        throw new Error('No templates found after sync');
      }

      this.logger.info(`Found ${templates.length} templates after sync`);

      const records = await this.passwordManager2.getRecordList();
      this.logger.info(`Found ${records.length} records after sync`);
      
      if (records.length === 0) {
        throw new Error('No records found after sync');
      }

      this.logger.stepComplete(stepName, true, `Pulled ${records.length} records from WebDAV`);
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Failed to create new session and pull data', error as Error);
      throw error;
    }
  }

  /**
   * Step 4: Compare results to verify consistency
   */
  async compareResults(): Promise<void> {
    const stepName = 'Compare Results';
    this.logger.info(`=== Step 4: ${stepName} ===`);
    
    try {
      // Get templates from both password managers
      const templates1 = await this.passwordManager1.getTemplateList();
      const templates2 = await this.passwordManager2.getTemplateList();

      // Compare template counts
      if (templates1.length !== templates2.length) {
        throw new Error(`Template count mismatch: ${templates1.length} vs ${templates2.length}`);
      }

      this.logger.info('Template count matches');

      // Get records from both password managers
      const records1 = await this.passwordManager1.getRecordList();
      const records2 = await this.passwordManager2.getRecordList();

      // Compare record counts
      if (records1.length !== records2.length) {
        throw new Error(`Record count mismatch: ${records1.length} vs ${records2.length}`);
      }

      this.logger.info('Record count matches');

      // Compare record titles
      const titles1 = records1.map((r: any) => r.title).sort();
      const titles2 = records2.map((r: any) => r.title).sort();

      for (let i = 0; i < titles1.length; i++) {
        if (titles1[i] !== titles2[i]) {
          throw new Error(`Record title mismatch: ${titles1[i]} vs ${titles2[i]}`);
        }
      }

      this.logger.info('All record titles match');
      
      // Step 5: Verify custom path was used (if custom config was loaded)
      if (this.webdavConfig.path) {
        await this.verifyCustomPathUsage();
      }
      
      this.logger.stepComplete(stepName, true, 'WebDAV sync test completed successfully - basic data consistency verified!');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Comparison failed', error as Error);
      throw error;
    }
  }

  /**
   * Step 5: Verify custom path usage
   */
  async verifyCustomPathUsage(): Promise<void> {
    const stepName = 'Verify Custom Path Usage';
    this.logger.info(`=== Step 5: ${stepName} ===`);
    
    try {
      const templates = await this.passwordManager1.getTemplateList();
      const templateId = templates[0].id;
      const verificationData = this.testData.verificationRecord;
      
      // Add a new record and sync again to verify the custom path is being used
      const newRecordId = await this.passwordManager1.createRecord(
        templateId,
        verificationData.title,
        verificationData.fieldData,
        verificationData.labels
      );
      
      this.logger.info(`New verification record created with ID: ${newRecordId}`);

      // Sync with the first password manager
      const syncResult1 = await this.passwordManager1.push(this.userProfile.masterPassword);
      
      if (!syncResult1.success) {
        throw new Error(`First push failed: ${syncResult1.error}`);
      }
      
      this.logger.info('First push after adding verification record successful');

      // Sync with the second password manager to verify data was stored in custom path
      const syncResult2 = await this.passwordManager2.pull(this.userProfile.masterPassword);
      
      if (!syncResult2.success) {
        throw new Error(`Second pull failed: ${syncResult2.error}`);
      }
      
      this.logger.info('Second pull successful - custom path usage verified');

      // Verify the new record is present in the second password manager
      const updatedRecords = await this.passwordManager2.getRecordList();
      const verificationRecord = updatedRecords.find((r: any) => r.title === verificationData.title);
      
      if (verificationRecord) {
        this.logger.info('✅ Verification record found - confirms custom path is working correctly');
      } else {
        throw new Error('Verification record not found - custom path may not be working');
      }
      
      this.logger.stepComplete(stepName, true, 'Custom path usage verified');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Custom path verification failed', error as Error);
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
      // Logout from both password managers
      this.passwordManager1.logout();
      this.passwordManager2.logout();

      this.logger.stepComplete(stepName, true, 'Test data cleanup completed');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Cleanup warning', error as Error);
      // Don't throw in cleanup
    }
  }

  /**
   * Run the complete simple WebDAV sync test
   */
  async run(): Promise<void> {
    const startTime = Date.now();
    const steps: any[] = [];
    
    try {
      this.logger.info('Starting Simple Password Manager WebDAV Sync Test\n');

      // Initialize test environment
      const initStart = Date.now();
      await this.initialize();
      steps.push({ name: 'Initialize', success: true, duration: Date.now() - initStart });

      // Step 1: Create local vault with simple data
      const createStart = Date.now();
      await this.createLocalVaultWithSimpleData();
      steps.push({ name: 'Create Local Vault', success: true, duration: Date.now() - createStart });

      // Step 2: Sync data to WebDAV server
      const syncStart = Date.now();
      await this.syncToWebDAV();
      steps.push({ name: 'Sync to WebDAV', success: true, duration: Date.now() - syncStart });

      // Step 3: Create new session and pull data back
      const pullStart = Date.now();
      await this.createNewSessionAndPullData();
      steps.push({ name: 'Pull Data from WebDAV', success: true, duration: Date.now() - pullStart });

      // Step 4: Compare results for consistency
      const compareStart = Date.now();
      await this.compareResults();
      steps.push({ name: 'Compare Results', success: true, duration: Date.now() - compareStart });

      // Clean up test data
      await this.cleanup();

      const totalDuration = Date.now() - startTime;
      const testResult = this.logger.generateTestResult(steps);
      this.logger.saveTestResult(testResult);

      console.log(TestUtils.createTestSummary('Simple WebDAV Sync Test', true, totalDuration));
      console.log('All steps passed! The WebDAV synchronization is working correctly.');
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      const testResult = this.logger.generateTestResult(steps, error as Error);
      this.logger.saveTestResult(testResult);

      console.error(TestUtils.createTestSummary('Simple WebDAV Sync Test', false, totalDuration, error as Error));
      process.exit(1);
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new SimpleWebDAVSyncTest();
  test.run().catch(console.error);
}