# 4EM Backend API

Node.js + Express + MongoDB backend cho website bán vòng đá phong thủy.

---

## 🚀 Cài đặt & Chạy

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env từ mẫu
cp .env.example .env
# → Sửa MONGO_URI, JWT_SECRET, Cloudinary keys

# 3. Seed dữ liệu mẫu
npm run seed

# 4. Chạy dev server
npm run dev

# 5. Production
npm start
```

---

## 📁 Cấu trúc dự án

```
4em-backend/
├── config/
│   └── db.js               # Kết nối MongoDB
├── src/
│   ├── server.js           # Entry point
│   ├── models/
│   │   ├── User.js         # Schema người dùng + JWT
│   │   ├── Product.js      # Schema sản phẩm + reviews
│   │   ├── Category.js     # Schema danh mục
│   │   ├── Order.js        # Schema đơn hàng + lịch sử
│   │   └── Coupon.js       # Schema mã giảm giá
│   ├── controllers/
│   │   ├── authController.js     # Auth, profile, địa chỉ, wishlist
│   │   ├── productController.js  # CRUD sản phẩm, review, upload ảnh
│   │   ├── orderController.js    # Đặt hàng, theo dõi, thống kê
│   │   └── miscController.js     # Categories, Coupons, Users admin
│   ├── middleware/
│   │   ├── auth.js         # JWT protect, adminOnly
│   │   ├── errorHandler.js # Xử lý lỗi tập trung
│   │   └── upload.js       # Multer config
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   └── index.js        # Orders, Categories, Coupons, Users
│   └── utils/
│       └── seed.js         # Dữ liệu mẫu
├── .env.example
└── package.json
```

---

## 🔌 API Endpoints

### Auth  `/api/auth`
| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| POST | `/register` | Đăng ký | - |
| POST | `/login` | Đăng nhập → JWT | - |
| GET | `/me` | Thông tin tài khoản | ✅ |
| PUT | `/update-profile` | Cập nhật profile | ✅ |
| PUT | `/change-password` | Đổi mật khẩu | ✅ |
| POST | `/addresses` | Thêm địa chỉ | ✅ |
| PUT | `/addresses/:id` | Sửa địa chỉ | ✅ |
| DELETE | `/addresses/:id` | Xoá địa chỉ | ✅ |
| POST | `/wishlist/:productId` | Toggle yêu thích | ✅ |

### Products  `/api/products`
| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| GET | `/` | Danh sách + lọc + search | - |
| GET | `/:slug` | Chi tiết sản phẩm + related | - |
| POST | `/:id/reviews` | Thêm đánh giá | ✅ |
| GET | `/admin/list` | Admin: danh sách | 🔐 Admin |
| POST | `/admin` | Tạo sản phẩm (multipart) | 🔐 Admin |
| PUT | `/admin/:id` | Sửa sản phẩm | 🔐 Admin |
| DELETE | `/admin/:id` | Xoá sản phẩm | 🔐 Admin |
| DELETE | `/admin/:id/images/:publicId` | Xoá ảnh | 🔐 Admin |
| PUT | `/admin/:id/reviews/:reviewId/approve` | Duyệt review | 🔐 Admin |

### Orders  `/api/orders`
| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| POST | `/orders` | Tạo đơn hàng | Optional |
| GET | `/orders/my-orders` | Đơn của tôi | ✅ |
| GET | `/orders/:id` | Chi tiết đơn | ✅ |
| PUT | `/orders/:id/cancel` | Huỷ đơn | ✅ |

### Admin  `/api/admin`
| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| GET | `/admin/stats` | Dashboard stats | 🔐 Admin |
| GET | `/admin/orders` | Tất cả đơn hàng | 🔐 Admin |
| PUT | `/admin/orders/:id/status` | Cập nhật trạng thái | 🔐 Admin |
| PUT | `/admin/orders/:id/payment` | Cập nhật thanh toán | 🔐 Admin |
| GET/POST/PUT/DELETE | `/admin/categories` | Quản lý danh mục | 🔐 Admin |
| GET/POST/PUT/DELETE | `/admin/coupons` | Quản lý mã giảm giá | 🔐 Admin |
| GET/PUT/DELETE | `/admin/users` | Quản lý người dùng | 🔐 Admin |

### Coupons
| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| POST | `/coupons/validate` | Kiểm tra mã giảm giá | Optional |

---

## 📦 Query Parameters – GET /api/products

```
?keyword=thạch anh    # Tìm kiếm full-text
?category=<id>        # Lọc theo danh mục
?menh=Kim,Mộc         # Lọc theo mệnh (comma-separated)
?gender=Nữ            # Nam | Nữ | Unisex
?minPrice=500000      # Giá từ
?maxPrice=3000000     # Giá đến
?isNew=true           # Hàng mới
?isFeatured=true      # Nổi bật
?sort=-price          # Sắp xếp: price, -price, -createdAt, -sold
?page=1&limit=12      # Phân trang
```

---

## 📊 Trạng thái đơn hàng

```
pending → confirmed → processing → shipping → delivered
                                             ↘ cancelled
                                             ↘ returned
```

---

## 🔐 Authentication

Gửi token trong header:
```
Authorization: Bearer <token>
```

---

## 🌱 Dữ liệu sau khi seed

- **Admin:** admin@4em.vn / Admin@123456
- **Categories:** 6 danh mục
- **Products:** 8 sản phẩm mẫu
- **Coupons:** WELCOME10, FREESHIP, SALE20
