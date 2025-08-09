/**
 * WebDAV权限请求工具函数
 * 简化的权限管理，只处理WebDAV跨域访问需求
 */

/**
 * 请求WebDAV服务器的跨域权限
 */
async function requestWebDAVPermission(webdavUrl: string): Promise<boolean> {
  try {
    const url = new URL(webdavUrl);
    const origin = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}/*`;
    
    const request = { origins: [origin] };

    return new Promise<boolean>((resolve) => {
      chrome.permissions.request(request, (granted) => {
        if (granted) {
          console.log('WebDAV权限请求成功:', origin);
        } else {
          console.log('WebDAV权限请求被拒绝:', origin);
        }
        resolve(granted || false);
      });
    });
  } catch (error) {
    console.error('WebDAV权限请求失败:', error);
    return false;
  }
}

/**
 * 检查是否已有WebDAV权限
 */
async function checkWebDAVPermission(webdavUrl: string): Promise<boolean> {
  try {
    const url = new URL(webdavUrl);
    const origin = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}/*`;
    
    const request = { origins: [origin] };

    return new Promise<boolean>((resolve) => {
      chrome.permissions.contains(request, resolve);
    });
  } catch (error) {
    console.error('检查WebDAV权限失败:', error);
    return false;
  }
}

/**
 * WebDAV权限便捷操作
 */
export const webdavPermissions = {
  /**
   * 检查权限状态
   */
  async check(webdavUrl: string): Promise<boolean> {
    return await checkWebDAVPermission(webdavUrl);
  },

  /**
   * 请求权限
   */
  async request(webdavUrl: string): Promise<boolean> {
    return await requestWebDAVPermission(webdavUrl);
  },

  /**
   * 确保有权限，没有则请求
   */
  async ensurePermissions(webdavUrl: string): Promise<boolean> {
    const hasPermission = await checkWebDAVPermission(webdavUrl);
    if (hasPermission) {
      return true;
    }
    return await requestWebDAVPermission(webdavUrl);
  }
};