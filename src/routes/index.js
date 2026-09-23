const express = require('express');
const router  = express.Router();
const orderCtrl = require('../controllers/orderController');
const miscCtrl  = require('../controllers/miscController');
const { protect, adminOnly } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');

// ── ORDERS ──────────────────────────────────────────────────
router.post('/orders',             optionalAuth, orderCtrl.createOrder);
router.get('/orders/my-orders',    protect, orderCtrl.getMyOrders);
router.get('/orders/:id',          protect, orderCtrl.getOrder);
router.put('/orders/:id/cancel',   protect, orderCtrl.cancelOrder);

// Admin orders
router.get('/admin/orders',         protect, adminOnly('admin'), orderCtrl.adminGetOrders);
router.put('/admin/orders/:id/status',  protect, adminOnly('admin'), orderCtrl.updateOrderStatus);
router.put('/admin/orders/:id/payment', protect, adminOnly('admin'), orderCtrl.updatePaymentStatus);
router.get('/admin/stats',          protect, adminOnly('admin'), orderCtrl.getDashboardStats);

// ── CATEGORIES ──────────────────────────────────────────────
const upload = require('../middleware/upload');
router.get('/categories',                                                              miscCtrl.getCategories);
router.get('/admin/categories',     protect, adminOnly('admin'),                       miscCtrl.adminGetCategories);
router.post('/admin/categories',    protect, adminOnly('admin'), upload.single('image'), miscCtrl.createCategory);
router.put('/admin/categories/:id', protect, adminOnly('admin'), upload.single('image'), miscCtrl.updateCategory);
router.delete('/admin/categories/:id', protect, adminOnly('admin'),                    miscCtrl.deleteCategory);

// ── COUPONS ─────────────────────────────────────────────────
router.post('/coupons/validate',   optionalAuth, miscCtrl.validateCoupon);
router.get('/admin/coupons',       protect, adminOnly('admin'), miscCtrl.getCoupons);
router.post('/admin/coupons',      protect, adminOnly('admin'), miscCtrl.createCoupon);
router.put('/admin/coupons/:id',   protect, adminOnly('admin'), miscCtrl.updateCoupon);
router.delete('/admin/coupons/:id', protect, adminOnly('admin'), miscCtrl.deleteCoupon);

// ── USERS ───────────────────────────────────────────────────
router.get('/admin/users',        protect, adminOnly('admin'), miscCtrl.adminGetUsers);
router.get('/admin/users/:id',    protect, adminOnly('admin'), miscCtrl.adminGetUser);
router.put('/admin/users/:id',    protect, adminOnly('admin'), miscCtrl.adminUpdateUser);
router.delete('/admin/users/:id', protect, adminOnly('admin'), miscCtrl.adminDeleteUser);

module.exports = router;