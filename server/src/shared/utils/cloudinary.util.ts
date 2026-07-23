import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadedAsset {
  url: string;
  publicId: string;
  bytes: number;
  format: string | null;
}

/**
 * Uploads a file we already hold in memory. Multer keeps receipts in a buffer
 * rather than writing them to disk, so there is no path to hand Cloudinary —
 * `upload_stream` takes the bytes directly and never touches the filesystem.
 */
export const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder: string,
): Promise<UploadedAsset> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `family-finance/${folder}`, resource_type: 'auto' },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format ?? null,
        });
      },
    );

    stream.end(buffer);
  });

export const uploadToCloudinary = async (
  filePath: string,
  folder: string,
  publicId?: string,
): Promise<{ url: string; publicId: string }> => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `family-finance/${folder}`,
    public_id: publicId,
    overwrite: true,
    resource_type: 'auto',
  });
  return { url: result.secure_url, publicId: result.public_id };
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};
