const mongoose = require('mongoose');
const slugify = require('slugify');

const reviewSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:       { type: String, required: true },
  rating:     { type: Number, required: true, min: 1, max: 5 },
  comment:    { type: String, required: true },
  isApproved: { type: Boolean, default: false },
}, { timestamps: true });

// ── Media schema: ảnh hoặc video ──────────────────────────
const mediaSchema = new mongoose.Schema({
  type:      { type: String, enum: ['image', 'video'], default: 'image' },
  url:       { type: String, required: true },
  publicId:  { type: String, default: '' },
  thumbnail: { type: String, default: '' },   // poster frame cho video
  alt:       { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
});

const productSchema = new mongoose.Schema({
  name:        { type: String, required: [true, 'Vui lòng nhập tên sản phẩm'], trim: true },
  slug:        { type: String, unique: true },
  sku:         { type: String, unique: true, sparse: true },
  description: { type: String, default: '' },
  shortDesc:   { type: String, default: '' },
  price:       { type: Number, required: [true, 'Vui lòng nhập giá'], min: 0 },
  salePrice:   { type: Number, default: null },

  // ── Media (ảnh + video) ──
  media:       [mediaSchema],

  // Backward compat: virtual "images" trỏ sang media type=image
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  tags:        [String],

  menh:        [{ type: String, enum: ['Kim','Mộc','Thuỷ','Hoả','Thổ'] }],
  stoneType:   { type: String, default: '' },
  origin:      { type: String, default: '' },
  size:        { type: String, default: '' },
  material:    { type: String, default: '' },

  gender:      { type: String, enum: ['Nam','Nữ','Unisex'], default: 'Unisex' },
  stock:       { type: Number, default: 0, min: 0 },
  sold:        { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
  isFeatured:  { type: Boolean, default: false },
  isNew:       { type: Boolean, default: false },

  reviews:     [reviewSchema],
  numReviews:  { type: Number, default: 0 },
  avgRating:   { type: Number, default: 0 },
  views:       { type: Number, default: 0 },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual: lấy danh sách ảnh (backward compat với code cũ)
productSchema.virtual('images').get(function () {
  return this.media.filter(m => m.type === 'image');
});

// Virtual: lấy danh sách video
productSchema.virtual('videos').get(function () {
  return this.media.filter(m => m.type === 'video');
});

// Virtual: ảnh thumbnail đầu tiên
productSchema.virtual('thumbnail').get(function () {
  const img = this.media.find(m => m.type === 'image');
  return img?.url || '';
});

productSchema.virtual('displayPrice').get(function () {
  return this.salePrice && this.salePrice < this.price ? this.salePrice : this.price;
});
productSchema.virtual('discountPercent').get(function () {
  if (!this.salePrice || this.salePrice >= this.price) return 0;
  return Math.round((1 - this.salePrice / this.price) * 100);
});

productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, locale: 'vi' }) + '-' + Date.now();
  }
  next();
});

productSchema.methods.calcAvgRating = function () {
  const approved = this.reviews.filter(r => r.isApproved);
  this.numReviews = approved.length;
  this.avgRating  = approved.length
    ? approved.reduce((s, r) => s + r.rating, 0) / approved.length : 0;
};

productSchema.index({ name: 'text', description: 'text', stoneType: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1, price: 1 });
productSchema.index({ menh: 1, gender: 1 });
productSchema.index({ slug: 1 });

module.exports = mongoose.model('Product', productSchema);
