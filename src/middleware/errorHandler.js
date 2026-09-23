// Xử lý lỗi tập trung
const errorHandler = (err, req, res, next) => {
  let status  = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Lỗi máy chủ';

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field} đã tồn tại`;
    status  = 400;
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(e => e.message).join(', ');
    status  = 400;
  }

  // JWT invalid
  if (err.name === 'JsonWebTokenError') {
    message = 'Token không hợp lệ';
    status  = 401;
  }
  if (err.name === 'TokenExpiredError') {
    message = 'Token đã hết hạn, vui lòng đăng nhập lại';
    status  = 401;
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    message = `Không tìm thấy tài nguyên với id: ${err.value}`;
    status  = 404;
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
