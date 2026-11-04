import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, initializeAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { firebaseConfig } from './firebaseConfig';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Phiên đăng nhập giữ trong bộ nhớ: tắt app thì phải đăng nhập lại.
// Fast Refresh có thể chạy lại file này, khi đó auth đã được khởi tạo -> dùng lại
function createAuth() {
  try {
    return initializeAuth(app, { persistence: inMemoryPersistence });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getDatabase(app);
