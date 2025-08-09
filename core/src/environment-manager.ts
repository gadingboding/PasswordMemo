/**
 * Environment Manager
 *
 * Manages environment detection and storage operations for cross-platform compatibility.
 * This class implements the singleton pattern to ensure only one instance exists.
 */

/**
 * Storage adapter interface for abstracting different storage backends
 */
export interface IStorageAdapter {
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

  /**
   * List all keys/paths (optional, for debugging/management)
   * @returns Array of all available keys/paths
   */
  list?(): Promise<string[]>;
}

/**
 * Storage adapter configuration
 */
export interface StorageAdapterConfig {
  /** Base path or prefix for storage keys */
  basePath?: string;
  /** Storage namespace to avoid conflicts */
  namespace?: string;
}

/**
 * Browser-specific storage adapter configuration
 */
export interface BrowserStorageConfig extends StorageAdapterConfig {
  /** Whether to use IndexedDB instead of localStorage */
  useIndexedDB?: boolean;
  /** IndexedDB database name */
  dbName?: string;
  /** IndexedDB store name */
  storeName?: string;
}

/**
 * Node.js-specific storage adapter configuration
 */
export interface NodeStorageConfig extends StorageAdapterConfig {
  /** Base directory for file storage */
  baseDir?: string;
  /** File extension for stored files */
  fileExtension?: string;
}

/**
 * Browser storage adapter using localStorage
 */
class BrowserStorageAdapter implements IStorageAdapter {
  private readonly namespace: string;
  private readonly basePath: string;

  constructor(config: BrowserStorageConfig = {}) {
    this.namespace = config.namespace || 'password-manager';
    this.basePath = config.basePath || '';
  }

  /**
   * Generate the full key for localStorage
   */
  private getKey(path: string): string {
    const parts = [this.namespace];
    if (this.basePath) {
      parts.push(this.basePath);
    }
    parts.push(path);
    return parts.join(':');
  }

  /**
   * Read content from localStorage
   */
  async read(path: string): Promise<string | null> {
    try {
      const key = this.getKey(path);
      const data = localStorage.getItem(key);
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Write content to localStorage
   */
  async write(path: string, data: string): Promise<void> {
    try {
      const key = this.getKey(path);
      localStorage.setItem(key, data);
    } catch (error) {
      throw new Error(`Failed to write to storage: ${error}`);
    }
  }

  /**
   * Check if key exists in localStorage
   */
  async exists(path: string): Promise<boolean> {
    try {
      const key = this.getKey(path);
      return localStorage.getItem(key) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove content from localStorage
   */
  async remove(path: string): Promise<void> {
    try {
      const key = this.getKey(path);
      localStorage.removeItem(key);
    } catch (error) {
      throw new Error(`Failed to remove from storage: ${error}`);
    }
  }

  /**
   * List all keys in localStorage that match our namespace
   */
  async list(): Promise<string[]> {
    try {
      const keys: string[] = [];
      const prefix = `${this.namespace}:`;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          // Remove namespace and basePath to get the original path
          let path = key.substring(prefix.length);
          if (this.basePath) {
            const basePrefix = `${this.basePath}:`;
            if (path.startsWith(basePrefix)) {
              path = path.substring(basePrefix.length);
            }
          }
          keys.push(path);
        }
      }

      return keys;
    } catch (error) {
      return [];
    }
  }
}

/**
 * Node.js storage adapter using file system
 */
class NodeStorageAdapter implements IStorageAdapter {
  private readonly baseDir: string;
  private readonly fileExtension: string;
  private readonly namespace: string;

  constructor(config: NodeStorageConfig = {}) {
    this.baseDir = config.baseDir || './data';
    this.fileExtension = config.fileExtension || '.json';
    this.namespace = config.namespace || 'password-manager';
  }

  /**
   * Generate the full file path
   */
  private getFilePath(path: string): string {
    const fileName = `${path}${this.fileExtension}`;
    // Use URL pattern for path joining in ESM
    if (this.baseDir.endsWith('/')) {
      return `${this.baseDir}${this.namespace}/${fileName}`;
    } else {
      return `${this.baseDir}/${this.namespace}/${fileName}`;
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
      const data = await fs.readFile(filePath, 'utf-8');
      return data;
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

  /**
   * List all files in the storage directory
   */
  async list(): Promise<string[]> {
    try {
      // Use dynamic import for Node.js modules
      const {join} = await import('path');
      const {promises: fs} = await import('fs');
      const dirPath = join(this.baseDir, this.namespace);

      try {
        await fs.access(dirPath);
      } catch {
        return []; // Directory doesn't exist
      }

      const files = await fs.readdir(dirPath);
      return files
        .filter((file: string) => file.endsWith(this.fileExtension))
        .map((file: string) => file.slice(0, -this.fileExtension.length));
    } catch (error) {
      return [];
    }
  }
}

/**
 * Environment Manager singleton class
 */
export class EnvironmentManager {
  private static instance: EnvironmentManager;
  private storage: IStorageAdapter | null = null;
  private environment: 'browser' | 'node' | null = null;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
  }

  /**
   * Get the singleton instance of EnvironmentManager
   */
  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  /**
   * Detect the current runtime environment
   */
  private detectEnvironment(): 'browser' | 'node' {
    if (this.environment) {
      return this.environment;
    }

    // Check for Node.js specific globals
    if (typeof process !== 'undefined' &&
      process.versions &&
      process.versions.node) {
      this.environment = 'node';
      return 'node';
    }

    // Check for browser specific globals
    if (typeof window !== 'undefined' &&
      typeof document !== 'undefined') {
      this.environment = 'browser';
      return 'browser';
    }

    // Default to browser if uncertain
    this.environment = 'browser';
    return 'browser';
  }

  /**
   * Create storage adapter based on the detected environment
   */
  private createStorage(config?: BrowserStorageConfig | NodeStorageConfig): IStorageAdapter {
    const environment = this.detectEnvironment();

    if (environment === 'node') {
      return new NodeStorageAdapter(config as NodeStorageConfig);
    } else {
      return new BrowserStorageAdapter(config as BrowserStorageConfig);
    }
  }

  /**
   * Get the storage adapter instance, creating it if necessary
   */
  public getStorage(config?: BrowserStorageConfig | NodeStorageConfig): IStorageAdapter {
    if (!this.storage) {
      this.storage = this.createStorage(config);
    }
    return this.storage;
  }

  /**
   * Get the current environment
   */
  public getEnvironment(): 'browser' | 'node' {
    return this.detectEnvironment();
  }

  /**
   * Check if running in a secure context (HTTPS/localhost)
   */
  public isSecureContext(): boolean {
    const environment = this.detectEnvironment();

    if (environment === 'node') {
      // In Node.js, we consider the context secure by default
      // since we have full control over the environment
      return true;
    }

    // Browser environment
    if (typeof window !== 'undefined' && window.isSecureContext !== undefined) {
      return window.isSecureContext;
    }

    // Fallback check
    if (typeof location !== 'undefined') {
      return location.protocol === 'https:' ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1';
    }

    return false;
  }

  /**
   * Reset the storage adapter (useful for testing)
   */
  public reset(): void {
    this.storage = null;
    this.environment = null;
  }
}