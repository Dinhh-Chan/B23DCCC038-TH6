import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserProfile, setOffline } from './userService';

export const subscribeAuth = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);

export async function register(name: string, email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  await updateProfile(user, { displayName: name });
  await createUserProfile(user.uid, name, user.email ?? email.trim());
}

export const login = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email.trim(), password);

export async function logout(uid: string) {
  // Mất mạng thì lệnh ghi không bao giờ xong -> chỉ chờ tối đa 3 giây rồi vẫn đăng xuất
  // (khi đó server tự ghi offline nhờ onDisconnect)
  const timeout = new Promise<void>(resolve => setTimeout(resolve, 3000));
  await Promise.race([setOffline(uid).catch(() => {}), timeout]);
  await signOut(auth);
}

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Email hoặc mật khẩu không đúng',
  'auth/wrong-password': 'Email hoặc mật khẩu không đúng',
  'auth/user-not-found': 'Email hoặc mật khẩu không đúng',
  'auth/invalid-email': 'Email không hợp lệ',
  'auth/email-already-in-use': 'Email này đã được đăng ký',
  'auth/weak-password': 'Mật khẩu phải có ít nhất 6 ký tự',
  'auth/too-many-requests': 'Bạn thử quá nhiều lần, vui lòng đợi một lát',
  'auth/network-request-failed': 'Không có kết nối mạng',
  'auth/operation-not-allowed':
    'Chưa bật đăng nhập Email/Password trong Firebase Console',
};

export function getAuthErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code ?? '';
  if (code.startsWith('auth/api-key-not-valid')) {
    return 'Sai cấu hình Firebase (apiKey) trong src/services/firebaseConfig.ts';
  }
  return AUTH_ERRORS[code] ?? `Có lỗi xảy ra, vui lòng thử lại (${code})`;
}
