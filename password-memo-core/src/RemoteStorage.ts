/**
 * Remote Storage Interface
 *
 * Defines the interface for remote storage implementations that handle file uploads and downloads.
 * This allows for different remote backends (WebDAV, S3, etc.) to be used interchangeably.
 */

import {WebDAVConfig} from './types/vault.js';
import {WebDAVPermissionError, createPermissions} from './Permissions.js';

/**
 * Remote storage interface
 */
export interface IRemoteStorage {
  /**
   * Upload a file to remote storage
   * @param path The remote path where the file should be stored
   * @param data The file data to upload
   * @param options Additional options for the upload
   */
  upload(path: string, data: string | Buffer, options?: UploadOptions): Promise<void>;

  /**
   * Download a file from remote storage
   * @param path The remote path of the file to download
   * @param options Additional options for the download
   * @returns The file data as a string
   */
  download(path: string, options?: DownloadOptions): Promise<string>;

  /**
   * Check if a file exists in remote storage
   * @param path The remote path of the file to check
   * @returns True if the file exists, false otherwise
   */
  exists(path: string): Promise<boolean>;

  /**
   * Delete a file from remote storage
   * @param path The remote path of the file to delete
   */
  delete(path: string): Promise<void>;

  /**
   * Create a directory in remote storage
   * @param path The remote path of the directory to create
   */
  createDirectory(path: string): Promise<void>;
}

/**
 * Upload options
 */
export interface UploadOptions {
  /**
   * Whether to overwrite the file if it already exists
   */
  overwrite?: boolean;
}

/**
 * Download options
 */
export interface DownloadOptions {
  /**
   * Encoding for the downloaded data (default: 'utf8')
   */
  encoding?: BufferEncoding;
}


/**
 * WebDAV Remote Storage
 *
 * Implements the IRemoteStorage interface for WebDAV remote storage.
 */
export class WebDAVRemoteStorage implements IRemoteStorage {
  private client: any; // WebDAVClient from webdav library
  private config: WebDAVConfig;

  constructor(config: WebDAVConfig) {
    this.config = config;
  }

  /**
   * Initialize the WebDAV client
   */
  private async initializeClient(): Promise<void> {
    if (this.client) {
      return;
    }

    // Ensure permissions are granted before initializing the client
    const hasPermission = await createPermissions().ensurePermissions(this.config.url);
    if (!hasPermission) {
      throw new WebDAVPermissionError('WebDAV cross-origin permission required');
    }

    const {createClient} = await import('webdav');
    this.client = createClient(this.config.url, {
      username: this.config.username,
      password: this.config.password
    });

    // Test connection
    await this.client.getDirectoryContents('/');
  }

  /**
   * Get the full path for a file
   */
  private getFullPath(path: string): string {
    // Normalize path - ensure it starts with a slash
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // If a custom path is provided in the config, prepend it
    if (this.config.path) {
      const basePath = this.config.path.startsWith('/')
        ? this.config.path
        : `/${this.config.path}`;

      // Ensure no double slashes
      return `${basePath}${normalizedPath}`.replace(/\/+/g, '/');
    }

    return normalizedPath;
  }

  /**
   * Get the directory path from a file path
   */
  private getDirectoryPath(filePath: string): string {
    const lastSlashIndex = filePath.lastIndexOf('/');

    if (lastSlashIndex <= 0) {
      return '/'; // Root directory
    }

    return filePath.substring(0, lastSlashIndex);
  }

  async upload(path: string, data: string | Buffer, options: UploadOptions = {}): Promise<void> {
    await this.initializeClient();
    const directoryPath = this.getDirectoryPath(path);

    try {
      // Ensure the directory exists (unless it's the root directory)
      if (directoryPath && directoryPath !== '/') {
        try {
          await this.client.createDirectory(directoryPath);
        } catch (dirError: any) {
          // Directory might already exist, which is fine
          if (dirError.status !== 405) { // 405 Method Not Allowed means directory exists
            throw dirError;
          }
        }
      }

      // Upload the file
      await this.client.putFileContents(path, data, {
        overwrite: options.overwrite !== false // Default to true
      });
    } catch (error) {
      throw new Error(`Failed to upload file to ${path}: ${error}`);
    }
  }

  async download(path: string, options: DownloadOptions = {}): Promise<string> {
    await this.initializeClient();

    try {
      const data = await this.client.getFileContents(path, {
        format: 'text'
      });

      if (typeof data === 'string') {
        return data;
      }

      throw new Error('Unexpected data format from WebDAV server');
    } catch (error: any) {
      // File might not exist
      if (error.status === 404) {
        throw new Error(`File not found: ${path}`);
      }

      throw new Error(`Failed to download file from ${path}: ${error}`);
    }
  }

  async exists(path: string): Promise<boolean> {
    await this.initializeClient();
    try {
      await this.client.stat(path);
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    await this.initializeClient();
    try {
      await this.client.deleteFile(path);
    } catch (error: any) {
      if (error.status === 404) {
        // File doesn't exist, consider it deleted
        return;
      }
      throw new Error(`Failed to delete file ${path}: ${error}`);
    }
  }

  async createDirectory(path: string): Promise<void> {
    await this.initializeClient();

    try {
      await this.client.createDirectory(path);
    } catch (error: any) {
      // Directory might already exist, which is fine
      if (error.status !== 405) { // 405 Method Not Allowed means directory exists
        throw new Error(`Failed to create directory ${path}: ${error}`);
      }
    }
  }
}