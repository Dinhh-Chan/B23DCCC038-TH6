import { PermissionsAndroid, Platform } from 'react-native';
import {
  ImagePickerResponse,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import { cloudinaryConfig, isCloudinaryConfigured } from './cloudinaryConfig';

export type PickSource = 'camera' | 'library';

export class CameraPermissionError extends Error {}

async function requestCameraPermission() {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

// Thư viện tự thu nhỏ ảnh: cạnh dài nhất không quá 1024px, nén JPEG 80%
const PICK_OPTIONS = {
  mediaType: 'photo',
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
} as const;

// Trả về đường dẫn ảnh trên máy, null nếu người dùng huỷ
export async function pickImage(source: PickSource): Promise<string | null> {
  let response: ImagePickerResponse;
  if (source === 'camera') {
    if (!(await requestCameraPermission())) throw new CameraPermissionError();
    response = await launchCamera({ ...PICK_OPTIONS, saveToPhotos: false });
  } else {
    response = await launchImageLibrary({ ...PICK_OPTIONS, selectionLimit: 1 });
  }
  if (response.didCancel) return null;
  if (response.errorCode === 'camera_unavailable') {
    throw new Error('Thiết bị không có camera');
  }
  if (response.errorCode === 'permission') throw new CameraPermissionError();
  if (response.errorCode) throw new Error(response.errorMessage);
  return response.assets?.[0]?.uri ?? null;
}

// Tải ảnh lên Cloudinary bằng unsigned upload preset, trả về URL https của ảnh.
// Dùng XMLHttpRequest để theo dõi được tiến độ tải lên (0 -> 1)
export function uploadImage(
  uri: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  if (!isCloudinaryConfigured) {
    return Promise.reject(
      new Error('Chưa cấu hình Cloudinary (src/services/cloudinaryConfig.ts)'),
    );
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
    );
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
          resolve(body.secure_url);
        } else {
          reject(new Error(body.error?.message ?? `HTTP ${xhr.status}`));
        }
      } catch {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Lỗi mạng khi tải ảnh lên'));
    xhr.timeout = 60000;
    xhr.ontimeout = () => reject(new Error('Hết thời gian tải ảnh lên'));

    const form = new FormData();
    form.append('file', {
      uri,
      type: 'image/jpeg',
      name: `chat_${Date.now()}.jpg`,
    } as unknown as Blob);
    form.append('upload_preset', cloudinaryConfig.uploadPreset);
    xhr.send(form);
  });
}
