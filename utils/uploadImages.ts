import * as FileSystem from 'expo-file-system/legacy';
import { auth, storageBucket } from '../firebaseConfig';

const isLocalUri = (uri: string) =>
  uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://');

async function prepareUploadUri(uri: string): Promise<string> {
  if (uri.startsWith('content://') || uri.startsWith('ph://')) {
    const dest = `${FileSystem.cacheDirectory}upload_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  }
  return uri;
}

function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (!xhr.response) {
        reject(new Error('無法讀取圖片，請換一張照片再試'));
        return;
      }
      resolve(xhr.response);
    };
    xhr.onerror = () => reject(new Error('無法讀取圖片，請換一張照片再試'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

function getDownloadUrl(objectName: string, downloadToken: string): string {
  const encodedName = encodeURIComponent(objectName);
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodedName}?alt=media&token=${downloadToken}`;
}

async function uploadBlobViaRest(blob: Blob, objectPath: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('請先登入帳號再上傳圖片');
  }

  const token = await user.getIdToken();
  const uploadUrl =
    `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o` +
    `?uploadType=media&name=${encodeURIComponent(objectPath)}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'image/jpeg',
    },
    body: blob,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Firebase Storage REST error:', response.status, errorText);

    if (response.status === 401 || response.status === 403) {
      throw new Error('沒有上傳權限。請確認已登入，並在 Firebase Storage 規則允許登入用戶上傳。');
    }
    if (response.status === 404) {
      throw new Error('Firebase Storage 尚未啟用。請到 Firebase Console → Storage → Get started 開啟。');
    }

    throw new Error(`圖片上傳失敗 (錯誤碼 ${response.status})`);
  }

  const data = await response.json();
  if (!data.downloadTokens) {
    throw new Error('圖片上傳失敗，未取得下載連結');
  }

  return getDownloadUrl(data.name, data.downloadTokens.split(',')[0]);
}

async function uploadLocalImage(uri: string, objectPath: string): Promise<string> {
  const fileUri = await prepareUploadUri(uri);
  const blob = await uriToBlob(fileUri);
  return uploadBlobViaRest(blob, objectPath);
}

export async function uploadAvatarImage(uid: string, uri: string): Promise<string> {
  if (!isLocalUri(uri)) {
    return uri;
  }

  const objectPath = `avatars/${uid}/${Date.now()}.jpg`;
  return uploadLocalImage(uri, objectPath);
}

export async function uploadListingImages(uris: string[]): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];

    if (!isLocalUri(uri)) {
      uploadedUrls.push(uri);
      continue;
    }

    uploadedUrls.push(await uploadLocalImage(uri, `guitars/${Date.now()}_${i}.jpg`));
  }

  return uploadedUrls;
}
