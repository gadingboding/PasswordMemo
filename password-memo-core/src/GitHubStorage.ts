import { IRemoteStorage, UploadOptions, DownloadOptions } from './RemoteStorage.js';
import { Octokit } from 'octokit';
import { Buffer } from 'buffer';
import { GitHubConfig } from './types/vault.js';

export class GitHubRemoteStorage implements IRemoteStorage {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;
    this.octokit = new Octokit({ auth: config.token });
  }

  private getFullPath(path: string): string {
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    if (this.config.path) {
      return `${this.config.path}/${normalizedPath}`.replace(/\/+/g, '/');
    }
    return normalizedPath;
  }

  async upload(path: string, data: string | Buffer, options: UploadOptions = {}): Promise<void> {
    const fullPath = this.getFullPath(path);
    const content = Buffer.from(data).toString('base64');
    let sha: string | undefined;

    try {
      const { data: existingFile } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: fullPath,
      });
      if (Array.isArray(existingFile)) {
        throw new Error(`Path ${fullPath} is a directory, not a file.`);
      }
      sha = existingFile.sha;
    } catch (error: any) {
      if (error.status !== 404) {
        throw error;
      }
    }

    if (sha && !options.overwrite) {
      throw new Error(`File ${fullPath} already exists and overwrite is false.`);
    }

    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.config.owner,
      repo: this.config.repo,
      path: fullPath,
      message: `Update ${fullPath}`,
      content,
      sha,
    });
  }

  async download(path: string, options: DownloadOptions = {}): Promise<string> {
    const fullPath = this.getFullPath(path);
    try {
      const { data: file } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: fullPath,
      });

      if (Array.isArray(file)) {
        throw new Error(`Path ${fullPath} is a directory, not a file.`);
      }

      const content = Buffer.from((file as any).content, 'base64').toString(options.encoding || 'utf8');
      return content;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`File not found: ${fullPath}`);
      }
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = this.getFullPath(path);
    try {
      await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: fullPath,
      });
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    const fullPath = this.getFullPath(path);
    let sha: string | undefined;

    try {
        const { data: existingFile } = await this.octokit.rest.repos.getContent({
            owner: this.config.owner,
            repo: this.config.repo,
            path: fullPath,
        });
        if (Array.isArray(existingFile)) {
            throw new Error(`Path ${fullPath} is a directory, not a file.`);
        }
        sha = existingFile.sha;
    } catch (error: any) {
        if (error.status === 404) {
            return;
        }
        throw error;
    }

    if (!sha) {
        return;
    }

    await this.octokit.rest.repos.deleteFile({
      owner: this.config.owner,
      repo: this.config.repo,
      path: fullPath,
      message: `Delete ${fullPath}`,
      sha,
    });
  }

  async createDirectory(path: string): Promise<void> {
    // GitHub repositories are git repositories. Git doesn't track empty directories.
    // A common workaround is to create a .gitkeep file in the directory.
    const fullPath = this.getFullPath(path + '/.gitkeep');

    try {
      await this.upload(fullPath, '', { overwrite: false });
    } catch (error) {
      // Ignore if the file already exists
    }
  }
}