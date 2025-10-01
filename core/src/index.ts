/**
 * Password Manager Core - Main Entry Point
 *
 * This is the main entry point for the password manager core library.
 * It exports the unified PasswordManager interface as the primary API.
 */

// Export the unified PasswordManager interface
export {PasswordManager} from './passwordManager.js';
export type {PasswordManagerConfig, AuthResult} from './passwordManager.js';

// Export core modules and types for advanced usage
export * from './types/index.js';
export type {SyncConfig} from './types/sync.js';

// Export core functionality modules for direct access if needed
export {CryptographyEngine} from './crypto-engine.js';
export {VaultManager} from './vault-manager.js';
export * from './configuration-manager.js';
export {EnvironmentManager} from './environment-manager.js';
export {SyncManager} from './sync-manager.js';
export {KDFManager} from './kdf-manager.js';
export {KDFConfigAPI} from './kdf-config-api.js';

// Placeholder export to prevent empty module error
export const VERSION = '1.0.0';