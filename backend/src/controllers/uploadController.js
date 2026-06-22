const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: process.env.MAX_FILE_SIZE || 5242880 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded' });
    }

    const fileUpload = await prisma.fileUpload.create({
      data: {
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: req.file.path,
        uploadedBy: req.userId,
        uploadType: req.body.uploadType || 'GENERAL',
      },
    });

    res.status(201).json({
      ok: true,
      file: fileUpload,
      downloadUrl: `/uploads/${req.file.filename}`,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

const getUploadedFiles = async (req, res) => {
  try {
    const files = await prisma.fileUpload.findMany({
      where: { uploadedBy: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ ok: true, files });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

module.exports = {
  upload,
  uploadFile,
  getUploadedFiles,
};
