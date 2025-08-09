/**
 * KDF Configuration Test for Password Manager
 * 
 * This test verifies the KDF (Key Derivation Function) configuration system,
 * including configuration validation, creation, update, and recommendations.
 * 
 * Test flow:
 * 1. Initialize the password manager
 * 2. Authenticate with master password
 * 3. Test KDF configuration validation
 * 4. Test KDF configuration creation
 * 5. Test KDF configuration update
 * 6. Test KDF configuration recommendations
 * 7. Test derived key generation
 */

import { PasswordManager } from 'password-manager-core';
import { KDFConfigAPI } from 'password-manager-core';
import { KDFManager } from 'password-manager-core';
import { createDataManager, createLogger, TestUtils, LogLevel } from '../../common/index.js';
import { cleanTestResults } from '../../common/test-utils.js';

export class KDFConfigTest {
  private passwordManager: PasswordManager;
  private kdfConfigAPI: KDFConfigAPI;
  private kdfManager: KDFManager;
  private dataManager: ReturnType<typeof createDataManager>;
  private logger: ReturnType<typeof createLogger>;
  private testData: any;
  private userProfile: any;
  private templateId: string | null = null;
  private recordId: string | null = null;

  constructor() {
    this.passwordManager = new PasswordManager();
    this.kdfManager = new KDFManager();
    this.dataManager = createDataManager('kdf-config-test');
    this.logger = createLogger('kdf-config-test', LogLevel.INFO);
    
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
          basePath: 'test-results/kdf-config-test',
          namespace: 'kdf-config-test'
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
    cleanTestResults('kdf-config-test', 'kdf-config-test');
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
   * Step 2: Test KDF configuration validation
   */
  async testKDFConfigValidation(): Promise<void> {
    const stepName = 'KDF Configuration Validation';
    this.logger.info(`=== Step 2: ${stepName} ===`);
    
    try {
      // Test default configuration validation
      const defaultConfig = this.testData.kdfConfigs.default;
      const defaultValidation = this.kdfManager.validateConfig(defaultConfig);
      
      if (!defaultValidation.valid) {
        throw new Error(`Default KDF configuration validation failed: ${defaultValidation.errors?.join(', ')}`);
      }

      this.logger.info('Default KDF configuration validation passed', stepName);

      // Test custom configuration validation
      const customConfig = this.testData.kdfConfigs.custom;
      const customValidation = this.kdfManager.validateConfig(customConfig);
      
      if (!customValidation.valid) {
        throw new Error(`Custom KDF configuration validation failed: ${customValidation.errors?.join(', ')}`);
      }

      this.logger.info('Custom KDF configuration validation passed', stepName);

      // Test insecure configuration validation
      const insecureConfig = this.testData.kdfConfigs.insecure;
      const insecureValidation = this.kdfManager.validateConfig(insecureConfig);
      
      if (!insecureValidation.valid) {
        throw new Error(`Insecure KDF configuration validation failed: ${insecureValidation.errors?.join(', ')}`);
      }

      this.logger.info('Insecure KDF configuration validation passed', stepName);

      // Test invalid configuration validation
      const invalidConfig = {
        algorithm: 'pbkdf2' as const,
        params: {
          salt: 'test-salt-value', // Add required salt
          iterations: 1000, // Too low
          hash: 'sha256',
          keyLength: 8 // Too low
        }
      };
      
      const invalidValidation = this.kdfManager.validateConfig(invalidConfig);
      
      if (invalidValidation.valid) {
        throw new Error('Invalid KDF configuration should have failed validation');
      }

      this.logger.info('Invalid KDF configuration correctly failed validation', stepName, {
        errors: invalidValidation.errors
      });

      this.logger.stepComplete(stepName, true, 'KDF configuration validation tests passed');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'KDF configuration validation tests failed', error as Error);
      throw error;
    }
  }

