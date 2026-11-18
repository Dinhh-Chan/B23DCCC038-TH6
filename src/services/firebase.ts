import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
// Hàm này chỉ có trong bản build React Native của firebase/auth (Metro tự chọn
// khi chạy), file kiểu dữ liệu chung của Firebase không khai báo nên phải bỏ qua lỗi TS
// @ts-expect-error
import { getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { firebaseConfig } from './firebaseConfig';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Lưu phiên đăng nhập vào AsyncStorage: mở lại app không phải đăng nhập lại.
// Fast Refresh có thể chạy lại file này, khi đó auth đã được khởi tạo -> dùng lại
function createAuth() {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getDatabase(app);
