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

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = /^(image\/(jpeg|jpg|png|webp|gif|heic|heif)|application\/pdf)$/i;

export async function uploadCompanyFile(params: {
  companyId: string;
  folder: string;
  file: File;
}): Promise<{ url: string; name: string }> {
  if (!params.companyId) {
    throw new Error('Company workspace is missing. Refresh and try again.');
  }
  if (params.file.size > MAX_BYTES) {
    throw new Error('File must be under 8 MB.');
  }
  if (params.file.type && !ALLOWED.test(params.file.type)) {
    throw new Error('Use a photo (JPG, PNG, WebP) or a PDF.');
  }
  const safeName = params.file.name.replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'upload';
  const path = `companies/${params.companyId}/${params.folder}/${Date.now()}-${safeName}`;
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, params.file, {
    contentType: params.file.type || 'application/octet-stream',
  });
  return {
    url: await getDownloadURL(storageRef),
    name: params.file.name,
  };
}
