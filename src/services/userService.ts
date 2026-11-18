import { updateProfile as updateAuthProfile } from 'firebase/auth';
import {
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { AppState } from 'react-native';
import { UserProfile, UserStatus } from '../commons/types';
import { auth, db } from './firebase';

// Ảnh đại diện mặc định cố định theo uid (đổi được ở màn Hồ sơ)
export const avatarFor = (uid: string) => `https://i.pravatar.cc/150?u=${uid}`;

export function createUserProfile(uid: string, name: string, email: string) {
  return set(ref(db, `users/${uid}`), {
    name,
    email,
    avatar: avatarFor(uid),
    createdAt: serverTimestamp(),
  });
}

// Đổi họ tên / ảnh đại diện. Mọi màn hình đọc users/{uid} nên tự cập nhật theo
export async function updateUserProfile(
  uid: string,
  changes: { name?: string; avatar?: string },
) {
  await update(ref(db, `users/${uid}`), changes);
  if (auth.currentUser && changes.name) {
    await updateAuthProfile(auth.currentUser, { displayName: changes.name });
  }
}

// users/{uid}: thông tin của mọi người đã đăng ký
export function subscribeUsers(callback: (users: UserProfile[]) => void) {
  return onValue(
    ref(db, 'users'),
    snapshot => {
      const list: UserProfile[] = [];
      snapshot.forEach(child => {
        list.push({ ...child.val(), uid: child.key });
      });
      callback(list);
    },
    error => console.warn('Không đọc được danh sách người dùng', error),
  );
}

// status/{uid}: { online, lastChanged }
export function subscribeStatuses(
  callback: (statuses: Record<string, UserStatus>) => void,
) {
  return onValue(
    ref(db, 'status'),
    snapshot => callback(snapshot.val() ?? {}),
    error => console.warn('Không đọc được trạng thái online', error),
  );
}

const writeStatus = (uid: string, online: boolean) =>
  set(ref(db, `status/${uid}`), { online, lastChanged: serverTimestamp() });

// Thời gian chờ trước khi coi là offline khi app xuống nền. Tránh báo offline
// khi chỉ thoáng mở hộp thoại xin quyền, chọn ảnh, mở Google Maps rồi quay lại
const BACKGROUND_GRACE_MS = 5000;

// Bật theo dõi online/offline cho người đang đăng nhập:
// - Có kết nối tới Firebase -> ghi online, đồng thời hẹn server tự ghi offline
//   (kèm lastChanged để hiện "Hoạt động X phút trước") khi kết nối bị mất
//   (tắt app đột ngột, mất mạng) bằng onDisconnect
// - App ở nền quá 5 giây -> offline, mở lại -> online
// Trả về hàm huỷ lắng nghe
export function startPresence(uid: string) {
  const statusRef = ref(db, `status/${uid}`);
  let offlineTimer: ReturnType<typeof setTimeout> | undefined;

  const unsubscribeConnected = onValue(ref(db, '.info/connected'), snap => {
    if (snap.val() !== true) return;
    onDisconnect(statusRef)
      .set({ online: false, lastChanged: serverTimestamp() })
      .then(() => writeStatus(uid, AppState.currentState !== 'background'))
      .catch(error => console.warn('Không cập nhật được trạng thái', error));
  });

  const appStateSub = AppState.addEventListener('change', state => {
    clearTimeout(offlineTimer);
    if (state === 'active') {
      writeStatus(uid, true).catch(() => {});
    } else if (state === 'background') {
      offlineTimer = setTimeout(
        () => writeStatus(uid, false).catch(() => {}),
        BACKGROUND_GRACE_MS,
      );
    }
  });

  return () => {
    clearTimeout(offlineTimer);
    unsubscribeConnected();
    appStateSub.remove();
  };
}

// Gọi trước khi signOut (sau khi đăng xuất thì không còn quyền ghi)
export async function setOffline(uid: string) {
  const statusRef = ref(db, `status/${uid}`);
  await onDisconnect(statusRef).cancel();
  await writeStatus(uid, false);
}
