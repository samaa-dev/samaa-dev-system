import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

import { getFirebaseStorage } from "@/integrations/firebase/client";
import { withFirebaseError } from "@/integrations/firebase/helpers";

/** Longest side (px) for public website images. Covers are 2752×1536 → 1920×1072, same ratio. */
const MAX_IMAGE_SIDE = 1920;
const WEBP_QUALITY = 0.85;

/**
 * Shrink large photos before upload so the public site stays fast on phones
 * (a 2–3 MB PNG cover becomes ~200–400 KB WebP). GIF/SVG and small images are uploaded as-is,
 * and the original file is kept whenever compression would not make it smaller.
 */
async function optimizeImage(file: File): Promise<File> {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type) || typeof createImageBitmap !== "function") {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
}

/** Upload a file under site/ in Firebase Storage. Returns the public download URL. */
export async function uploadSiteMedia(
  file: File,
  folder: "covers" | "avatars" | "gallery" | "videos" = "covers",
  onProgress?: (pct: number) => void,
): Promise<string> {
  return withFirebaseError(async () => {
    const upload = folder === "videos" ? file : await optimizeImage(file);
    const safeName = upload.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
    const path = `site/${folder}/${Date.now()}-${safeName}`;
    const storageRef = ref(getFirebaseStorage(), path);
    const task = uploadBytesResumable(storageRef, upload, {
      contentType: upload.type || "application/octet-stream",
      cacheControl: "public,max-age=31536000,immutable",
    });

    await new Promise<void>((resolve, reject) => {
      task.on(
        "state_changed",
        (snap) => {
          if (!onProgress || !snap.totalBytes) return;
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        },
        reject,
        () => resolve(),
      );
    });

    return getDownloadURL(task.snapshot.ref);
  });
}
