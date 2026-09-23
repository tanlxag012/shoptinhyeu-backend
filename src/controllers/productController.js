const asyncHandler = require('express-async-handler');
const cloudinary   = require('cloudinary').v2;
const path         = require('path');
const Product      = require('../models/Product');
const Category     = require('../models/Category');

// ── Helper: upload 1 file buffer lên Cloudinary ────────────
const uploadToCloudinary = (buffer, originalname, folder = '4em/products') => {
  const ext       = path.extname(originalname).toLowerCase();
  const videoExts = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
  const isVideo   = videoExts.includes(ext);

  return new Promise((resolve, reject) => {
    const opts = {
      folder,
      resource_type: isVideo ? 'video' : 'image',
      quality: 'auto',
      fetch_format: 'auto',
      ...(isVideo && {
        eager: [{ format: 'jpg', transformation: [{ start_offset: '0' }] }], // thumbnail frame
        eager_async: true,
      }),
    };
    const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
      if (err) return reject(err);
      resolve({
        type:      isVideo ? 'video' : 'image',
        url:       result.secure_url,
        publicId:  result.public_id,
        thumbnail: isVideo
          ? result.eager?.[0]?.secure_url || result.secure_url.replace('/upload/', '/upload/so_0/').replace(/\.\w+$/, '.jpg')
          : '',
        alt: '',
        sortOrder: 0,
      });
    });
    stream.end(buffer);
  });
};

// ─── PUBLIC ───────────────────────────────────────────────

// @GET /api/products
exports.getProducts = asyncHandler(async (req, res) => {
  const {
    keyword, category, menh, gender,
    minPrice, maxPrice, isNew, isFeatured,
    sort = '-createdAt', page = 1, limit = 12,
  } = req.query;

  const filter = { isActive: true };
  if (keyword)   filter.$text     = { $search: keyword };
  if (category)  filter.category  = category;
  if (menh)      filter.menh      = { $in: menh.split(',') };
  if (gender)    filter.gender    = { $in: [gender, 'Unisex'] };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (isNew === 'true')      filter.isNew      = true;
  if (isFeatured === 'true') filter.isFeatured = true;

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate('category', 'name slug')
    .sort(sort).skip(skip).limit(Number(limit))
    .select('-reviews');

  res.json({ success: true, total, page: Number(page), pages: Math.ceil(total / Number(limit)), products });
});

// @GET /api/products/:slug
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { slug: req.params.slug, isActive: true },
    { $inc: { views: 1 } },
    { new: true }
  ).populate('category', 'name slug').populate('reviews.user', 'name avatar');

  if (!product) { res.status(404); throw new Error('Không tìm thấy sản phẩm'); }

  const related = await Product.find({
    _id: { $ne: product._id }, isActive: true,
    $or: [{ category: product.category }, { menh: { $in: product.menh } }],
  }).limit(8).select('name slug media price salePrice avgRating');

  res.json({ success: true, product, related });
});

// @POST /api/products/:id/reviews
exports.addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Không tìm thấy sản phẩm'); }

  const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user._id.toString());
  if (alreadyReviewed) { res.status(400); throw new Error('Bạn đã đánh giá sản phẩm này rồi'); }

  product.reviews.push({ user: req.user._id, name: req.user.name, rating: Number(rating), comment });
  product.calcAvgRating();
  await product.save();
  res.status(201).json({ success: true, message: 'Đánh giá đã được gửi, chờ duyệt' });
});

// ─── ADMIN ────────────────────────────────────────────────

// @GET /api/products/admin/list
exports.adminGetProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, keyword, category, isActive } = req.query;
  const filter = {};
  if (keyword)   filter.$text    = { $search: keyword };
  if (category)  filter.category = category;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate('category', 'name')
    .sort('-createdAt').skip(skip).limit(Number(limit))
    .select('-reviews');

  res.json({ success: true, total, pages: Math.ceil(total / Number(limit)), products });
});

