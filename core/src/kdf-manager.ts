/**
 * KDF Configuration Manager
 *
 * Manages KDF (Key Derivation Function) configurations, validation, and key derivation operations.
 */

import {
  KDFConfig,
  KDFAlgorithm,
  PBKDF2Params,
  KDFValidationResult,
  Base64String,
  DEFAULT_KDF_PARAMS,
  KDF_VALIDATION_RULES,
  KDF_ALGORITHMS,
  DerivedKey,
  KDFParamsBase,
} from './types/index.js';
import {CryptographyEngine} from './crypto-engine.js';

/**
 * Abstract base class for KDF algorithm implementations
 */
abstract class KDFAlgorithmStrategy {
  /**
   * Validate algorithm-specific parameters
   */
  abstract validateParams(params: KDFParamsBase, errors: string[]): void;

  /**
   * Derive key using the specific algorithm
   */
  abstract deriveKey(password: string, params: KDFParamsBase): Promise<DerivedKey>;

  /**
   * Check if two parameter sets are compatible for this algorithm
   */
  abstract areParamsCompatible(params1: KDFParamsBase, params2: KDFParamsBase): boolean;
}

/**
 * PBKDF2 algorithm implementation
 */
class PBKDF2Strategy extends KDFAlgorithmStrategy {
  validateParams(params: KDFParamsBase, errors: string[]): void {
    const pbkdf2Params = params as PBKDF2Params;
    const rules = KDF_VALIDATION_RULES.pbkdf2;

    if (!pbkdf2Params.salt) {
      errors.push('Salt is required for PBKDF2');
    }

    if (typeof pbkdf2Params.iterations !== 'number' ||
      pbkdf2Params.iterations < rules.iterations.min ||
      pbkdf2Params.iterations > rules.iterations.max) {
      errors.push(`Iterations must be between ${rules.iterations.min} and ${rules.iterations.max}`);
    }

    if (!rules.hash.allowed.includes(pbkdf2Params.hash as 'sha256' | 'sha512')) {
      errors.push(`Hash algorithm must be one of: ${rules.hash.allowed.join(', ')}`);
    }

    if (typeof pbkdf2Params.keyLength !== 'number' ||
      pbkdf2Params.keyLength < rules.keyLength.min ||
      pbkdf2Params.keyLength > rules.keyLength.max) {
      errors.push(`Key length must be between ${rules.keyLength.min} and ${rules.keyLength.max} bytes`);
    }
  }

  async deriveKey(password: string, params: KDFParamsBase): Promise<DerivedKey> {
    const pbkdf2Params = params as PBKDF2Params;
    
    // Use Web Crypto API for key derivation
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Browser environment
      const encoder = new TextEncoder();
      const passwordBytes = encoder.encode(password);
      const saltBytes = CryptographyEngine.base64ToBytes(pbkdf2Params.salt);

      // Import password as a key
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBytes,
        {name: 'PBKDF2'},
        false,
        ['deriveBits']
      );

      // Derive key using PBKDF2
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: new Uint8Array(saltBytes),
          iterations: pbkdf2Params.iterations,
          hash: pbkdf2Params.hash.toUpperCase()
        },
        keyMaterial,
        pbkdf2Params.keyLength * 8 // Convert to bits
      );

      return {
        key: new Uint8Array(derivedBits),
      };
    } else {
      // Node.js environment
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const crypto = require('crypto');
      const saltBytes = CryptographyEngine.base64ToBytes(pbkdf2Params.salt);

      const derivedKey = crypto.pbkdf2Sync(
        password,
        Buffer.from(saltBytes),
        pbkdf2Params.iterations,
        pbkdf2Params.keyLength,
        pbkdf2Params.hash
      );

      return {
        key: new Uint8Array(derivedKey),
      };
    }
  }

  areParamsCompatible(params1: KDFParamsBase, params2: KDFParamsBase): boolean {
    const pbkdf1 = params1 as PBKDF2Params;
    const pbkdf2 = params2 as PBKDF2Params;
    return pbkdf1.iterations === pbkdf2.iterations &&
      pbkdf1.hash === pbkdf2.hash &&
      pbkdf1.keyLength === pbkdf2.keyLength;
  }
}

/**
 * KDF Configuration Manager
 */
export class KDFManager {
  private algorithmStrategies: Map<KDFAlgorithm, KDFAlgorithmStrategy>;

  constructor() {
    this.algorithmStrategies = new Map();
    this.registerAlgorithm(KDF_ALGORITHMS.PBKDF2, new PBKDF2Strategy());
  }

  /**
   * Register a KDF algorithm strategy
   */
  private registerAlgorithm(algorithm: KDFAlgorithm, strategy: KDFAlgorithmStrategy): void {
    this.algorithmStrategies.set(algorithm, strategy);
  }

  /**
   * Get the strategy for a specific algorithm
   */
  private getStrategy(algorithm: KDFAlgorithm): KDFAlgorithmStrategy {
    const strategy = this.algorithmStrategies.get(algorithm);
    if (!strategy) {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
    return strategy;
  }

  /**
   * Validate KDF configuration parameters
   */
  validateConfig(config: KDFConfig): KDFValidationResult {
    const errors: string[] = [];

    if (!config.algorithm) {
      errors.push('Algorithm is required');
      return {valid: false, errors};
    }

    if (!config.params) {
      errors.push('Parameters are required');
      return {valid: false, errors};
    }

    try {
      const strategy = this.getStrategy(config.algorithm);
      strategy.validateParams(config.params, errors);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Unsupported algorithm: ${config.algorithm}`);
    }

    return errors.length === 0 ? {valid: true} : {valid: false, errors};
  }

  /**
   * Generate a random salt for key derivation
   */
  async generateSalt(): Promise<Base64String> {
    return CryptographyEngine.generateSalt();
  }

  /**
   * Create default KDF configuration for the specified algorithm
   */
  async createDefaultConfig(algorithm: KDFAlgorithm): Promise<KDFConfig> {
    const salt = await this.generateSalt();

    switch (algorithm) {
      case 'pbkdf2':
        return {
          algorithm: 'pbkdf2',
          params: {
            salt,
            ...DEFAULT_KDF_PARAMS.pbkdf2
          } as PBKDF2Params
        };
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }

  /**
   * Derive key from password using the specified KDF configuration
   */
  async deriveKey(password: string, config: KDFConfig): Promise<DerivedKey> {
    // Validate configuration first
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid KDF configuration: ${validation.errors?.join(', ')}`);
    }

    const strategy = this.getStrategy(config.algorithm);
    return strategy.deriveKey(password, config.params);
  }

  /**
   * Check if two KDF configurations are compatible
   * (i.e., they would produce the same key with the same password)
   */
  areConfigsCompatible(config1: KDFConfig, config2: KDFConfig): boolean {
    if (config1.algorithm !== config2.algorithm) {
      return false;
    }

    try {
      const strategy = this.getStrategy(config1.algorithm);
      return strategy.areParamsCompatible(config1.params, config2.params);
    } catch {
      return false;
    }
  }
}