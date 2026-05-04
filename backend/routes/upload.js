const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { authenticateToken } = require('../middleware/auth');
const { upload, UPLOADS_DIR } = require('../middleware/upload');

// POST /api/upload/image
// Accepts a multipart image upload and returns its public URL.
// HEIC/HEIF files (common on iPhones) are converted to JPEG using sharp
// because browsers cannot display HEIC natively.
router.post('/image', authenticateToken, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();
    const isHeic =
      file.mimetype === 'image/heic' ||
      file.mimetype === 'image/heif' ||
      ext === '.heic' ||
      ext === '.heif';

    if (isHeic) {
      try {
        const newFilename = uuidv4() + '.jpg';
        const newPath = path.join(UPLOADS_DIR, newFilename);
        await sharp(file.path).jpeg({ quality: 90 }).toFile(newPath);
        // Remove the original HEIC file after conversion
        fs.unlinkSync(file.path);
        return res.json({ url: `/uploads/${newFilename}` });
      } catch (convertErr) {
        console.error('HEIC conversion error:', convertErr);
        try { fs.unlinkSync(file.path); } catch (_) {}
        return res.status(500).json({ error: 'Failed to convert HEIC image' });
      }
    }

    return res.json({ url: `/uploads/${file.filename}` });
  });
});

module.exports = router;
