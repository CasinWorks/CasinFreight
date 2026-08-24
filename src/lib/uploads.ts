import { getDownloadURL, getStorage, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';
import { getFirebaseApp, isFirebaseConfigured } from './firebase';

let storage: FirebaseStorage | null = null;

export function getFirebaseStorage(): FirebaseStorage {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured.');
  }
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }
  return storage;
}

const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.72;
const ALLOWED = /^(image\/(jpeg|jpg|png|webp|gif|heic|heif)|application\/pdf)$/i;

async function loadImageSource(file: File): Promise<CanvasImageSource & { width: number; height: number; close?: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // HEIC / odd types fall through to an <img> decode.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read that photo.'));
      el.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

/** Downscale and JPEG-encode camera photos. PDFs and tiny files are left alone. */
export async function compressImageFile(file: File): Promise<File> {
  if (file.type === 'application/pdf' || file.type === 'image/gif') return file;
  if (file.type && !file.type.startsWith('image/')) return file;

  try {
    const source = await loadImageSource(file);
    const width = source.width || 0;
    const height = source.height || 0;
    if (!width || !height) {
      source.close?.();
      return file;
    }
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const nextW = Math.max(1, Math.round(width * scale));
    const nextH = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = nextW;
    canvas.height = nextH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      source.close?.();
      return file;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, nextW, nextH);
    ctx.drawImage(source, 0, 0, nextW, nextH);
    source.close?.();
    const blob = await canvasToJpegBlob(canvas, JPEG_QUALITY);
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function uploadCompanyFile(params: {
  companyId: string;
  folder: string;
  file: File;
  usedBytes?: number;
  maxBytes?: number;
}): Promise<{ url: string; name: string; bytes: number }> {
  if (!params.companyId) {
    throw new Error('Company workspace is missing. Refresh and try again.');
  }
  if (params.file.size > MAX_ORIGINAL_BYTES) {
    throw new Error('File must be under 20 MB.');
  }
  if (params.file.type && !ALLOWED.test(params.file.type)) {
    throw new Error('Use a photo (JPG, PNG, WebP) or a PDF.');
  }
  const file = await compressImageFile(params.file);
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('File must be under 8 MB after compression. Try a smaller photo.');
  }
  const used = Math.max(0, Number(params.usedBytes) || 0);
  const max = Math.max(0, Number(params.maxBytes) || 0);
  if (max > 0 && used + file.size > max) {
    throw new Error('Photo storage is full for this plan. Upgrade or buy extra GB.');
  }
  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'upload.jpg';
  const path = `companies/${params.companyId}/${params.folder}/${Date.now()}-${safeName}`;
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
    cacheControl: 'public, max-age=31536000, immutable',
  });
  return {
    url: await getDownloadURL(storageRef),
    name: file.name,
    bytes: file.size,
  };
}
