import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import config from "../config/env.js";

cloudinary.config({
  cloud_name: config.CLOUDINARY_NAME,
  api_key: config.CLOUDINARY_KEY,
  api_secret: config.CLOUDINARY_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "hunter_avatars",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [
      { width: 500, height: 500, crop: "fill", gravity: "face" },
    ],
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }, // 2 MB, single file
  fileFilter: (_req, file, cb) =>
    /^image\/(jpeg|png|webp)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(Object.assign(new Error("Only JPG, PNG or WebP images are allowed."), { statusCode: 400 })),
});
export default cloudinary;
