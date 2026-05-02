import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, minlength: 1, maxlength: 200 },
    author: { type: String, required: true, minlength: 2, maxlength: 100 },
    year: { type: Number, required: true, min: 1000, max: new Date().getFullYear() },
    genre: { type: String, default: null, minlength: 3, maxlength: 100 },
    image: { type: String, default: null, maxlength: 500 }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      }
    }
  }
);

bookSchema.virtual('id').get(function () {
  return this._id.toString();
});

export const Book = mongoose.model('Book', bookSchema);
