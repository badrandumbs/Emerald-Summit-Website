/**
 * Redraws a photo as a JPEG at most `maxEdge` px on its long edge (smaller
 * photos keep their size). This is how a 10 MB phone photo, or a HEIC one in
 * Safari, becomes something small enough for Storage. Null when the browser
 * can't decode the file.
 */
export async function shrinkToJpeg(file: Blob, maxEdge: number, quality = 0.85): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  } catch {
    return null;
  }
}
