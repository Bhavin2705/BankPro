const fs = require('fs');
const path = require('path');
const multer = require('multer');

const PROFILE_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'profile');
const KYC_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'kyc');

if (!fs.existsSync(PROFILE_UPLOAD_DIR)) fs.mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(KYC_UPLOAD_DIR)) fs.mkdirSync(KYC_UPLOAD_DIR, { recursive: true });

const getExt = name => { const ext = path.extname(name || '').toLowerCase(); return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg'; };

const fileFilter = (req, file, cb) => {
    if (!file?.mimetype || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
        const err = new Error('Only JPEG, PNG, or WEBP images are allowed'); err.statusCode = 400; return cb(err);
    }
    cb(null, true);
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, PROFILE_UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `profile_${req.user?._id || 'user'}_${Date.now()}${getExt(file.originalname)}`)
});

const uploadProfilePhoto = multer({ storage, fileFilter, limits: { fileSize: 2097152 } });

const createKycUploader = () => multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, KYC_UPLOAD_DIR),
        filename: (req, file, cb) => cb(null, `kyc_${req.user?._id || 'user'}_${Date.now()}_${Math.round(Math.random() * 1e6)}${getExt(file.originalname)}`)
    }),
    fileFilter, limits: { fileSize: 3145728 }
});

module.exports = { uploadProfilePhoto, PROFILE_UPLOAD_DIR, KYC_UPLOAD_DIR, createKycUploader };