  /**
   * Step 3: Test KDF configuration creation
   */
  async testKDFConfigCreation(): Promise<void> {
    const stepName = 'KDF Configuration Creation';
    this.logger.info(`=== Step 3: ${stepName} ===`);
    
    try {
      // Test creating a new PBKDF2 configuration
      const newConfig = await this.kdfManager.createDefaultConfig('pbkdf2');
      
      if (!newConfig || newConfig.algorithm !== 'pbkdf2') {
        throw new Error('Failed to create PBKDF2 configuration');
      }

      if (!newConfig.params.salt) {
        throw new Error('Salt not generated for new KDF configuration');
      }

      this.logger.info('PBKDF2 configuration created successfully', stepName, {
        algorithm: newConfig.algorithm,
        iterations: (newConfig.params as any).iterations,
        hash: (newConfig.params as any).hash,
        keyLength: newConfig.params.keyLength,
        salt: newConfig.params.salt ? '[GENERATED]' : '[MISSING]'
      });

      // Test creating configuration through KDFConfigAPI
      const apiConfig = await this.kdfConfigAPI.createKDFConfig('pbkdf2');
      
      if (!apiConfig || apiConfig.algorithm !== 'pbkdf2') {
        throw new Error('Failed to create PBKDF2 configuration through API');
      }

      this.logger.info('PBKDF2 configuration created successfully through API', stepName);

      this.logger.stepComplete(stepName, true, 'KDF configuration creation tests passed');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'KDF configuration creation tests failed', error as Error);
      throw error;
    }
  }

  /**
   * Step 4: Test KDF configuration update
   */
  async testKDFConfigUpdate(): Promise<void> {
    const stepName = 'KDF Configuration Update';
    this.logger.info(`=== Step 4: ${stepName} ===`);
    
    try {
      // Get current configuration
      const currentConfig = this.kdfConfigAPI.getCurrentKDFConfig();
      
      if (!currentConfig) {
        throw new Error('No current KDF configuration found');
      }

      this.logger.info('Current KDF configuration retrieved', stepName, {
        algorithm: currentConfig.algorithm,
        iterations: (currentConfig.params as any).iterations,
        hash: (currentConfig.params as any).hash,
        keyLength: currentConfig.params.keyLength
      });

      // Create a new configuration with different iterations
      const newConfig = await this.kdfConfigAPI.createKDFConfig('pbkdf2');
      (newConfig.params as any).iterations = this.testData.kdfConfigs.custom.params.iterations;

      // Update KDF configuration
      const updateResult = await this.kdfConfigAPI.updateKDFConfig(
        newConfig, 
        this.userProfile.masterPassword
      );

      if (!updateResult.success) {
        throw new Error(`KDF configuration update failed: ${updateResult.error}`);
      }

      this.logger.info('KDF configuration updated successfully', stepName, {
        newIterations: (newConfig.params as any).iterations
      });

      // Verify the configuration was actually updated
      const updatedConfig = this.kdfConfigAPI.getCurrentKDFConfig();
      
      if (!updatedConfig) {
        throw new Error('No KDF configuration found after update');
      }

      if ((updatedConfig.params as any).iterations !== this.testData.kdfConfigs.custom.params.iterations) {
        throw new Error('KDF configuration was not updated correctly');
      }

      this.logger.info('KDF configuration update verified', stepName, {
        updatedIterations: (updatedConfig.params as any).iterations
      });

      this.logger.stepComplete(stepName, true, 'KDF configuration update tests passed');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'KDF configuration update tests failed', error as Error);
      throw error;
    }
  }

  /**
   * Step 5: Test KDF configuration recommendations
   */
  async testKDFConfigRecommendations(): Promise<void> {
    const stepName = 'KDF Configuration Recommendations';
    this.logger.info(`=== Step 5: ${stepName} ===`);
    
    try {
      // Test if update is recommended
      const isUpdateRecommended = this.kdfConfigAPI.isKDFConfigUpdateRecommended();
      
      this.logger.info('KDF configuration update recommendation checked', stepName, {
        updateRecommended: isUpdateRecommended
      });

      // Get recommendations
      const recommendations = this.kdfConfigAPI.getKDFRecommendations();
      
      if (!recommendations.current || !recommendations.recommended) {
        throw new Error('Failed to get KDF configuration recommendations');
      }

      this.logger.info('KDF configuration recommendations retrieved', stepName, {
        hasCurrentConfig: !!recommendations.current,
        hasRecommendedConfig: !!recommendations.recommended,
        reasons: recommendations.reasons
      });

      // Test configuration info
      const configInfo = this.kdfConfigAPI.getKDFConfigInfo(recommendations.recommended);
      
      if (!configInfo || !configInfo.algorithm || !configInfo.securityLevel) {
        throw new Error('Failed to get KDF configuration info');
      }

      this.logger.info('KDF configuration info retrieved', stepName, {
        algorithm: configInfo.algorithm,
        securityLevel: configInfo.securityLevel,
        estimatedTime: configInfo.estimatedTime,
        memoryUsage: configInfo.memoryUsage
      });

      this.logger.stepComplete(stepName, true, 'KDF configuration recommendations tests passed');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'KDF configuration recommendations tests failed', error as Error);
      throw error;
    }
  }

  /**
   * Step 6: Test derived key generation
   */
  async testDerivedKeyGeneration(): Promise<void> {
    const stepName = 'Derived Key Generation';
    this.logger.info(`=== Step 6: ${stepName} ===`);
    
    try {
      // Get current configuration
      const currentConfig = this.kdfConfigAPI.getCurrentKDFConfig();
      
      if (!currentConfig) {
        throw new Error('No current KDF configuration found');
      }

      // Test key derivation
      const derivedKey = await this.kdfManager.deriveKey(
        this.userProfile.masterPassword, 
        currentConfig
      );
      
      if (!derivedKey || !derivedKey.key) {
        throw new Error('Failed to derive key');
      }

      if (derivedKey.key.length !== currentConfig.params.keyLength) {
        throw new Error(`Derived key length mismatch. Expected: ${currentConfig.params.keyLength}, Actual: ${derivedKey.key.length}`);
      }

      this.logger.info('Key derived successfully', stepName, {
        keyLength: derivedKey.key.length,
        algorithm: currentConfig.algorithm
      });

      // Test that the same password and configuration produces the same key
      const derivedKey2 = await this.kdfManager.deriveKey(
        this.userProfile.masterPassword, 
        currentConfig
      );
      
      if (derivedKey.key.toString() !== derivedKey2.key.toString()) {
        throw new Error('Key derivation is not deterministic');
      }

      this.logger.info('Key derivation determinism verified', stepName);

      this.logger.stepComplete(stepName, true, 'Derived key generation tests passed');
    } catch (error) {
      this.logger.stepComplete(stepName, false, 'Derived key generation tests failed', error as Error);
      throw error;
    }
  }

  /**
   * Run the complete KDF configuration test
   */
  async run(): Promise<void> {
    const startTime = Date.now();
    const steps: any[] = [];
    
    try {
      this.logger.info('Starting Password Manager KDF Configuration Test\n');

      // Initialize test environment
      await this.initialize();
      steps.push({ name: 'Initialize', success: true, duration: Date.now() - startTime });

      // Step 1: Authenticate
      const authStart = Date.now();
      await this.authenticate();
      steps.push({ name: 'Authenticate', success: true, duration: Date.now() - authStart });

      // Step 2: Test KDF configuration validation
      const validationStart = Date.now();
      await this.testKDFConfigValidation();
      steps.push({ name: 'KDF Config Validation', success: true, duration: Date.now() - validationStart });

      // Step 3: Test KDF configuration creation
      const creationStart = Date.now();
      await this.testKDFConfigCreation();
      steps.push({ name: 'KDF Config Creation', success: true, duration: Date.now() - creationStart });

      // Step 4: Test KDF configuration update
      const updateStart = Date.now();
      await this.testKDFConfigUpdate();
      steps.push({ name: 'KDF Config Update', success: true, duration: Date.now() - updateStart });

      // Step 5: Test KDF configuration recommendations
      const recommendationsStart = Date.now();
      await this.testKDFConfigRecommendations();
      steps.push({ name: 'KDF Config Recommendations', success: true, duration: Date.now() - recommendationsStart });

      // Step 6: Test derived key generation
      const keyGenerationStart = Date.now();
      await this.testDerivedKeyGeneration();
      steps.push({ name: 'Derived Key Generation', success: true, duration: Date.now() - keyGenerationStart });

      const totalDuration = Date.now() - startTime;
      const testResult = this.logger.generateTestResult(steps);
      this.logger.saveTestResult(testResult);

      console.log(TestUtils.createTestSummary('KDF Configuration Test', true, totalDuration));
      console.log('All steps passed! KDF configuration test completed successfully.');
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      const testResult = this.logger.generateTestResult(steps, error as Error);
      this.logger.saveTestResult(testResult);

      console.error(TestUtils.createTestSummary('KDF Configuration Test', false, totalDuration, error as Error));
      process.exit(1);
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new KDFConfigTest();
  test.run().catch(console.error);
}