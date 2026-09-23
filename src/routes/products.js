const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');
const upload  = require('../middleware/upload');

// Public
router.get('/',      ctrl.getProducts);
router.get('/:slug', ctrl.getProduct);
router.post('/:id/reviews', protect, ctrl.addReview);

// Admin
router.get('/admin/list',   protect, adminOnly('admin'), ctrl.adminGetProducts);
router.post('/admin',        protect, adminOnly('admin'), upload.array('files', 20), ctrl.createProduct);
router.put('/admin/:id',     protect, adminOnly('admin'), upload.array('files', 20), ctrl.updateProduct);
router.delete('/admin/:id',  protect, adminOnly('admin'), ctrl.deleteProduct);

// Media management
router.delete('/admin/:id/media/:publicId',  protect, adminOnly('admin'), ctrl.deleteProductMedia);
router.put('/admin/:id/media/reorder',       protect, adminOnly('admin'), ctrl.reorderMedia);

// Reviews
router.put('/admin/:id/reviews/:reviewId/approve', protect, adminOnly('admin'), ctrl.approveReview);

module.exports = router;
