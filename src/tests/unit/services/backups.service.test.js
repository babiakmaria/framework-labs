import { describe, it, expect, vi, beforeEach } from 'vitest';

// fs and zlib are mocked, no disk access
vi.mock('fs', () => ({
  createReadStream: vi.fn(),
}));
vi.mock('fs/promises', () => ({
  access: vi.fn(),
}));
vi.mock('zlib', () => ({
  createGunzip: vi.fn(),
}));

import { createReadStream } from 'fs';
import { access } from 'fs/promises';
import { createGunzip } from 'zlib';

// import after vi.mock hoisting
const { default: backupsService } = await import('../../../services/backups.service.js');

describe('BackupsService.getBackupStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when backup file does not exist', async () => {
    access.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const result = await backupsService.getBackupStream('1234567890');

    expect(result).toBeNull();
  });

  it('returns a gunzip stream when backup file exists', async () => {
    access.mockResolvedValue(undefined);

    const fakeGunzip = { pipe: vi.fn(), on: vi.fn(), destroy: vi.fn() };
    const fakeFileStream = {
      on: vi.fn().mockReturnThis(),
      pipe: vi.fn().mockReturnValue(fakeGunzip),
    };

    createGunzip.mockReturnValue(fakeGunzip);
    createReadStream.mockReturnValue(fakeFileStream);

    const result = await backupsService.getBackupStream('1234567890');

    expect(result).toBe(fakeGunzip);
    expect(createReadStream).toHaveBeenCalledWith(expect.stringContaining('1234567890.gz'));
  });

  it('wires up error handler on fileStream', async () => {
    access.mockResolvedValue(undefined);

    const fakeGunzip = { destroy: vi.fn() };
    const fakeFileStream = {
      on: vi.fn().mockReturnThis(),
      pipe: vi.fn().mockReturnValue(fakeGunzip),
    };

    createGunzip.mockReturnValue(fakeGunzip);
    createReadStream.mockReturnValue(fakeFileStream);

    await backupsService.getBackupStream('9999999999');

    expect(fakeFileStream.on).toHaveBeenCalledWith('error', expect.any(Function));

    // trigger the error handler and verify it destroys gunzip
    const errorHandler = fakeFileStream.on.mock.calls[0][1];
    const err = new Error('read error');
    errorHandler(err);
    expect(fakeGunzip.destroy).toHaveBeenCalledWith(err);
  });
});
