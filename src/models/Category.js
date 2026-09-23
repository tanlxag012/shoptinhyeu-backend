const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name:           { type: String, required: true, unique: true, trim: true },
  slug:           { type: String, unique: true },
  description:    { type: String, default: '' },
  image:          { type: String, default: '' },
  imagePublicId:  { type: String, default: '' },
  isActive:       { type: Boolean, default: true },
  sortOrder:      { type: Number, default: 0 },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

categorySchema.virtual('productCount', {
  ref: 'Product', localField: '_id', foreignField: 'category', count: true,
});

categorySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, locale: 'vi' });
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);