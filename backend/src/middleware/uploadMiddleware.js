const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { uploadDir } = require('../config/uploads');

// Extension comes from this whitelist, never from the uploaded filename.
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

// The browser tells us a file's type, but a client can lie. Real image files start with fixed bytes.
const SIGNATURES = {
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};

// Random server-chosen filename, whitelisted type, 2 MB cap, one file per request.
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + EXT[file.mimetype]),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new ApiError(400, 'Only JPG, PNG or WebP images are allowed')),
});

// Run AFTER the multer handler: confirms the saved file really is the image type it claims to be.
async function verifyImageContent(req, res, next) {
  if (!req.file) return next();
  const handle = await fs.promises.open(req.file.path, 'r');
  const head = Buffer.alloc(12);
  try {
    await handle.read(head, 0, 12, 0);
  } finally {
    await handle.close();
  }
  if (!SIGNATURES[req.file.mimetype](head)) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    throw new ApiError(400, 'That file is not a valid image');
  }
  next();
}

module.exports = { imageUpload, verifyImageContent };
