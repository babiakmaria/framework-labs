import { Transform } from 'stream';

export class NdjsonTransform extends Transform {
  constructor(options = {}) {
    super({ ...options, writableObjectMode: true });
  }

  _transform(record, _encoding, callback) {
    callback(null, JSON.stringify(record) + '\n');
  }
}
