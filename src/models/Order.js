const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:      { type: String, required: true },
  image:     { type: String },
  price:     { type: Number, required: true },
  quantity:  { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema({
  orderCode:   { type: String, unique: true },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null = guest
  guestInfo:   {
    name:   String,
    email:  String,
    phone:  String,
  },

  items:       [orderItemSchema],

  shippingAddress: {
    fullName:  { type: String, required: true },
    phone:     { type: String, required: true },
    province:  { type: String, required: true },
    district:  { type: String, required: true },
    ward:      { type: String, required: true },
    street:    { type: String, required: true },
  },

  paymentMethod: {
    type: String,
    enum: ['COD','BANK_TRANSFER','MOMO','VNPAY'],
    default: 'COD',
  },
  paymentStatus: {
    type: String,
    enum: ['pending','paid','failed','refunded'],
    default: 'pending',
  },
  paidAt: Date,

  status: {
    type: String,
    enum: ['pending','confirmed','processing','shipping','delivered','cancelled','returned'],
    default: 'pending',
  },

  statusHistory: [{
    status:    String,
    note:      String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now },
  }],

  subtotal:       { type: Number, required: true },
  shippingFee:    { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  total:          { type: Number, required: true },

  couponCode:     { type: String, default: '' },
  note:           { type: String, default: '' },

  cancelReason:   String,
  cancelledAt:    Date,
  deliveredAt:    Date,
}, { timestamps: true });

// Tạo mã đơn hàng tự động
orderSchema.pre('save', async function (next) {
  if (!this.orderCode) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderCode = `4EM${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Index
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ orderCode: 1 });

module.exports = mongoose.model('Order', orderSchema);
