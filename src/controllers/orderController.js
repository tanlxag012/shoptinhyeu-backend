const asyncHandler = require('express-async-handler');
const Order   = require('../models/Order');
const Product = require('../models/Product');
const Coupon  = require('../models/Coupon');

// ─── USER ──────────────────────────────────────────────────

// @POST /api/orders
exports.createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, paymentMethod, couponCode, note, guestInfo } = req.body;

  if (!items?.length) { res.status(400); throw new Error('Không có sản phẩm trong đơn hàng'); }

  // Kiểm tra tồn kho & tính giá
  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) { res.status(404); throw new Error(`Sản phẩm ${item.product} không tồn tại`); }
    if (!product.isActive) { res.status(400); throw new Error(`Sản phẩm "${product.name}" đã ngừng kinh doanh`); }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Sản phẩm "${product.name}" chỉ còn ${product.stock} cái trong kho`);
    }
    const price = product.salePrice || product.price;
    subtotal += price * item.quantity;
    orderItems.push({ product: product._id, name: product.name, image: product.images?.[0]?.url, price, quantity: item.quantity });
  }

  // Phí ship (miễn phí > 1.5tr)
  const shippingFee = subtotal >= 1500000 ? 0 : 30000;

  // Coupon
  let discountAmount = 0;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon) { res.status(400); throw new Error('Mã giảm giá không tồn tại'); }
    const check = coupon.isValid(req.user?._id, subtotal);
    if (!check.valid) { res.status(400); throw new Error(check.msg); }
    discountAmount = coupon.calcDiscount(subtotal);
    coupon.usedCount += 1;
    if (req.user) coupon.usedBy.push(req.user._id);
    await coupon.save();
  }

  const total = subtotal + shippingFee - discountAmount;

  const order = await Order.create({
    user: req.user?._id || null,
    guestInfo: req.user ? undefined : guestInfo,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    subtotal,
    shippingFee,
    discountAmount,
    total,
    couponCode,
    note,
    statusHistory: [{ status: 'pending', note: 'Đơn hàng được tạo' }],
  });

  // Trừ tồn kho
  await Promise.all(items.map(item =>
    Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity, sold: item.quantity },
    })
  ));

  res.status(201).json({ success: true, order });
});

// @GET /api/orders/my-orders
exports.getMyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const filter = { user: req.user._id };
  if (status) filter.status = status;

  const total  = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .sort('-createdAt')
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .select('-statusHistory');

  res.json({ success: true, total, pages: Math.ceil(total / Number(limit)), orders });
});

// @GET /api/orders/:id
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('items.product', 'name slug');
  if (!order) { res.status(404); throw new Error('Không tìm thấy đơn hàng'); }
  // Chỉ cho xem đơn của mình hoặc admin
  if (req.user.role !== 'admin' && order.user?.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Bạn không có quyền xem đơn hàng này');
  }
  res.json({ success: true, order });
});

// @PUT /api/orders/:id/cancel
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Không tìm thấy đơn hàng'); }
  if (order.user?.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Không có quyền'); }
  if (!['pending','confirmed'].includes(order.status)) {
    res.status(400); throw new Error('Không thể huỷ đơn hàng ở trạng thái này');
  }

  order.status = 'cancelled';
  order.cancelReason  = req.body.reason || 'Khách hàng huỷ';
  order.cancelledAt   = new Date();
  order.statusHistory.push({ status: 'cancelled', note: req.body.reason, updatedBy: req.user._id });

  // Hoàn tồn kho
  await Promise.all(order.items.map(item =>
    Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity, sold: -item.quantity },
    })
  ));

  await order.save();
  res.json({ success: true, order });
});

// ─── ADMIN ─────────────────────────────────────────────────

// @GET /api/admin/orders
exports.adminGetOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, paymentStatus, keyword } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (keyword) filter.$or = [
    { orderCode: { $regex: keyword, $options: 'i' } },
    { 'shippingAddress.fullName': { $regex: keyword, $options: 'i' } },
    { 'shippingAddress.phone': { $regex: keyword, $options: 'i' } },
  ];

  const total  = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .populate('user', 'name email')
    .sort('-createdAt')
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.json({ success: true, total, pages: Math.ceil(total / Number(limit)), orders });
});

// @PUT /api/admin/orders/:id/status
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const allowed = ['pending','confirmed','processing','shipping','delivered','cancelled','returned'];
  if (!allowed.includes(status)) { res.status(400); throw new Error('Trạng thái không hợp lệ'); }

  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Không tìm thấy đơn hàng'); }

  order.status = status;
  order.statusHistory.push({ status, note: note || '', updatedBy: req.user._id });
  if (status === 'delivered') {
    order.deliveredAt   = new Date();
    order.paymentStatus = 'paid';
    order.paidAt        = new Date();
  }
  if (status === 'cancelled') {
    order.cancelledAt = new Date();
    // Hoàn tồn kho
    await Promise.all(order.items.map(item =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity, sold: -item.quantity },
      })
    ));
  }

  await order.save();
  res.json({ success: true, order });
});

// @PUT /api/admin/orders/:id/payment
exports.updatePaymentStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Không tìm thấy đơn hàng'); }
  order.paymentStatus = req.body.paymentStatus;
  if (req.body.paymentStatus === 'paid') order.paidAt = new Date();
  await order.save();
  res.json({ success: true, order });
});

// @GET /api/admin/stats  – thống kê dashboard
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const ProductModel = require('../models/Product');
  const UserModel    = require('../models/User');

  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOrders, pendingOrders, monthOrders,
    totalRevenue, monthRevenue,
    totalProducts, lowStockProducts,
    totalUsers,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: 'pending' }),
    Order.countDocuments({ createdAt: { $gte: start } }),
    Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: start } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    ProductModel.countDocuments({ isActive: true }),
    ProductModel.countDocuments({ stock: { $lt: 10 }, isActive: true }),
    UserModel.countDocuments({ role: 'user' }),
  ]);

  // Doanh thu 6 tháng gần đây
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const revenueByMonth = await Order.aggregate([
    { $match: { status: 'delivered', createdAt: { $gte: sixMonthsAgo } } },
    { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        revenue: { $sum: '$total' },
        orders:  { $sum: 1 },
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Top sản phẩm bán chạy – dùng media thay images
  const topProducts = await ProductModel.find({ isActive: true })
    .sort('-sold')
    .limit(5)
    .select('name sold media price');

  // Đơn hàng mới nhất
  const recentOrders = await Order.find()
    .sort('-createdAt')
    .limit(10)
    .populate('user', 'name email')
    .select('orderCode status total createdAt shippingAddress');

  res.json({
    success: true,
    stats: {
      totalOrders,
      pendingOrders,
      monthOrders,
      totalRevenue:    totalRevenue[0]?.total    || 0,
      monthRevenue:    monthRevenue[0]?.total    || 0,
      totalProducts,
      lowStockProducts,
      totalUsers,
    },
    revenueByMonth,
    topProducts,
    recentOrders,
  });
});
