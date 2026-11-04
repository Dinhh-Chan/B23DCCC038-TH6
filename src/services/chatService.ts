import {
  increment,
  limitToLast,
  onChildAdded,
  onValue,
  push,
  query,
  ref,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { Conversation, Message } from '../commons/types';
import { db } from './firebase';

// Cấu trúc dữ liệu:
// messages/{chatId}/{messageId}  : { senderId, type, text | latitude+longitude, createdAt }
// userChats/{uid}/{otherUid}     : { chatId, lastMessage, lastSenderId, updatedAt, unread }
//   -> mỗi người giữ danh sách cuộc trò chuyện + số tin chưa đọc của riêng mình

// Hai người luôn ra cùng một chatId dù ai mở trước: "uidA_uidB" (đã sắp xếp)
export const getChatId = (a: string, b: string) => [a, b].sort().join('_');

// onChildAdded gọi 1 lần cho mỗi tin đã có, sau đó 1 lần cho mỗi tin mới.
// Trả về hàm huỷ lắng nghe -> phải gọi trong cleanup của useEffect
export function subscribeMessages(
  chatId: string,
  onMessage: (message: Message) => void,
) {
  return onChildAdded(
    query(ref(db, `messages/${chatId}`), limitToLast(200)),
    snapshot => onMessage({ ...snapshot.val(), id: snapshot.key }),
    error => console.warn('Không đọc được tin nhắn', error),
  );
}

export function subscribeConversations(
  uid: string,
  callback: (conversations: Conversation[]) => void,
) {
  return onValue(
    ref(db, `userChats/${uid}`),
    snapshot => {
      const list: Conversation[] = [];
      snapshot.forEach(child => {
        const value = child.val();
        if (value?.updatedAt) {
          list.push({ unread: 0, ...value, userId: child.key });
        }
      });
      // Cuộc trò chuyện mới nhất nằm trên cùng
      callback(list.sort((a, b) => b.updatedAt - a.updatedAt));
    },
    error => console.warn('Không đọc được cuộc trò chuyện', error),
  );
}

type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'location'; latitude: number; longitude: number };

// Ghi tin nhắn + cập nhật danh sách chat của cả 2 người trong 1 lần update
function sendMessage(
  senderId: string,
  receiverId: string,
  content: MessageContent,
  preview: string,
) {
  const chatId = getChatId(senderId, receiverId);
  const messageId = push(ref(db, `messages/${chatId}`)).key;
  const theirs = `userChats/${receiverId}/${senderId}`;
  const summary = {
    chatId,
    lastMessage: preview,
    lastSenderId: senderId,
    updatedAt: serverTimestamp(),
  };

  const updates: Record<string, unknown> = {
    [`messages/${chatId}/${messageId}`]: {
      ...content,
      senderId,
      createdAt: serverTimestamp(),
    },
    // Người nhận +1 tin chưa đọc (tăng trên server nên gửi liên tục cũng không bị đếm sai)
    [`${theirs}/unread`]: increment(1),
  };
  // Ghi từng trường thay vì cả object để không xoá mất "unread" đang có
  for (const path of [`userChats/${senderId}/${receiverId}`, theirs]) {
    for (const [key, value] of Object.entries(summary)) {
      updates[`${path}/${key}`] = value;
    }
  }
  return update(ref(db), updates);
}

export const sendTextMessage = (
  senderId: string,
  receiverId: string,
  text: string,
) => sendMessage(senderId, receiverId, { type: 'text', text }, text);

export const sendLocationMessage = (
  senderId: string,
  receiverId: string,
  latitude: number,
  longitude: number,
) =>
  sendMessage(
    senderId,
    receiverId,
    { type: 'location', latitude, longitude },
    '📍 Vị trí',
  );

export const markConversationRead = (uid: string, otherUid: string) =>
  set(ref(db, `userChats/${uid}/${otherUid}/unread`), 0);
