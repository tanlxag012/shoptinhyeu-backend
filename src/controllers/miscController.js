const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const Coupon   = require('../models/Coupon');
const User     = require('../models/User');

// ── CATEGORIES ──────────────────────────────────────────────

exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .sort('sortOrder name')
    .populate('productCount');
  res.json({ success: true, categories });
});

exports.adminGetCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort('sortOrder name').populate('productCount');
  res.json({ success: true, categories });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file) {
    const cloudinary = require('cloudinary').v2;
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: '4em/categories', quality: 'auto', fetch_format: 'auto' },
        (err, r) => err ? reject(err) : resolve(r)
      );
      stream.end(req.file.buffer);
    });
    data.image     = result.secure_url;
    data.imagePublicId = result.public_id;
  }
  const category = await Category.create(data);
  res.status(201).json({ success: true, category });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file) {
    const cloudinary = require('cloudinary').v2;
    // Xoá ảnh cũ nếu có
    const old = await Category.findById(req.params.id);
    if (old?.imagePublicId) {
      await cloudinary.uploader.destroy(old.imagePublicId).catch(() => {});
    }
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: '4em/categories', quality: 'auto', fetch_format: 'auto' },
        (err, r) => err ? reject(err) : resolve(r)
      );
      stream.end(req.file.buffer);
    });
    data.image         = result.secure_url;
    data.imagePublicId = result.public_id;
  }
  const category = await Category.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!category) { res.status(404); throw new Error('Không tìm thấy danh mục'); }
  res.json({ success: true, category });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const Product = require('./productController');
  const count = await require('../models/Product').countDocuments({ category: req.params.id });
  if (count > 0) { res.status(400); throw new Error(`Danh mục đang có ${count} sản phẩm, không thể xoá`); }
  await Category.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Đã xoá danh mục' });
});

// ── COUPONS ─────────────────────────────────────────────────

exports.getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort('-createdAt');
  res.json({ success: true, coupons });
});

exports.createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, coupon });
});

exports.updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!coupon) { res.status(404); throw new Error('Không tìm thấy mã giảm giá'); }
  res.json({ success: true, coupon });
});

exports.deleteCoupon = asyncHandler(async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Đã xoá mã giảm giá' });
});

// @POST /api/coupons/validate  (user kiểm tra trước khi đặt)
exports.validateCoupon = asyncHandler(async (req, res) => {
  const { code, orderTotal } = req.body;
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) { res.status(404); throw new Error('Mã giảm giá không tồn tại'); }
  const check = coupon.isValid(req.user?._id, Number(orderTotal));
  if (!check.valid) { res.status(400); throw new Error(check.msg); }
  const discount = coupon.calcDiscount(Number(orderTotal));
  res.json({ success: true, discount, coupon: { code: coupon.code, type: coupon.type, value: coupon.value } });
});

// ── USERS (Admin) ────────────────────────────────────────────

exports.adminGetUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, keyword, role } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (keyword) filter.$or = [
    { name:  { $regex: keyword, $options: 'i' } },
    { email: { $regex: keyword, $options: 'i' } },
    { phone: { $regex: keyword, $options: 'i' } },
  ];
  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .sort('-createdAt')
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .select('-password');
  res.json({ success: true, total, pages: Math.ceil(total / Number(limit)), users });
});

exports.adminGetUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) { res.status(404); throw new Error('Không tìm thấy người dùng'); }
  const Order = require('../models/Order');
  const orders = await Order.find({ user: user._id }).sort('-createdAt').limit(10).select('orderCode status total createdAt');
  res.json({ success: true, user, orders });
});

exports.adminUpdateUser = asyncHandler(async (req, res) => {
  const allowed = ['name','phone','role','isActive','menh','gender'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
  if (!user) { res.status(404); throw new Error('Không tìm thấy người dùng'); }
  res.json({ success: true, user });
});

exports.adminDeleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('Không tìm thấy người dùng'); }
  if (user.role === 'admin') { res.status(400); throw new Error('Không thể xoá tài khoản admin'); }
  await user.deleteOne();
  res.json({ success: true, message: 'Đã xoá người dùng' });
});