// @POST /api/products/admin
exports.createProduct = asyncHandler(async (req, res) => {
  const data = { ...req.body };

  // Upload files (ảnh + video)
  if (req.files?.length) {
    const uploads = await Promise.all(req.files.map(f => uploadToCloudinary(f.buffer, f.originalname)));
    // Gán sortOrder theo thứ tự upload
    data.media = uploads.map((m, i) => ({ ...m, sortOrder: i }));
  }

  if (typeof data.menh === 'string') data.menh = JSON.parse(data.menh);
  if (typeof data.tags === 'string') data.tags = JSON.parse(data.tags);
  // Xoá field images cũ nếu có gửi nhầm
  delete data.images;

  const product = await Product.create(data);
  res.status(201).json({ success: true, product });
});

// @PUT /api/products/admin/:id
exports.updateProduct = asyncHandler(async (req, res) => {
  const data = { ...req.body };

  // Lấy product hiện tại trước để giữ media cũ
  const existing = await Product.findById(req.params.id);
  if (!existing) { res.status(404); throw new Error('Không tìm thấy sản phẩm'); }

  // Upload file mới nếu có
  if (req.files && req.files.length > 0) {
    const existingMedia = existing.media || [];
    const uploads = await Promise.all(req.files.map(f => uploadToCloudinary(f.buffer, f.originalname)));
    const maxOrder = existingMedia.reduce((m, x) => Math.max(m, x.sortOrder || 0), -1);
    data.media = [
      ...existingMedia,
      ...uploads.map((m, i) => ({ ...m, sortOrder: maxOrder + i + 1 })),
    ];
  } else if (data.media && typeof data.media === 'string') {
    try { data.media = JSON.parse(data.media); } catch (e) { delete data.media; }
  }

  // Parse arrays
  if (typeof data.menh === 'string') {
    try { data.menh = JSON.parse(data.menh); } catch { data.menh = []; }
  }
  if (typeof data.tags === 'string') {
    try { data.tags = JSON.parse(data.tags); } catch { data.tags = []; }
  }
  delete data.images;

  const updated = await Product.findByIdAndUpdate(
    req.params.id, data, { new: true, runValidators: true }
  );
  res.json({ success: true, product: updated });
});

// @DELETE /api/products/admin/:id
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Không tìm thấy sản phẩm'); }

  if (product.media?.length) {
    await Promise.all(product.media.map(m => {
      if (m.publicId) {
        const resourceType = m.type === 'video' ? 'video' : 'image';
        return cloudinary.uploader.destroy(m.publicId, { resource_type: resourceType });
      }
    }));
  }

  await product.deleteOne();
  res.json({ success: true, message: 'Đã xoá sản phẩm' });
});

// @DELETE /api/products/admin/:id/media/:publicId  – xoá 1 media item
exports.deleteProductMedia = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Không tìm thấy sản phẩm'); }

  const pid   = decodeURIComponent(req.params.publicId);
  const item  = product.media.find(m => m.publicId === pid);
  if (item) {
    const resourceType = item.type === 'video' ? 'video' : 'image';
    await cloudinary.uploader.destroy(pid, { resource_type: resourceType });
  }

  product.media = product.media.filter(m => m.publicId !== pid);
  await product.save();
  res.json({ success: true, media: product.media });
});

// @PUT /api/products/admin/:id/media/reorder – sắp xếp lại thứ tự media
exports.reorderMedia = asyncHandler(async (req, res) => {
  // req.body.order = [{ publicId, sortOrder }, ...]
  const { order } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Không tìm thấy sản phẩm'); }

  order.forEach(({ publicId, sortOrder }) => {
    const item = product.media.find(m => m.publicId === publicId);
    if (item) item.sortOrder = sortOrder;
  });
  product.media.sort((a, b) => a.sortOrder - b.sortOrder);
  await product.save();
  res.json({ success: true, media: product.media });
});

// @PUT /api/products/admin/:id/reviews/:reviewId/approve
exports.approveReview = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  const review  = product.reviews.id(req.params.reviewId);
  if (!review) { res.status(404); throw new Error('Không tìm thấy đánh giá'); }
  review.isApproved = true;
  product.calcAvgRating();
  await product.save();
  res.json({ success: true, message: 'Đã duyệt đánh giá' });
});
