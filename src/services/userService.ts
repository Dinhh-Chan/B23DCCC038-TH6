import {
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  set,
} from 'firebase/database';
import { AppState } from 'react-native';
import { UserProfile, UserStatus } from '../commons/types';
import { db } from './firebase';

// Ảnh đại diện cố định theo uid (mỗi người một ảnh, không cần upload)
export const avatarFor = (uid: string) => `https://i.pravatar.cc/150?u=${uid}`;

export function createUserProfile(uid: string, name: string, email: string) {
  return set(ref(db, `users/${uid}`), {
    name,
    email,
    avatar: avatarFor(uid),
    createdAt: serverTimestamp(),
  });
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

// Bật theo dõi online/offline cho người đang đăng nhập:
// - Có kết nối tới Firebase -> ghi online, đồng thời hẹn server tự ghi offline
//   khi kết nối bị mất (tắt app, mất mạng) bằng onDisconnect
// - App chuyển xuống nền -> offline, mở lại -> online
// Trả về hàm huỷ lắng nghe
export function startPresence(uid: string) {
  const statusRef = ref(db, `status/${uid}`);

  const unsubscribeConnected = onValue(ref(db, '.info/connected'), snap => {
    if (snap.val() !== true) {
      return;
    }
    onDisconnect(statusRef)
      .set({ online: false, lastChanged: serverTimestamp() })
      .then(() => writeStatus(uid, AppState.currentState !== 'background'))
      .catch(error => console.warn('Không cập nhật được trạng thái', error));
  });

  const appStateSub = AppState.addEventListener('change', state => {
    if (state === 'active' || state === 'background') {
      writeStatus(uid, state === 'active').catch(() => {});
    }
  });

  return () => {
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
