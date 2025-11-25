import { supabaseAdmin } from "../supabase-admin";

const BUCKET_NAME = "stock-movement-images";

/**
 * Upload an image to Supabase Storage
 * @param base64Image - Base64 encoded image string (with or without data URL prefix)
 * @param filename - Optional custom filename
 * @returns Public URL of the uploaded image
 */
export async function uploadStockImage(
  base64Image: string,
  filename?: string
): Promise<string> {
  try {
    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = base64Image.includes(",")
      ? base64Image.split(",")[1]
      : base64Image;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Generate filename if not provided
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const finalFilename = filename || `stock-${timestamp}-${randomString}.jpg`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(finalFilename, buffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Error uploading image:", error);
      throw new Error("Failed to upload image");
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("Error in uploadStockImage:", error);
    throw new Error("Failed to upload image");
  }
}

/**
 * Delete an image from Supabase Storage
 * @param imageUrl - Public URL of the image to delete
 */
export async function deleteStockImage(imageUrl: string): Promise<void> {
  try {
    // Extract path from public URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split(`/${BUCKET_NAME}/`);
    if (pathParts.length < 2) {
      throw new Error("Invalid image URL");
    }
    const filePath = pathParts[1];

    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error("Error deleting image:", error);
      throw new Error("Failed to delete image");
    }
  } catch (error) {
    console.error("Error in deleteStockImage:", error);
    throw new Error("Failed to delete image");
  }
}

/**
 * Ensure the storage bucket exists (run this during setup)
 */
export async function ensureStorageBucket(): Promise<void> {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error("Error listing buckets:", listError);
      return;
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME);

    if (!bucketExists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png"],
      });

      if (createError) {
        console.error("Error creating bucket:", createError);
      } else {
        console.log(`Storage bucket '${BUCKET_NAME}' created successfully`);
      }
    }
  } catch (error) {
    console.error("Error ensuring storage bucket:", error);
  }
}

/**
 * Compress and resize base64 image on server side
 * @param base64Image - Base64 encoded image
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param quality - JPEG quality 0-100 (default: 80)
 */
export function compressBase64Image(
  base64Image: string,
  maxWidth: number = 1920,
  quality: number = 80
): Promise<string> {
  // Note: This is a placeholder. For actual image compression on server,
  // you would need to use a library like 'sharp' or similar.
  // For now, we'll return the original image.
  // Client-side compression is recommended before upload.
  return Promise.resolve(base64Image);
}
