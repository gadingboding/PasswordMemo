/**
 * WebDAV Permissions Management
 *
 * Handles cross-origin permissions for WebDAV access in browser environments.
 * Provides a unified interface for permission checking across different platforms.
 */

import {detectEnvironment, EnvType} from "@/utils.js";

/**
 * WebDAV permissions interface
 */
export interface WebDAVPermissions {
  /**
   * Check if WebDAV permissions are granted for the given URL
   */
  check(webdavUrl: string): Promise<boolean>;

  /**
   * Request WebDAV permissions for the given URL
   */
  request(webdavUrl: string): Promise<boolean>;

  /**
   * Ensure permissions are granted, request if not already granted
   */
  ensurePermissions(webdavUrl: string): Promise<boolean>;
}

/**
 * WebDAV permission error
 */
export class WebDAVPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebDAVPermissionError';
  }
}

/**
 * Browser environment WebDAV permissions implementation
 */
export class BrowserWebDAVPermissions implements WebDAVPermissions {
  /**
   * Request WebDAV server's cross-origin permission
   */
  private async requestWebDAVPermission(webdavUrl: string): Promise<boolean> {
    try {
      // Check if chrome.permissions API is available
      if (typeof window === 'undefined' || !window.chrome || !window.chrome.permissions) {
        return true; // Non-browser environment or permissions API not available
      }

      const url = new URL(webdavUrl);
      const origin = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}/*`;

      const request = {origins: [origin]};

      return new Promise<boolean>((resolve) => {
        window.chrome.permissions.request(request, (granted) => {
          if (granted) {
            console.log('WebDAV permission request successful:', origin);
          } else {
            console.log('WebDAV permission request denied:', origin);
          }
          resolve(granted || false);
        });
      });
    } catch (error) {
      console.error('WebDAV permission request failed:', error);
      return false;
    }
  }

  /**
   * Check if WebDAV permissions are already granted
   */
  private async checkWebDAVPermission(webdavUrl: string): Promise<boolean> {
    try {
      // Check if chrome.permissions API is available
      if (typeof window === 'undefined' || !window.chrome || !window.chrome.permissions) {
        return true; // Non-browser environment or permissions API not available
      }

      const url = new URL(webdavUrl);
      const origin = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}/*`;

      const request = {origins: [origin]};

      return new Promise<boolean>((resolve) => {
        window.chrome.permissions.contains(request, resolve);
      });
    } catch (error) {
      console.error('Failed to check WebDAV permissions:', error);
      return false;
    }
  }

  /**
   * Check if WebDAV permissions are granted for the given URL
   */
  async check(webdavUrl: string): Promise<boolean> {
    return await this.checkWebDAVPermission(webdavUrl);
  }

  /**
   * Request WebDAV permissions for the given URL
   */
  async request(webdavUrl: string): Promise<boolean> {
    return await this.requestWebDAVPermission(webdavUrl);
  }

  /**
   * Ensure permissions are granted, request if not already granted
   */
  async ensurePermissions(webdavUrl: string): Promise<boolean> {
    const hasPermission = await this.checkWebDAVPermission(webdavUrl);
    if (hasPermission) {
      return true;
    }
    return await this.requestWebDAVPermission(webdavUrl);
  }
}

/**
 * Node.js environment WebDAV permissions implementation
 * In Node.js, cross-origin restrictions don't apply, so always return true
 */
export class NodeWebDAVPermissions implements WebDAVPermissions {
  async check(): Promise<boolean> {
    return true;
  }

  async request(): Promise<boolean> {
    return true;
  }

  async ensurePermissions(): Promise<boolean> {
    return true;
  }
}

/**
 * Create appropriate permissions implementation based on environment
 */
export function createPermissions(): WebDAVPermissions {
  // Check if we're in a browser environment with chrome permissions API
  if (detectEnvironment() === EnvType.NODE) {
    return new NodeWebDAVPermissions();
  } else {
    return new BrowserWebDAVPermissions();
  }
}