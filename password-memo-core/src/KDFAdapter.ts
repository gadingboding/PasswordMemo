/**
 * KDF Configuration Manager
 *
 * Manages KDF (Key Derivation Function) configurations, validation, and key derivation operations.
 */

import {
  KDFConfig,
  KDFAlgorithm,
  Argon2idParams,
  KDFValidationResult,
  Base64String,
  DEFAULT_KDF_PARAMS,
  KDF_VALIDATION_RULES,
  KDF_ALGORITHMS,
  DerivedKey,
  KDFParamsBase,
} from './types/index.js';
import {CryptographyEngine} from './CryptoEngine.js';
import _sodium from 'libsodium-wrappers-sumo';

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
 * Argon2id algorithm implementation using libsodium
 */
class Argon2idStrategy extends KDFAlgorithmStrategy {
  validateParams(params: KDFParamsBase, errors: string[]): void {
    const argon2Params = params as Argon2idParams;

    if (argon2Params.opslimit !== undefined) {
      const rules = KDF_VALIDATION_RULES.argon2id;
      if (argon2Params.opslimit < rules.opslimit.min ||
        argon2Params.opslimit > rules.opslimit.max) {
        errors.push(`Ops limit must be between ${rules.opslimit.min} and ${rules.opslimit.max}`);
      }
    }

    if (argon2Params.memlimit !== undefined) {
      const rules = KDF_VALIDATION_RULES.argon2id;
      if (argon2Params.memlimit < rules.memlimit.min ||
        argon2Params.memlimit > rules.memlimit.max) {
        errors.push(`Memory limit must be between ${rules.memlimit.min / 1024 / 1024} MiB and ${rules.memlimit.max / 1024 / 1024} MiB`);
      }
    }
  }

  async deriveKey(password: string, params: KDFParamsBase): Promise<DerivedKey> {
    const derivedKey = await CryptographyEngine.deriveKeyArgon2id(params as Argon2idParams, password);
    return {
      key: derivedKey,
    };
  }

  areParamsCompatible(params1: KDFParamsBase, params2: KDFParamsBase): boolean {
    const argon1 = params1 as Argon2idParams;
    const argon2 = params2 as Argon2idParams;
    return (argon1.opslimit || DEFAULT_KDF_PARAMS.argon2id.opslimit) === (argon2.opslimit || DEFAULT_KDF_PARAMS.argon2id.opslimit) &&
      (argon1.memlimit || DEFAULT_KDF_PARAMS.argon2id.memlimit) === (argon2.memlimit || DEFAULT_KDF_PARAMS.argon2id.memlimit) &&
      argon1.keyLength === argon2.keyLength && argon1.salt === argon2.salt;
  }
}

/**
 * KDF Configuration Manager
 */
export class KDFAdapter {
  private algorithmStrategies: Map<KDFAlgorithm, KDFAlgorithmStrategy>;

  constructor() {
    this.algorithmStrategies = new Map();
    this.registerAlgorithm(KDF_ALGORITHMS.ARGON2ID, new Argon2idStrategy());
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