const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Helper: gửi token về client
const sendToken = (user, statusCode, res) => {
  const token = user.getSignedToken();
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id:    user._id,
      name:   user.name,
      email:  user.email,
      role:   user.role,
      avatar: user.avatar,
      menh:   user.menh,
      gender: user.gender,
    },
  });
};

// @POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const user = await User.create({ name, email, password, phone });
  sendToken(user, 201, res);
});

// @POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400); throw new Error('Vui lòng nhập email và mật khẩu');
  }
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401); throw new Error('Email hoặc mật khẩu không đúng');
  }
  sendToken(user, 200, res);
});

// @GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist', 'name slug images price salePrice');
  res.json({ success: true, user });
});

// @PUT /api/auth/update-profile
exports.updateProfile = asyncHandler(async (req, res) => {
  const fields = ['name', 'phone', 'menh', 'gender', 'dob', 'avatar'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, user });
});

// @PUT /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) {
    res.status(400); throw new Error('Mật khẩu hiện tại không đúng');
  }
  user.password = newPassword;
  await user.save();
  sendToken(user, 200, res);
});

// @POST /api/auth/addresses  – thêm địa chỉ
exports.addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (req.body.isDefault) {
    user.addresses.forEach(a => (a.isDefault = false));
  }
  user.addresses.push(req.body);
  await user.save();
  res.status(201).json({ success: true, addresses: user.addresses });
});

// @PUT /api/auth/addresses/:id
exports.updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const addr = user.addresses.id(req.params.id);
  if (!addr) { res.status(404); throw new Error('Không tìm thấy địa chỉ'); }
  if (req.body.isDefault) user.addresses.forEach(a => (a.isDefault = false));
  Object.assign(addr, req.body);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

// @DELETE /api/auth/addresses/:id
exports.deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.id);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

// @POST /api/auth/wishlist/:productId
exports.toggleWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const pid  = req.params.productId;
  const idx  = user.wishlist.findIndex(id => id.toString() === pid);
  if (idx === -1) {
    user.wishlist.push(pid);
  } else {
    user.wishlist.splice(idx, 1);
  }
  await user.save();
  res.json({ success: true, wishlist: user.wishlist, added: idx === -1 });
});
