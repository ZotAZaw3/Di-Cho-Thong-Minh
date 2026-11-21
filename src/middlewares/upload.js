import multer from 'multer';
import { ApiError } from '../utils/response.js';

// Nhận một ảnh ở trường "image" (multipart/form-data), giữ trong bộ nhớ rồi đẩy lên storage.
// Request JSON đi qua bình thường (multer bỏ qua).
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new ApiError('BAD_REQUEST', { message: 'Chỉ nhận ảnh JPEG, PNG, WebP hoặc GIF' }));
  },
}).single('image');
