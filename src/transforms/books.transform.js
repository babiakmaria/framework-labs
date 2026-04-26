import { Transform } from 'stream';

export class BookAgeTransform extends Transform {
  constructor(options = {}) {
    super({ ...options, objectMode: true });
    this._currentYear = new Date().getFullYear();
  }

  _transform(book, _encoding, callback) {
    callback(null, {
      ...book,
      age: this._currentYear - Number(book.year)
    });
  }
}
