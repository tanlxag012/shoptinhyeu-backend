const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code:          { type: String, required: true, unique: true, uppercase: true, trim: true },
  type:          { type: String, enum: ['percent','fixed'], default: 'percent' },
  value:         { type: Number, required: true },       // % hoặc VNĐ
  minOrderValue: { type: Number, default: 0 },
  maxDiscount:   { type: Number, default: null },         // cap cho loại %
  usageLimit:    { type: Number, default: null },         // null = không giới hạn
  usedCount:     { type: Number, default: 0 },
  userLimit:     { type: Number, default: 1 },            // mỗi user dùng tối đa
  usedBy:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startDate:     { type: Date, default: Date.now },
  endDate:       { type: Date, required: true },
  isActive:      { type: Boolean, default: true },
  description:   { type: String, default: '' },
}, { timestamps: true });

couponSchema.methods.isValid = function (userId, orderTotal) {
  const now = new Date();
  if (!this.isActive) return { valid: false, msg: 'Mã giảm giá không hoạt động' };
  if (now < this.startDate || now > this.endDate) return { valid: false, msg: 'Mã giảm giá đã hết hạn' };
  if (this.usageLimit && this.usedCount >= this.usageLimit) return { valid: false, msg: 'Mã đã được sử dụng hết' };
  if (orderTotal < this.minOrderValue) return { valid: false, msg: `Đơn hàng tối thiểu ${this.minOrderValue.toLocaleString()}₫` };
  if (userId) {
    const used = this.usedBy.filter(id => id.toString() === userId.toString()).length;
    if (used >= this.userLimit) return { valid: false, msg: 'Bạn đã dùng hết lượt cho mã này' };
  }
  return { valid: true };
};

couponSchema.methods.calcDiscount = function (orderTotal) {
  let discount = this.type === 'percent'
    ? (orderTotal * this.value) / 100
    : this.value;
  if (this.maxDiscount) discount = Math.min(discount, this.maxDiscount);
  return Math.min(discount, orderTotal);
};

module.exports = mongoose.model('Coupon', couponSchema);
