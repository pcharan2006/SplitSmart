const fs = require('fs');
const path = require('path');
const userModel = require('../models/userModel');
const { uploadDir } = require('../config/uploads');

exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};

exports.updateMe = async (req, res) => {
  const previousImage = req.user.profile_image;
  const profileImage = req.file ? `/uploads/${req.file.filename}` : undefined;
  const user = await userModel.updateProfile(req.user.id, {
    name: req.body.name,
    profileImage,
  });

  // The old avatar is no longer referenced: remove it so replaced photos don't pile up on disk.
  // basename() makes sure we only ever delete inside the uploads folder.
  if (profileImage && previousImage?.startsWith('/uploads/')) {
    fs.promises.unlink(path.join(uploadDir, path.basename(previousImage))).catch(() => {});
  }
  res.json({ user });
};
