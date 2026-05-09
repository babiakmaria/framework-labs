import backupsService from '../services/backups.service.js';

class BackupsController {
  async getBackup(request, reply) {
    const { timestamp } = request.params;
    const stream = await backupsService.getBackupStream(timestamp);

    if (!stream) {
      return reply.code(404).send({ message: 'Backup not found' });
    }

    reply.header('Content-Disposition', `attachment; filename="${timestamp}.json"`);
    reply.type('application/json');
    return reply.send(stream);
  }
}

export default new BackupsController();
