import {STORAGE_KEYS} from "./Constants.js";
import {detectEnvironment, EnvType} from "./utils.js";
import browser from 'webextension-polyfill';



/**
 * Storage adapter interface for abstracting different storage backends
 */
export interface LocalStorageAdapter {
  /**
   * Read content from the specified path/key
   * @param path Storage path or key name
   * @returns Content as string, or null if not found
   */
  read(path: string): Promise<string | null>;

  /**
   * Write content to the specified path/key
   * @param path Storage path or key name
   * @param data Content to write
   */
  write(path: string, data: string): Promise<void>;

  /**
   * Check if the specified path/key exists
   * @param path Storage path or key name
   * @returns True if exists, false otherwise
   */
  exists(path: string): Promise<boolean>;

  /**
   * Delete content at the specified path/key
   * @param path Storage path or key name
   */
  remove(path: string): Promise<void>;
}

/**
 * Storage adapter configuration
 */
export interface StorageAdapterConfig {
  /** Base path or prefix for storage keys */
  basePath?: string;
}

/**
 * Browser-specific storage adapter configuration
 */
export interface BrowserStorageConfig extends StorageAdapterConfig {
}

/**
 * Node.js-specific storage adapter configuration
 */
export interface NodeStorageConfig extends StorageAdapterConfig {
  /** Base directory for file storage */
  baseDir?: string;
}

/**
 * Browser storage adapter using webextension-polyfill storage API
 */
class BrowserStorageAdapter implements LocalStorageAdapter {
  constructor(config: BrowserStorageConfig) {
  }

  /**
   * Read content from browser storage
   */
  async read(path: string): Promise<string | null> {
    try {
      const result = await browser.storage.local.get(path);
      const value = result[path];
      if (value == null) {
        return null;
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      } else if (typeof value === 'string') {
        return value;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Write content to browser storage
   */
  async write(path: string, data: string): Promise<void> {
    try {
      await browser.storage.local.set({[path]: data});
    } catch (error) {
      throw new Error(`Failed to write to storage: ${error}`);
    }
  }

  /**
   * Check if key exists in browser storage
   */
  async exists(path: string): Promise<boolean> {
    try {
      const result = await browser.storage.local.get(path);
      return result.hasOwnProperty(path);
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove content from browser storage
   */
  async remove(path: string): Promise<void> {
    try {
      await browser.storage.local.remove(path);
    } catch (error) {
      throw new Error(`Failed to remove from storage: ${error}`);
    }
  }

}

/**
 * Node.js storage adapter using file system
 */
class NodeStorageAdapter implements LocalStorageAdapter {
  private readonly baseDir: string;

  constructor(config: NodeStorageConfig = {}) {
    this.baseDir = config.baseDir || './data';
  }

  /**
   * Generate the full file path
   */
  private getFilePath(path: string): string {
    const fileName = `${path}.json`;
    if (this.baseDir.endsWith('/')) {
      return `${this.baseDir}${fileName}`;
    } else {
      return `${this.baseDir}/${fileName}`;
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(filePath: string): Promise<void> {
    // Use dynamic import for Node.js modules
    const {dirname} = await import('path');
    const {promises: fs} = await import('fs');
    const dir = dirname(filePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, {recursive: true});
    }
  }

  /**
   * Read content from file
   */
  async read(path: string): Promise<string | null> {
    try {
      const filePath = this.getFilePath(path);
      // Use dynamic import for Node.js modules
      const {promises: fs} = await import('fs');
      return await fs.readFile(filePath, 'utf-8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      return null;
    }
  }

  /**
   * Write content to file
   */
  async write(path: string, data: string): Promise<void> {
    try {
      const filePath = this.getFilePath(path);
      await this.ensureDir(filePath);
      // Use dynamic import for Node.js modules
      const {promises: fs} = await import('fs');
      await fs.writeFile(filePath, data, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write to storage: ${error}`);
    }
  }

  /**
   * Check if file exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(path);
      // Use dynamic import for Node.js modules
      const {promises: fs} = await import('fs');
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove file
   */
  async remove(path: string): Promise<void> {
    try {
      const filePath = this.getFilePath(path);
      // Use dynamic import for Node.js modules
      const {promises: fs} = await import('fs');
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to remove from storage: ${error}`);
      }
      // If file doesn't exist, consider it successfully removed
    }
  }
}

let localStorageConfig: StorageAdapterConfig = {
  basePath: '',
};

export const configLocalStorage = (config: StorageAdapterConfig) => {
  localStorageConfig = config;
}

const getLocalStorage = (): LocalStorageAdapter => {
  const envType = detectEnvironment();
  if (envType === EnvType.NODE) {
    return new NodeStorageAdapter(localStorageConfig)
  } else {
    return new BrowserStorageAdapter(localStorageConfig)
  }
}

export class LocalFile {
  private readonly fileName: string;

  constructor(fileKey: string) {
    if (detectEnvironment() === EnvType.NODE) {
      this.fileName = `${fileKey}.json`;
    } else {
      this.fileName = fileKey;
    }
  }

  write(data: string): Promise<void> {
    return getLocalStorage().write(this.fileName, data);
  }

  read(): Promise<string | null> {
    return getLocalStorage().read(this.fileName);
  }

  exists(): Promise<boolean> {
    return getLocalStorage().exists(this.fileName);
  }

  remove(): Promise<void> {
    return getLocalStorage().remove(this.fileName);
  }
}

export const LocalVaultFile = new LocalFile(STORAGE_KEYS.VAULT_DATA);
export const LocalUserProfileFile = new LocalFile(STORAGE_KEYS.USER_PROFILE);
