import {
  limitToLast,
  onValue,
  push,
  query,
  ref,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { AppNotification, NotificationType } from '../commons/types';
import { db } from './firebase';

// notifications/{uid}/{id}: { type, convId, fromUid, text, createdAt, read }
// Thông báo được ghi CÙNG lệnh update() với hành động gây ra nó (gửi tin, tạo nhóm,
// thả cảm xúc) nên các service khác dùng 2 hàm dưới để thêm vào object updates
export const newNotificationPath = (uid: string) =>
  `notifications/${uid}/${push(ref(db, `notifications/${uid}`)).key}`;

export const notificationPayload = (
  type: NotificationType,
  convId: string,
  fromUid: string,
  text: string,
) => ({
  type,
  convId,
  fromUid,
  text,
  createdAt: serverTimestamp(),
  read: false,
});

// 50 thông báo gần nhất, mới nhất lên đầu
export function subscribeNotifications(
  uid: string,
  callback: (list: AppNotification[]) => void,
) {
  return onValue(
    query(ref(db, `notifications/${uid}`), limitToLast(50)),
    snapshot => {
      const list: AppNotification[] = [];
      snapshot.forEach(child => {
        list.push({ ...child.val(), id: child.key });
      });
      callback(list.reverse());
    },
    error => console.warn('Không đọc được thông báo', error),
  );
}

export const markNotificationRead = (uid: string, id: string) =>
  set(ref(db, `notifications/${uid}/${id}/read`), true);

export function markAllNotificationsRead(uid: string, ids: string[]) {
  if (ids.length === 0) return Promise.resolve();
  const updates: Record<string, boolean> = {};
  for (const id of ids) updates[`${id}/read`] = true;
  return update(ref(db, `notifications/${uid}`), updates);
}
