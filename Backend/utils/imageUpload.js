// Backend/utils/imageUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ---------- helpers ----------
const createSlug = (title) => {
  return (title || 'untitled-product')
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')  // remove specials
    .replace(/\s+/g, '-')         // spaces -> hyphens
    .replace(/-+/g, '-')          // collapse ---
    .replace(/^-+|-+$/g, '');     // trim leading/trailing -
};

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
};

const getRelativePath = (absolutePath) => {
  const base = path.join(process.cwd(), 'files');
  return absolutePath.replace(base, '/files').replace(/\\/g, '/');
};

// ---------- multer config ----------
const imageFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WebP, SVG) are allowed'));
};

const createProductImageStorage = () => {
  return multer.diskStorage({
    destination(req, file, cb) {
      try {
        const productTitle = req.body.name || req.body.title || 'untitled-product';
        const slug = createSlug(productTitle);

        const baseDir = path.join('files', 'products', 'images', slug);
        let sub = 'general';
        if (file.fieldname === 'heroImage' || file.fieldname === 'hero_image') sub = 'hero';
        else if (file.fieldname === 'detailImages' || file.fieldname === 'detail_images' || file.fieldname === 'images') sub = 'details';

        const finalDir = path.join(baseDir, sub);
        ensureDirectoryExists(finalDir);
        cb(null, finalDir);
      } catch (e) {
        console.error('Error creating directory:', e);
        cb(e);
      }
    },
    filename(req, file, cb) {
      try {
        const productTitle = req.body.name || req.body.title || 'untitled-product';
        const slug = createSlug(productTitle);
        const ts = Date.now();
        const rnd = Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${slug}-${file.fieldname}-${ts}-${rnd}${ext}`);
      } catch (e) {
        console.error('Error creating filename:', e);
        cb(e);
      }
    }
  });
};

const productImageUpload = multer({
  storage: createProductImageStorage(),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 20
  }
});

const uploadProductImages = productImageUpload.fields([
  { name: 'heroImage', maxCount: 1 },
  { name: 'detailImages', maxCount: 10 },
  { name: 'images', maxCount: 20 } // you said no gallery, so keep only these
]); // <-- no extra +

// ---------- organizer utilities (hero + details only) ----------
const organizeUploadedFiles = (files) => {
  const organized = {
    heroImage: null,
    detailImages: []
  };

  if (files.heroImage && files.heroImage[0]) {
    organized.heroImage = getRelativePath(files.heroImage[0].path);
  }
  if (files.detailImages) {
    organized.detailImages = files.detailImages.map(f => getRelativePath(f.path));
  }
  if (files.images) {
    // treat generic images as detail images here
    organized.detailImages.push(
      ...files.images.map(f => getRelativePath(f.path))
    );
  }

  return organized;
};

const cleanupFiles = (files) => {
  try {
    if (!files) return;
    Object.values(files).flat().forEach(file => {
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        console.log(`Cleaned up file: ${file.path}`);
      }
    });
  } catch (e) {
    console.error('Error cleaning up files:', e);
  }
};

/**
 * Reorganize uploaded images:
 * - create /files/products/images/<slug>/{hero,details}
 * - first image -> hero/hero.<ext>
 * - others -> details/details-N.<ext>
 * Supports files from heroImage/detailImages/images fields.
 */
const reorganizeProductImages = async (productTitle, uploadedFiles, defaultImageSelection = null) => {
  const slug = createSlug(productTitle);
  const baseDir = path.join('files', 'products', 'images', slug);
  const heroDir = path.join(baseDir, 'hero');
  const detailsDir = path.join(baseDir, 'details');
  ensureDirectoryExists(heroDir);
  ensureDirectoryExists(detailsDir);

  console.log(`Reorganizing images for product: ${productTitle} (${slug})`);

  // Flatten all incoming files (no gallery)
  const all = [];
  if (uploadedFiles.heroImage) all.push(...uploadedFiles.heroImage);
  if (uploadedFiles.detailImages) all.push(...uploadedFiles.detailImages);
  if (uploadedFiles.images) all.push(...uploadedFiles.images);

  console.log(`Total images uploaded: ${all.length}`);

  const finalImages = {
    heroImage: null,
    detailImages: [],
    allImages: []
  };

  if (!all.length) {
    console.log('No images to reorganize.');
    return finalImages;
  }

  let defaultFile = null;
  let others = [...all];

  if (defaultImageSelection !== null && defaultImageSelection !== undefined) {
    const idx = parseInt(defaultImageSelection, 10);
    if (!Number.isNaN(idx) && idx >= 0 && idx < all.length) {
      defaultFile = all[idx];
      others = all.filter((_, i) => i !== idx);
      console.log(`Default image selected index ${idx}: ${defaultFile.originalname}`);
    }
  }

  // Default to first image if none explicitly selected
  if (!defaultFile) {
    defaultFile = all[0];
    others = all.slice(1);
    console.log(`Using first image as default: ${defaultFile.originalname}`);
  }

  // Move/rename hero
  const heroExt = path.extname(defaultFile.originalname);
  const heroPath = path.join(heroDir, `hero${heroExt}`);
  fs.renameSync(defaultFile.path, heroPath);
  finalImages.heroImage = getRelativePath(heroPath);
  console.log(`Moved default image to: ${heroPath}`);

  // Move/rename details
  others.forEach((file, i) => {
    const ext = path.extname(file.originalname);
    const detailPath = path.join(detailsDir, `details-${i + 1}${ext}`);
    fs.renameSync(file.path, detailPath);
    finalImages.detailImages.push(getRelativePath(detailPath));
    console.log(`Moved detail image to: ${detailPath}`);
  });

  finalImages.allImages = [finalImages.heroImage, ...finalImages.detailImages];
  console.log(`Image reorganization complete. Hero: Yes, Details: ${finalImages.detailImages.length}`);
  return finalImages;
};

const generateImagePreviews = (uploadedFiles) => {
  const previews = [];
  const all = [];
  if (uploadedFiles.heroImage) all.push(...uploadedFiles.heroImage);
  if (uploadedFiles.detailImages) all.push(...uploadedFiles.detailImages);
  if (uploadedFiles.images) all.push(...uploadedFiles.images);

  all.forEach((file, index) => {
    previews.push({
      index,
      originalName: file.originalname,
      filename: file.filename,
      path: getRelativePath(file.path),
      size: file.size,
      mimetype: file.mimetype,
      isDefault: index === 0
    });
  });
  return previews;
};

const createProductFolderStructure = (productTitle) => {
  const slug = createSlug(productTitle);
  const baseDir = path.join('files', 'products', 'images', slug);
  ['hero', 'details'].forEach(folder => {
    ensureDirectoryExists(path.join(baseDir, folder));
  });
  return {
    baseDir,
    productSlug: slug,
    heroDir: path.join(baseDir, 'hero'),
    detailsDir: path.join(baseDir, 'details')
  };
};

module.exports = {
  uploadProductImages,
  organizeUploadedFiles,
  cleanupFiles,
  createSlug,
  ensureDirectoryExists,
  getRelativePath,
  reorganizeProductImages,
  generateImagePreviews,
  createProductFolderStructure
};
