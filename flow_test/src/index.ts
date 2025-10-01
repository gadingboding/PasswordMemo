/**
 * Flow Test Index
 *
 * This file provides information about the available flow tests and how to run them.
 * The flow tests follow the structure defined in the specification.
 */

import { createLogger, LogLevel } from './common/index.js';

const logger = createLogger('flow-test-info', LogLevel.INFO);

function displayHelp(): void {
  console.log(``);
}

// Display help when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  displayHelp();
}

export { UnifiedWorkflowTest } from './tests/unified-workflow-test/test.js';
export { WebDAVSyncTest } from './tests/webdav-sync-test/test.js';
export { SimpleWebDAVSyncTest } from './tests/webdav-simple-test/test.js';
export { VaultSaveLoadTest } from './tests/vault-save-load-test/test.js';
export { KDFConfigTest } from './tests/kdf-config-test/test.js';
export { SaltUpdateTest } from './tests/salt-update-test/test.js';
export { TestRunner } from './run-all-tests.js';