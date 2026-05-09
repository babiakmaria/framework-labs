import { createReadStream } from 'fs';
import { access } from 'fs/promises';
import { createGunzip } from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupsPath = path.join(__dirname, '../../data/backups');

class BackupsService {
  async getBackupStream(timestamp) {
    const filePath = path.join(backupsPath, `${timestamp}.gz`);

    try {
      await access(filePath);
    } catch {
      return null;
    }

    const gunzip = createGunzip();
    createReadStream(filePath).on('error', (err) => gunzip.destroy(err)).pipe(gunzip);
    return gunzip;
  }
}

export default new BackupsService();
