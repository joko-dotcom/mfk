// Cloudinary helpers. We don't depend on the official SDK — all we need is the
// signed-upload primitive so the browser can PUT files straight to Cloudinary
// without proxying through Vercel (Vercel serverless has a 4.5 MB body limit
// that would kill video uploads).
//
// Flow:
//   1. Client POST /api/upload/sign with folder / public_id hints.
//   2. Server returns { cloudName, apiKey, timestamp, signature, folder }.
//   3. Client POSTs the file as multipart/form-data to
//      https://api.cloudinary.com/v1_1/{cloudName}/auto/upload with those
//      fields attached. Cloudinary returns the secure_url.
//   4. Client passes the secure_url back to /api/koi as coverImage / media[i].url.
//
// Docs: https://cloudinary.com/documentation/upload_images#uploading_with_a_direct_call_to_the_rest_api
import crypto from "node:crypto";

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export type SignParams = {
  folder?: string;
  publicId?: string;
  resourceType?: "image" | "video" | "raw" | "auto";
};

export type SignedUploadPayload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType: "image" | "video" | "raw" | "auto";
  publicId?: string;
  uploadUrl: string;
};

/**
 * Build the signature that Cloudinary expects for a signed upload. The rule is:
 * sort the params alphabetically by key, join as `key=value&key=value`, then
 * SHA1(joined + apiSecret).
 * See: https://cloudinary.com/documentation/signatures
 */
export function signUpload(
  cfg: CloudinaryConfig,
  params: SignParams = {},
): SignedUploadPayload {
  const resourceType = params.resourceType ?? "auto";
  const folder = params.folder ?? "koi";
  const timestamp = Math.floor(Date.now() / 1000);

  const toSign: Record<string, string> = {
    folder,
    timestamp: String(timestamp),
  };
  if (params.publicId) toSign.public_id = params.publicId;

  const payload = Object.keys(toSign)
    .sort()
    .map((k) => `${k}=${toSign[k]}`)
    .join("&");

  const signature = crypto
    .createHash("sha1")
    .update(payload + cfg.apiSecret)
    .digest("hex");

  return {
    cloudName: cfg.cloudName,
    apiKey: cfg.apiKey,
    timestamp,
    signature,
    folder,
    resourceType,
    publicId: params.publicId,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resourceType}/upload`,
  };
}
