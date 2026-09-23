const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const addressSchema = new mongoose.Schema({
  fullName:   { type: String, required: true },
  phone:      { type: String, required: true },
  province:   { type: String, required: true },
  district:   { type: String, required: true },
  ward:       { type: String, required: true },
  street:     { type: String, required: true },
  isDefault:  { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  name:       { type: String, required: [true, 'Vui lòng nhập tên'], trim: true },
  email:      { type: String, required: [true, 'Vui lòng nhập email'], unique: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'] },
  password:   { type: String, required: [true, 'Vui lòng nhập mật khẩu'], minlength: 6, select: false },
  phone:      { type: String, default: '' },
  avatar:     { type: String, default: '' },
  role:       { type: String, enum: ['user', 'admin'], default: 'user' },
  menh:       { type: String, enum: ['Kim', 'Mộc', 'Thuỷ', 'Hoả', 'Thổ', ''], default: '' },
  gender:     { type: String, enum: ['Nam', 'Nữ', 'Khác', ''], default: '' },
  dob:        { type: Date },
  addresses:  [addressSchema],
  wishlist:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  isActive:   { type: Boolean, default: true },
  resetPasswordToken:   String,
  resetPasswordExpire:  Date,
}, { timestamps: true });

// Hash password trước khi save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// So sánh password
userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

// Tạo JWT token
userSchema.methods.getSignedToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

module.exports = mongoose.model('User', userSchema);
