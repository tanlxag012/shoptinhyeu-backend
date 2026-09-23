require('dotenv').config({ path: require('path').join(__dirname, '../../.env.example') });
const mongoose = require('mongoose');
const User     = require('../models/User');
const Category = require('../models/Category');
const Product  = require('../models/Product');
const Coupon   = require('../models/Coupon');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/4em_shop');
    console.log('🔌 Connected to MongoDB');

    // Xoá dữ liệu cũ
    await Promise.all([User.deleteMany(), Category.deleteMany(), Product.deleteMany(), Coupon.deleteMany()]);
    console.log('🗑  Cleared old data');

    // Admin
    const admin = await User.create({
      name: process.env.ADMIN_NAME || 'Admin 4EM',
      email: process.env.ADMIN_EMAIL || 'admin@4em.vn',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      role: 'admin',
    });
    console.log(`👤 Admin: ${admin.email}`);

    // Categories
    const cats = await Category.insertMany([
      { name: 'Moonstone',    description: 'Đá mặt trăng',        sortOrder: 1 },
      { name: 'Aquamarine',   description: 'Ngọc xanh biển',      sortOrder: 2 },
      { name: 'Jade & Ngọc',  description: 'Ngọc bích & ngọc trai', sortOrder: 3 },
      { name: 'Garnet',       description: 'Đá lựu đỏ',           sortOrder: 4 },
      { name: 'Citrine',      description: 'Thạch anh vàng',      sortOrder: 5 },
      { name: 'Thạch Anh',    description: 'Các loại thạch anh',  sortOrder: 6 },
    ]);
    console.log(`📦 ${cats.length} categories created`);

    const catMap = {};
    cats.forEach(c => { catMap[c.name] = c._id; });

    // Products
    await Product.insertMany([
      { name: 'Vòng Thạch Anh Vàng 3A (Citrine)', price: 1380000, category: catMap['Citrine'], menh: ['Kim','Thổ'], gender: 'Unisex', stoneType: 'Citrine', stock: 15, isNew: true, isFeatured: true, description: 'Vòng thạch anh vàng 3A chất lượng cao, hạt đều, màu đẹp. Phù hợp mệnh Kim và Thổ.' },
      { name: 'Vòng Apatite Biển Xanh', price: 2190000, category: catMap['Aquamarine'], menh: ['Thuỷ'], gender: 'Nữ', stoneType: 'Apatite', stock: 8, isNew: true, description: 'Vòng đá Apatite màu xanh biển tự nhiên, mang năng lượng Thuỷ hành.' },
      { name: 'Vòng Tay Diopside', price: 4200000, category: catMap['Jade & Ngọc'], menh: ['Mộc'], gender: 'Unisex', stoneType: 'Diopside', stock: 5, isFeatured: true, description: 'Diopside xanh lá cây quý hiếm, tượng trưng cho sự phát triển và sinh sôi.' },
      { name: 'Vòng Garnet Lựu Đỏ', price: 1380000, salePrice: 1800000, category: catMap['Garnet'], menh: ['Hoả'], gender: 'Nữ', stoneType: 'Garnet', stock: 20, description: 'Garnet đỏ rực rỡ, tượng trưng cho tình yêu và đam mê. Phù hợp mệnh Hoả.' },
      { name: 'Vòng Thạch Anh Trắng Trong', price: 1740000, category: catMap['Thạch Anh'], menh: ['Kim','Thuỷ'], gender: 'Unisex', stoneType: 'Thạch Anh Trắng', stock: 30, description: 'Thạch anh trắng trong suốt, thanh lọc năng lượng tiêu cực.' },
      { name: 'Vòng Thạch Anh Hồng', price: 2650000, category: catMap['Thạch Anh'], menh: ['Hoả'], gender: 'Nữ', stoneType: 'Thạch Anh Hồng', stock: 12, isNew: true, isFeatured: true, description: 'Thạch anh hồng Rose Quartz — đá của tình yêu và lòng từ bi.' },
      { name: 'Vòng Moonstone Phối Citrine', price: 2490000, category: catMap['Moonstone'], menh: ['Kim','Thuỷ'], gender: 'Unisex', stoneType: 'Moonstone', stock: 7, description: 'Kết hợp Moonstone và Citrine tạo nên vòng tay độc đáo, cân bằng âm dương.' },
      { name: 'Vòng Lưu Linh Ngũ Sắc', price: 2200000, category: catMap['Thạch Anh'], menh: ['Thuỷ','Mộc'], gender: 'Unisex', stoneType: 'Lưu Linh', stock: 10, isNew: true, description: 'Lưu linh ngũ sắc — năm màu tương ứng ngũ hành, mang lại may mắn toàn diện.' },
    ]);
    console.log('💎 Products seeded');

    // Coupons
    await Coupon.insertMany([
      { code: 'WELCOME10', type: 'percent', value: 10, minOrderValue: 500000, endDate: new Date(Date.now() + 90 * 86400000), description: 'Giảm 10% cho đơn hàng đầu tiên' },
      { code: 'FREESHIP', type: 'fixed', value: 30000, minOrderValue: 0, endDate: new Date(Date.now() + 30 * 86400000), description: 'Miễn phí vận chuyển' },
      { code: 'SALE20', type: 'percent', value: 20, minOrderValue: 2000000, maxDiscount: 500000, endDate: new Date(Date.now() + 7 * 86400000), description: 'Giảm 20% tối đa 500k cho đơn từ 2tr' },
    ]);
    console.log('🎟  Coupons seeded');

    console.log('\n✅ Seed completed!');
    console.log(`   Admin: ${admin.email} / ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
};

seed();
