import path from 'node:path';
import type { Request, RequestHandler, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import { ValidationError } from '../shared/errors/ValidationError';

/**
 * Uploads are held in memory, never written to disk. Receipts go straight on to
 * Cloudinary and CSV imports are parsed and discarded, so a temp file would only
 * add cleanup work and a place for a half-processed upload to linger.
 */

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const MAX_CSV_BYTES = 1024 * 1024;

const RECEIPT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];
const RECEIPT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.pdf'];

/**
 * Browsers are inconsistent about CSV: Chrome sends `text/csv`, Excel-installed
 * Windows sends `application/vnd.ms-excel`, and some send nothing useful at all.
 * The extension is checked as well so a legitimate file is never rejected on a
 * technicality — the parser is the real gate.
 */
const CSV_MIME_TYPES = [
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
  'application/octet-stream',
];
const CSV_EXTENSIONS = ['.csv', '.txt'];

interface UploadRules {
  field: string;
  maxBytes: number;
  mimeTypes: string[];
  extensions: string[];
  /** Human phrasing for the rejection message, e.g. "an image or PDF". */
  accepts: string;
  maxSizeLabel: string;
}

const buildUploader = (rules: UploadRules): RequestHandler => {
  const middleware = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: rules.maxBytes, files: 1 },
    fileFilter: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const allowed =
        rules.mimeTypes.includes(file.mimetype) || rules.extensions.includes(extension);

      if (allowed) {
        callback(null, true);
        return;
      }

      callback(
        new ValidationError('Validation failed', { [rules.field]: [`Upload ${rules.accepts}.`] }),
      );
    },
  }).single(rules.field);

  // Multer reports its own failures as `MulterError`, which the global handler
  // would turn into an opaque 500. Translate them into the same 422 shape Zod
  // produces so the client can surface the message against the field.
  return (req: Request, res: Response, next: NextFunction): void => {
    middleware(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof MulterError) {
        const message =
          error.code === 'LIMIT_FILE_SIZE'
            ? `File is too large. The limit is ${rules.maxSizeLabel}.`
            : error.code === 'LIMIT_UNEXPECTED_FILE'
              ? `Send the file in the "${rules.field}" field.`
              : 'That file could not be read.';

        next(new ValidationError('Validation failed', { [rules.field]: [message] }));
        return;
      }

      next(error);
    });
  };
};

export const uploadReceipt = buildUploader({
  field: 'receipt',
  maxBytes: MAX_RECEIPT_BYTES,
  mimeTypes: RECEIPT_MIME_TYPES,
  extensions: RECEIPT_EXTENSIONS,
  accepts: 'a JPEG, PNG, WebP, HEIC image or a PDF',
  maxSizeLabel: '5 MB',
});

export const uploadCsv = buildUploader({
  field: 'file',
  maxBytes: MAX_CSV_BYTES,
  mimeTypes: CSV_MIME_TYPES,
  extensions: CSV_EXTENSIONS,
  accepts: 'a .csv file',
  maxSizeLabel: '1 MB',
});

/** Narrows `req.file`, which Express types as possibly absent on every request. */
export const requireFile = (req: Request, field: string): Express.Multer.File => {
  if (!req.file) {
    throw new ValidationError('Validation failed', { [field]: ['Choose a file to upload.'] });
  }
  return req.file;
};
