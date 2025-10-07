/**
 * Password Manager Core - Main Entry Point
 *
 * This is the main entry point for the password manager password-memo-core library.
 * It exports the unified PasswordManager interface as the primary API.
 */

// Export the unified PasswordManager interface
export {PasswordManager} from './PasswordManager.js';
export type {PasswordManagerConfig, AuthResult, InitializeParams} from './PasswordManager.js';

// Export password-memo-core modules and types for advanced usage
export * from './types/index.js';

// Export password-memo-core functionality modules for direct access if needed
export {CryptographyEngine} from './CryptoEngine.js';
export {DataManager} from './DataManager.js';
export {Sync} from './Sync.js';
export {KDFAdapter} from './KDFAdapter.js';

// Export constants
export * from './Constants.js';
