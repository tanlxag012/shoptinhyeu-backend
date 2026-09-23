const multer = require('multer');
const path   = require('path');

const storage = multer.memoryStorage();

// Chấp nhận cả ảnh và video
const fileFilter = (req, file, cb) => {
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const videoExts = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
  const ext = path.extname(file.originalname).toLowerCase();

  if ([...imageExts, ...videoExts].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (jpg/png/webp) hoặc video (mp4/mov/webm)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,  // 100MB (cho video)
    files: 20,
  },
});

module.exports = upload;
