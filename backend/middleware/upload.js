const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Store files on disk with a UUID filename to avoid collisions and hide the original name
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname).toLowerCase());
  },
});

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];

// Check both mimetype and extension because browsers sometimes send incorrect mimetypes for HEIC files
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIMETYPES.includes(file.mimetype) || ALLOWED_EXTS.includes(ext)) {
    cb(null, true);
  } else {
    const err = new Error('Invalid file type. Allowed: JPEG, PNG, GIF, WebP, HEIC/HEIF');
    err.status = 400;
    cb(err, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

module.exports = { upload, UPLOADS_DIR };
