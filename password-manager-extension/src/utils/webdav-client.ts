/**
 * WebDAV Client with Permission Management for Browser Extensions
 * 浏览器扩展专用的WebDAV客户端，集成权限管理
 */

import { createClient, WebDAVClient } from 'webdav';
import { webdavPermissions } from './permissions';

interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  path?: string;
}

export class ExtensionWebDAVClient {
  private client: WebDAVClient | null = null;
  private config: WebDAVConfig | null = null;

  /**
   * 初始化WebDAV客户端
   */
  async initialize(config: WebDAVConfig): Promise<void> {
    this.config = config;

    // 检查并请求权限
    const hasPermission = await webdavPermissions.check(config.url);
    if (!hasPermission) {
      const granted = await webdavPermissions.request(config.url);
      if (!granted) {
        throw new Error(`WebDAV权限被拒绝: ${config.url}`);
      }
    }

    // 创建WebDAV客户端
    this.client = createClient(config.url, {
      username: config.username,
      password: config.password
    });

    // 测试连接
    try {
      await this.client.getDirectoryContents('/');
    } catch (error) {
      throw new Error(`WebDAV连接失败: ${error}`);
    }
  }

  /**
   * 检查权限状态
   */
  async checkPermissions(): Promise<boolean> {
    if (!this.config) {
      return false;
    }
    return await webdavPermissions.check(this.config.url);
  }

  /**
   * 确保有权限，没有则请求
   */
  private async ensurePermissions(): Promise<void> {
    if (!this.config) {
      throw new Error('WebDAV客户端未初始化');
    }

    const hasPermission = await webdavPermissions.check(this.config.url);
    if (!hasPermission) {
      const granted = await webdavPermissions.request(this.config.url);
      if (!granted) {
        throw new Error(`WebDAV权限不足: ${this.config.url}`);
      }
    }
  }

  /**
   * 获取文件内容
   */
  async getFileContents(path: string, options?: any): Promise<string | ArrayBuffer | null> {
    if (!this.client) {
      throw new Error('WebDAV客户端未初始化');
    }

    await this.ensurePermissions();

    try {
      const result = await this.client.getFileContents(path, options);
      return result as string | ArrayBuffer | null;
    } catch (error) {
      // 处理权限相关错误
      if (this.isPermissionError(error)) {
        console.warn('WebDAV权限可能已过期，尝试重新请求...');
        await this.ensurePermissions();
        const result = await this.client.getFileContents(path, options);
        return result as string | ArrayBuffer | null;
      }
      throw error;
    }
  }

  /**
   * 保存文件内容
   */
  async putFileContents(path: string, data: string | ArrayBuffer, options?: any): Promise<boolean> {
    if (!this.client) {
      throw new Error('WebDAV客户端未初始化');
    }

    await this.ensurePermissions();

    try {
      return await this.client.putFileContents(path, data, options);
    } catch (error) {
      // 处理权限相关错误
      if (this.isPermissionError(error)) {
        console.warn('WebDAV权限可能已过期，尝试重新请求...');
        await this.ensurePermissions();
        return await this.client.putFileContents(path, data, options);
      }
      throw error;
    }
  }

  /**
   * 创建目录
   */
  async createDirectory(path: string): Promise<void> {
    if (!this.client) {
      throw new Error('WebDAV客户端未初始化');
    }

    await this.ensurePermissions();

    try {
      await this.client.createDirectory(path);
    } catch (error) {
      // 处理权限相关错误
      if (this.isPermissionError(error)) {
        console.warn('WebDAV权限可能已过期，尝试重新请求...');
        await this.ensurePermissions();
        await this.client.createDirectory(path);
      } else {
        throw error;
      }
    }
  }

  /**
   * 获取目录内容
   */
  async getDirectoryContents(path: string, options?: any): Promise<any> {
    if (!this.client) {
      throw new Error('WebDAV客户端未初始化');
    }

    await this.ensurePermissions();

    try {
      return await this.client.getDirectoryContents(path, options);
    } catch (error) {
      // 处理权限相关错误
      if (this.isPermissionError(error)) {
        console.warn('WebDAV权限可能已过期，尝试重新请求...');
        await this.ensurePermissions();
        return await this.client.getDirectoryContents(path, options);
      }
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(path: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('WebDAV客户端未初始化');
    }

    await this.ensurePermissions();

    try {
      return await this.client.exists(path);
    } catch (error) {
      // 处理权限相关错误
      if (this.isPermissionError(error)) {
        console.warn('WebDAV权限可能已过期，尝试重新请求...');
        await this.ensurePermissions();
        return await this.client.exists(path);
      }
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(path: string): Promise<void> {
    if (!this.client) {
      throw new Error('WebDAV客户端未初始化');
    }

    await this.ensurePermissions();

    try {
      await this.client.deleteFile(path);
    } catch (error) {
      // 处理权限相关错误
      if (this.isPermissionError(error)) {
        console.warn('WebDAV权限可能已过期，尝试重新请求...');
        await this.ensurePermissions();
        await this.client.deleteFile(path);
      } else {
        throw error;
      }
    }
  }

  /**
   * 判断是否是权限相关错误
   */
  private isPermissionError(error: any): boolean {
    if (!error) return false;
    
    // 检查常见的跨域/权限错误
    const errorMessage = error.message || error.toString();
    const errorStatus = error.status;
    
    // CORS错误通常包含这些关键词
    if (errorMessage.includes('CORS') || 
        errorMessage.includes('Cross-Origin') || 
        errorMessage.includes('network error') ||
        errorMessage.includes('Failed to fetch')) {
      return true;
    }
    
    // 401, 403状态码通常表示权限问题
    if (errorStatus === 401 || errorStatus === 403) {
      return true;
    }
    
    return false;
  }

  /**
   * 获取原始WebDAV客户端（谨慎使用）
   */
  getRawClient(): WebDAVClient | null {
    return this.client;
  }

  /**
   * 获取当前配置
   */
  getConfig(): WebDAVConfig | null {
    return this.config;
  }

  /**
   * 销毁客户端
   */
  destroy(): void {
    this.client = null;
    this.config = null;
  }
}

/**
 * 创建扩展程序专用的WebDAV客户端实例
 */
export function createExtensionWebDAVClient(): ExtensionWebDAVClient {
  return new ExtensionWebDAVClient();
}

/**
 * 便捷函数：创建并初始化WebDAV客户端
 */
export async function createAndInitializeWebDAVClient(config: WebDAVConfig): Promise<ExtensionWebDAVClient> {
  const client = new ExtensionWebDAVClient();
  await client.initialize(config);
  return client;
}