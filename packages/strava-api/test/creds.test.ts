import * as FS from '@epdoc/fs/fs'; // Import FS for type casting
import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { isValidCredData, StravaCreds } from '../src/auth/creds.ts';
import type { StravaCredsData } from '../src/types.ts';

const mockDate = 1678886400; // A fixed timestamp for deterministic tests (e.g., March 15, 2023 12:00:00 PM UTC)

class MockFile extends FS.File {
  #content: unknown | undefined;
  #exists: boolean;

  constructor(path: string, exists: boolean = false, content: unknown = undefined) {
    super(path);
    this.#exists = exists;
    this.#content = content;
  }

  override isFile(): Promise<boolean> {
    return Promise.resolve(this.#exists);
  }

  override readJson<T>(): Promise<T> {
    if (!this.#exists) {
      return Promise.reject(new Error('File does not exist'));
    }
    return Promise.resolve(this.#content as T);
  }

  override writeJson(data: unknown): Promise<this> {
    this.#content = data;
    this.#exists = true;
    return Promise.resolve(this);
  }

  override get path(): FS.FilePath {
    return super.path as FS.FilePath;
  }
}

describe('isValidCredData', () => {
  it('should return true for valid cred data', () => {
    const validData: StravaCredsData = {
      token_type: 'Bearer',
      expires_at: mockDate + 3600,
      expires_in: 3600,
      refresh_token: 'refresh123',
      access_token: 'access123',
      athlete: { id: '123' },
    };
    expect(isValidCredData(validData)).toBe(true);
  });

  it('should return false for invalid token_type', () => {
    const invalidData = {
      token_type: 'Other',
      expires_at: Date.now() / 1000 + 3600,
      expires_in: 3600,
      refresh_token: 'refresh123',
      access_token: 'access123',
      athlete: { id: '123' },
    };
    expect(isValidCredData(invalidData)).toBe(false);
  });

  it('should return false for missing expires_at', () => {
    const invalidData = {
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'refresh123',
      access_token: 'access123',
      athlete: { id: '123' },
    };
    expect(isValidCredData(invalidData)).toBe(false);
  });

  it('should return false for non-dict data', () => {
    expect(isValidCredData(null)).toBe(false);
    expect(isValidCredData('string')).toBe(false);
    expect(isValidCredData(123)).toBe(false);
  });
});

describe('StravaCreds', () => {
  const mockPath = '/tmp/test-creds.json';

  it('should initialize with default token if file does not exist', async () => {
    const mockFile = new MockFile(mockPath, false);
    const creds = new StravaCreds(mockFile);
    await creds.read(); // Attempt to read, should not find file
    expect(creds.accessToken).toBeUndefined();
    expect(creds.refreshToken).toBeUndefined();
    expect(creds.expiresAt).toBe(0);
  });

  it('should read valid credentials from file', async () => {
    const validData: StravaCredsData = {
      token_type: 'Bearer',
      expires_at: mockDate + 3600,
      expires_in: 3600,
      refresh_token: 'refresh_valid',
      access_token: 'access_valid',
      athlete: { id: '456' },
    };
    const mockFile = new MockFile(mockPath, true, validData);
    const creds = new StravaCreds(mockFile);
    await creds.read();
    expect(creds.accessToken).toBe('access_valid');
    expect(creds.refreshToken).toBe('refresh_valid');
    expect(creds.expiresAt).toBe(validData.expires_at);
  });

  it('should throw error for invalid credentials file', async () => {
    const invalidData = { some: 'invalid', data: 123 };
    const mockFile = new MockFile(mockPath, true, invalidData);
    const creds = new StravaCreds(mockFile);
    await expect(creds.read()).rejects.toThrow('Invalid credentials file');
  });

  it('should write valid credentials to file', async () => {
    const mockFile = new MockFile(mockPath, false);
    const creds = new StravaCreds(mockFile);
    const newData: StravaCredsData = {
      token_type: 'Bearer',
      expires_at: mockDate + 7200,
      expires_in: 7200,
      refresh_token: 'new_refresh',
      access_token: 'new_access',
      athlete: { id: '789' },
    };
    await creds.write(newData);
    expect(creds.accessToken).toBe('new_access');
    expect(creds.refreshToken).toBe('new_refresh');
    expect(creds.expiresAt).toBe(newData.expires_at);
    // Verify content in mock file
    expect(await mockFile.readJson()).toEqual(newData);
  });

  it('should throw error for writing invalid credentials', async () => {
    const mockFile = new MockFile(mockPath, false);
    const creds = new StravaCreds(mockFile);
    const invalidData = { bad: 'data' };
    await expect(creds.write(invalidData as unknown as StravaCredsData)).rejects.toThrow(
      'Invalid token data',
    );
  });

  describe('isValid and needsRefresh', () => {
    const now = mockDate;

    it('should be valid if expires_at is in the future', async () => {
      const validData: StravaCredsData = {
        token_type: 'Bearer',
        expires_at: now + 8000,
        expires_in: 8000,
        refresh_token: 'r',
        access_token: 'a',
        athlete: {},
      };
      const mockFile = new MockFile(mockPath, true, validData);
      const creds = new StravaCreds(mockFile);
      await creds.read();
      expect(creds.isValid(0, now)).toBe(true);
      expect(creds.needsRefresh(undefined, now)).toBe(false);
    });

    it('should be invalid if expires_at is in the past', async () => {
      const expiredData: StravaCredsData = {
        token_type: 'Bearer',
        expires_at: now - 1000,
        expires_in: -1000,
        refresh_token: 'r',
        access_token: 'a',
        athlete: {},
      };
      const mockFile = new MockFile(mockPath, true, expiredData);
      const creds = new StravaCreds(mockFile);
      await creds.read();
      expect(creds.isValid(0, now)).toBe(false);
      expect(creds.needsRefresh(undefined, now)).toBe(true);
    });

    it('should be invalid if expires_at is in the future but within refresh window', async () => {
      const soonToExpireData: StravaCredsData = {
        token_type: 'Bearer',
        expires_at: now + 300, // 5 minutes from now
        expires_in: 300,
        refresh_token: 'r',
        access_token: 'a',
        athlete: {},
      };
      const mockFile = new MockFile(mockPath, true, soonToExpireData);
      const creds = new StravaCreds(mockFile);
      await creds.read();
      // Default refresh window is 2 hours (7200 seconds)
      expect(creds.isValid(0, now)).toBe(true); // Still valid generally
      expect(creds.needsRefresh(undefined, now)).toBe(true); // But needs refresh within default window
      expect(creds.isValid(100, now)).toBe(true); // Valid for 100 seconds
      expect(creds.needsRefresh(100, now)).toBe(false); // Does not need refresh for 100 seconds
    });

    it('should throw error if token_type is not Bearer', async () => {
      const wrongTypeData: StravaCredsData = {
        token_type: 'Mac',
        expires_at: now + 1000,
        expires_in: 1000,
        refresh_token: 'r',
        access_token: 'a',
        athlete: {},
      };
      const mockFile = new MockFile(mockPath, true, wrongTypeData);
      const creds = new StravaCreds(mockFile);
      await expect(creds.read()).rejects.toThrow('Invalid credentials file');
    });
  });
});
