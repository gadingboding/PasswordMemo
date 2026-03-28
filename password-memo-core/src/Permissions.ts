/**
 * WebDAV Permissions Management
 *
 * Handles cross-origin permissions for WebDAV access in browser environments.
 * Provides a unified interface for permission checking across different platforms.
 */

import browser from 'webextension-polyfill';

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
   * Check if browser.permissions API is available
   */
  private isPermissionsAPIAvailable(): boolean {
    return typeof browser !== 'undefined' && 
           browser.permissions && 
           typeof browser.permissions.request === 'function' &&
           typeof browser.permissions.contains === 'function';
  }

  /**
   * Extract origin from WebDAV URL
   */
  private extractOrigin(webdavUrl: string): string {
    const url = new URL(webdavUrl);
    return `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}/*`;
  }

  /**
   * Request WebDAV server's cross-origin permission
   */
  private async requestWebDAVPermission(webdavUrl: string): Promise<boolean> {
    try {
      console.log('[WebDAV Permissions] Requesting permission for:', webdavUrl);
      
      // If permissions API is not available, assume no permission needed (e.g., Node.js or background context)
      if (!this.isPermissionsAPIAvailable()) {
        console.log('[WebDAV Permissions] Permissions API not available, skipping');
        return true;
      }

      const origin = this.extractOrigin(webdavUrl);
      const request = {origins: [origin]};
      
      console.log('[WebDAV Permissions] Request object:', request);

      const granted = await browser.permissions.request(request);
      if (granted) {
        console.log('[WebDAV Permissions] Request successful:', origin);
      } else {
        console.warn('[WebDAV Permissions] Request denied:', origin);
      }
      return granted;
    } catch (error) {
      console.error('[WebDAV Permissions] Request failed:', error);
      return false;
    }
  }

  /**
   * Check if WebDAV permissions are already granted
   */
  private async checkWebDAVPermission(webdavUrl: string): Promise<boolean> {
    try {
      // If permissions API is not available, assume permission is granted
      if (!this.isPermissionsAPIAvailable()) {
        console.log('[WebDAV Permissions] Permissions API not available, assuming granted');
        return true;
      }

      const origin = this.extractOrigin(webdavUrl);
      const request = {origins: [origin]};
      
      console.log('[WebDAV Permissions] Checking permission for:', origin);

      const result = await browser.permissions.contains(request);
      console.log('[WebDAV Permissions] Check result:', result);
      return result;
    } catch (error) {
      console.error('[WebDAV Permissions] Check failed:', error);
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
 * Create appropriate permissions implementation based on environment.
 * Uses BrowserWebDAVPermissions by default for browser/extension environments,
 * and NodeWebDAVPermissions for Node.js environments.
 * 
 * @param forceNode - If true, forces the use of NodeWebDAVPermissions (useful for testing)
 */
export function createPermissions(forceNode: boolean = false): WebDAVPermissions {
  // If explicitly forced to Node mode, use NodeWebDAVPermissions
  if (forceNode) {
    return new NodeWebDAVPermissions();
  }
  
  // Check if browser.permissions API is available
  // This is more reliable than checking for window/document which can be present in extension contexts
  if (typeof browser !== 'undefined' && 
      browser.permissions && 
      typeof browser.permissions.request === 'function') {
    return new BrowserWebDAVPermissions();
  }
  
  // Default to NodeWebDAVPermissions for Node.js or when permissions API is not available
  return new NodeWebDAVPermissions();
}