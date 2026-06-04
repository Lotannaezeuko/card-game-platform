const express = require('express');
const router = express.Router();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function uploadToS3(buffer, filename, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: filename,
    Body: buffer,
    ContentType: contentType,
  }));
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
}

// POST /api/upload/image
router.post('/image', authenticateToken, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(err.status || 400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();
    const isHeic =
      file.mimetype === 'image/heic' ||
      file.mimetype === 'image/heif' ||
      ext === '.heic' ||
      ext === '.heif';

    try {
      let buffer = file.buffer;
      let contentType = file.mimetype;
      let filename;

      if (isHeic) {
        buffer = await sharp(file.buffer).jpeg({ quality: 90 }).toBuffer();
        contentType = 'image/jpeg';
        filename = uuidv4() + '.jpg';
      } else {
        filename = uuidv4() + ext;
      }

      const url = await uploadToS3(buffer, filename, contentType);
      return res.json({ url });
    } catch (uploadErr) {
      console.error('Upload error:', uploadErr);
      return res.status(500).json({ error: 'Failed to upload image' });
    }
  });
});

module.exports = router;
