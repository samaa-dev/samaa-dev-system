import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

import { getFirebaseStorage } from "@/integrations/firebase/client";
import { withFirebaseError } from "@/integrations/firebase/helpers";

/** Upload a file under site/ in Firebase Storage. Returns the public download URL. */
export async function uploadSiteMedia(
  file: File,
  folder: "covers" | "avatars" | "gallery" = "covers",
  onProgress?: (pct: number) => void,
): Promise<string> {
  return withFirebaseError(async () => {
    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
    const path = `site/${folder}/${Date.now()}-${safeName}`;
    const storageRef = ref(getFirebaseStorage(), path);
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || "application/octet-stream",
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
