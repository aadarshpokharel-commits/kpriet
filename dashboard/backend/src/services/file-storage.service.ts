import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ApiError } from '../utils/ApiError.js';

export class FileStorageService {
  private static storageDirectory: string = path.resolve(
    process.cwd(),
    'storage/secure_uploads'
  );

  /**
   * Initializes the private storage folder.
   */
  public static ensureStorageDir(): string {
    if (!fs.existsSync(this.storageDirectory)) {
      fs.mkdirSync(this.storageDirectory, { recursive: true, mode: 0o700 });
    }
    return this.storageDirectory;
  }

  /**
   * Generates a collision-resistant UUID storage key.
   */
  public static generateStorageKey(extension: string): string {
    const uuid = crypto.randomUUID();
    const cleanExt = extension.startsWith('.') ? extension : `.${extension}`;
    return `sec_${uuid}${cleanExt}.bin`;
  }

  /**
   * Compute cryptographic SHA-256 hash of file buffer.
   */
  public static computeSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Write file to private disk storage.
   */
  public static async saveFile(buffer: Buffer, storageKey: string): Promise<string> {
    this.ensureStorageDir();
    const fullPath = path.join(this.storageDirectory, storageKey);

    // Prevent any directory traversal in storage key
    if (!fullPath.startsWith(this.storageDirectory)) {
      throw ApiError.badRequest('Invalid file storage path target.');
    }

    await fs.promises.writeFile(fullPath, buffer, { mode: 0o600 });
    return fullPath;
  }

  /**
   * Read file stream from private storage.
   */
  public static getFileReadStream(storageKey: string): fs.ReadStream {
    this.ensureStorageDir();
    const fullPath = path.join(this.storageDirectory, storageKey);

    if (!fs.existsSync(fullPath)) {
      throw ApiError.notFound('Requested file not found on private storage.');
    }

    return fs.createReadStream(fullPath);
  }

  /**
   * Read file buffer directly from private storage.
   */
  public static async getFileBuffer(storageKey: string): Promise<Buffer> {
    this.ensureStorageDir();
    const fullPath = path.join(this.storageDirectory, storageKey);

    if (!fs.existsSync(fullPath)) {
      throw ApiError.notFound('Requested file not found on private storage.');
    }

    return fs.promises.readFile(fullPath);
  }

  /**
   * Delete file from private storage.
   */
  public static async deleteFile(storageKey: string): Promise<boolean> {
    try {
      this.ensureStorageDir();
      const fullPath = path.join(this.storageDirectory, storageKey);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if file exists in private storage.
   */
  public static fileExists(storageKey: string): boolean {
    const fullPath = path.join(this.storageDirectory, storageKey);
    return fs.existsSync(fullPath);
  }
}
