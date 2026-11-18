import {
  DataSnapshot,
  endBefore,
  get,
  increment,
  limitToLast,
  onChildAdded,
  onChildChanged,
  onDisconnect,
  onValue,
  orderByKey,
  push,
  query,
  ref,
  serverTimestamp,
  set,
  startAt,
  update,
} from 'firebase/database';
import {
  directConvId,
  memberIds,
  messagePreview,
  RECALLED_TEXT,
} from '../commons/conversation';
import {
  Conversation,
  ConversationMeta,
  Message,
  ReplyRef,
} from '../commons/types';
import { db } from './firebase';
import {
  newNotificationPath,
  notificationPayload,
} from './notificationService';

// Cấu trúc dữ liệu:
// conversations/{convId}     : { type: "direct" | "group", name, members: {uid: true}, createdBy, createdAt }
// messages/{convId}/{msgId}  : { senderId, type, text | imageUrl | lat+lng, createdAt, recalled, reactions, replyTo }
// userChats/{uid}/{convId}   : { lastMessage, lastSenderId, lastMessageId, updatedAt, unread }
// readStatus/{convId}/{uid}  : thời điểm đọc cuối
// typing/{convId}/{uid}      : true khi đang gõ
// viewing/{convId}/{uid}     : true khi đang mở cuộc trò chuyện (để không gửi thông báo thừa)

export const PAGE_SIZE = 20;
export const SYSTEM_SENDER = 'system'; // lastSenderId của tin hệ thống

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; imageUrl: string }
  | { type: 'location'; lat: number; lng: number }
  | { type: 'system'; text: string };

// ---------- Cuộc trò chuyện ----------

// Tạo conversations/{uidA_uidB} cho chat 1-1 nếu chưa có (lần đầu nhắn tin)
export async function ensureDirectConversation(myUid: string, peerUid: string) {
  const id = directConvId(myUid, peerUid);
  const convRef = ref(db, `conversations/${id}`);
  const snapshot = await get(convRef);
  if (!snapshot.exists()) {
    await set(convRef, {
      type: 'direct',
      members: { [myUid]: true, [peerUid]: true },
      createdBy: myUid,
      createdAt: serverTimestamp(),
    });
  }
  return id;
}

export function subscribeConversation(
  convId: string,
  callback: (meta: ConversationMeta | null) => void,
) {
  return onValue(
    ref(db, `conversations/${convId}`),
    snapshot =>
      callback(snapshot.exists() ? { ...snapshot.val(), id: convId } : null),
    // Bị xoá khỏi nhóm -> mất quyền đọc
    () => callback(null),
  );
}

// userChats/{uid}: danh sách cuộc trò chuyện của tôi (cả 1-1 và nhóm)
export function subscribeChatSummaries(
  uid: string,
  callback: (list: Conversation[]) => void,
) {
  return onValue(
    ref(db, `userChats/${uid}`),
    snapshot => {
      const list: Conversation[] = [];
      snapshot.forEach(child => {
        const value = child.val();
        // Bỏ qua dữ liệu kiểu cũ của Bài 5 (khoá là uid, không có "_")
        if (child.key?.includes('_') && value?.updatedAt) {
          list.push({ unread: 0, ...value, id: child.key });
        }
      });
      callback(list);
    },
    error => console.warn('Không đọc được cuộc trò chuyện', error),
  );
}

// ---------- Tin nhắn: tải theo trang + lắng nghe realtime ----------

const toMessage = (snapshot: DataSnapshot): Message => ({
  ...snapshot.val(),
  id: snapshot.key as string,
});

async function getMessages(q: ReturnType<typeof query>) {
  const snapshot = await get(q);
  const list: Message[] = [];
  snapshot.forEach(child => {
    list.push(toMessage(child));
  });
  return list; // cũ -> mới (push id tăng dần theo thời gian)
}

// Lần đầu: 20 tin mới nhất
export const loadLatestMessages = (convId: string) =>
  getMessages(
    query(ref(db, `messages/${convId}`), orderByKey(), limitToLast(PAGE_SIZE)),
  );

// Kéo lên đầu: 20 tin ngay trước tin cũ nhất đang hiển thị
export const loadOlderMessages = (convId: string, beforeKey: string) =>
  getMessages(
    query(
      ref(db, `messages/${convId}`),
      orderByKey(),
      endBefore(beforeKey),
      limitToLast(PAGE_SIZE),
    ),
  );

// Nghe mọi tin từ fromKey trở về sau: tin mới (child_added) và tin bị thay đổi
// như thu hồi, thả cảm xúc (child_changed). Trả về hàm huỷ cả 2 listener
export function subscribeMessagesFrom(
  convId: string,
  fromKey: string | null,
  onUpsert: (message: Message) => void,
) {
  const base = ref(db, `messages/${convId}`);
  const q = fromKey
    ? query(base, orderByKey(), startAt(fromKey))
    : query(base, orderByKey());
  const onError = (error: Error) =>
    console.warn('Không đọc được tin nhắn', error);
  const offAdded = onChildAdded(q, s => onUpsert(toMessage(s)), onError);
  const offChanged = onChildChanged(q, s => onUpsert(toMessage(s)), onError);
  return () => {
    offAdded();
    offChanged();
  };
}

// ---------- Gửi tin ----------

type BuildOptions = {
  convId: string;
  memberUids: string[]; // thành viên nhận cập nhật userChats
  senderId: string;
  content: MessageContent;
  preview: string; // dòng tin cuối hiển thị ở Home
  replyTo?: ReplyRef;
  countUnread?: boolean; // tin hệ thống thì không tăng số chưa đọc
  notify?: { skip: Record<string, unknown>; text: string };
};

// Gom vào MỘT object cho update() nhiều đường dẫn:
// tin nhắn + lastMessage của mọi thành viên + số chưa đọc + thông báo
export function buildMessageUpdates(options: BuildOptions) {
  const { convId, memberUids, senderId, content, preview } = options;
  const msgId = push(ref(db, `messages/${convId}`)).key as string;
  const updates: Record<string, unknown> = {
    [`messages/${convId}/${msgId}`]: {
      ...content,
      senderId,
      createdAt: serverTimestamp(),
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    },
  };
  const isSystem = content.type === 'system';

  for (const uid of memberUids) {
    // Ghi từng trường thay vì cả object để không xoá mất "unread" đang có
    const base = `userChats/${uid}/${convId}`;
    updates[`${base}/lastMessage`] = preview;
    updates[`${base}/lastSenderId`] = isSystem ? SYSTEM_SENDER : senderId;
    updates[`${base}/lastMessageId`] = msgId;
    updates[`${base}/updatedAt`] = serverTimestamp();
    if (uid === senderId) continue;
    // Tăng trên server bằng increment(1): không đọc giá trị cũ rồi cộng
    if (options.countUnread !== false) {
      updates[`${base}/unread`] = increment(1);
    }
    // Người không mở cuộc trò chuyện này -> nhận thông báo
    if (options.notify && !options.notify.skip[uid]) {
      updates[newNotificationPath(uid)] = notificationPayload(
        'message',
        convId,
        senderId,
        options.notify.text,
      );
    }
  }
  return { updates, msgId };
}

export async function sendMessage(params: {
  meta: ConversationMeta;
  senderId: string;
  senderName: string;
  content: MessageContent;
  replyTo?: ReplyRef;
  viewers: Record<string, unknown>; // ai đang mở cuộc trò chuyện
}) {
  const { meta, senderId, senderName, content } = params;
  const preview = messagePreview({
    type: content.type,
    text: 'text' in content ? content.text : undefined,
  });
  const where = meta.type === 'group' ? ` (${meta.name})` : '';
  const { updates, msgId } = buildMessageUpdates({
    convId: meta.id,
    memberUids: memberIds(meta),
    senderId,
    content,
    preview,
    replyTo: params.replyTo,
    notify: { skip: params.viewers, text: `${senderName}${where}: ${preview}` },
  });
  await update(ref(db), updates);
  return msgId;
}

// ---------- Thu hồi & cảm xúc ----------

// Không xoá node: đánh dấu recalled = true và xoá nội dung.
// Nếu là tin cuối của cuộc trò chuyện thì cập nhật luôn dòng tin cuối ở Home
export function recallMessage(
  meta: ConversationMeta,
  message: Message,
  isLastMessage: boolean,
) {
  const base = `messages/${meta.id}/${message.id}`;
  const updates: Record<string, unknown> = { [`${base}/recalled`]: true };
  const fields = [
    'text',
    'imageUrl',
    'lat',
    'lng',
    'latitude',
    'longitude',
  ] as const;
  for (const field of fields) {
    if (message[field] !== undefined) updates[`${base}/${field}`] = null;
  }
  if (isLastMessage) {
    for (const uid of memberIds(meta)) {
      updates[`userChats/${uid}/${meta.id}/lastMessage`] = RECALLED_TEXT;
    }
  }
  return update(ref(db), updates);
}

// Mỗi người chỉ ghi reactions/{uid của mình}. Chọn lại đúng emoji cũ = bỏ cảm xúc
export function toggleReaction(params: {
  meta: ConversationMeta;
  message: Message;
  myUid: string;
  myName: string;
  emoji: string;
}) {
  const { meta, message, myUid, emoji } = params;
  const next = message.reactions?.[myUid] === emoji ? null : emoji;
  const updates: Record<string, unknown> = {
    [`messages/${meta.id}/${message.id}/reactions/${myUid}`]: next,
  };
  if (next && message.senderId !== myUid && meta.members[message.senderId]) {
    updates[newNotificationPath(message.senderId)] = notificationPayload(
      'reaction',
      meta.id,
      myUid,
      `${params.myName} đã bày tỏ ${next} về tin nhắn: "${messagePreview(
        message,
      )}"`,
    );
  }
  return update(ref(db), updates);
}

// ---------- Trạng thái: đang gõ, đang xem, đã đọc ----------

// Đặt cờ true kèm onDisconnect().remove(): app bị tắt đột ngột thì server tự xoá
async function setFlag(path: string, value: boolean) {
  const flagRef = ref(db, path);
  if (value) {
    await onDisconnect(flagRef).remove();
    return set(flagRef, true);
  }
  await onDisconnect(flagRef).cancel();
  return set(flagRef, null);
}

export const setTyping = (convId: string, uid: string, typing: boolean) =>
  setFlag(`typing/${convId}/${uid}`, typing);

export const setViewing = (convId: string, uid: string, viewing: boolean) =>
  setFlag(`viewing/${convId}/${uid}`, viewing);

function subscribeFlags(
  path: string,
  callback: (flags: Record<string, boolean>) => void,
) {
  return onValue(
    ref(db, path),
    snapshot => callback(snapshot.val() ?? {}),
    () => callback({}),
  );
}

export const subscribeTyping = (
  convId: string,
  callback: (flags: Record<string, boolean>) => void,
) => subscribeFlags(`typing/${convId}`, callback);

export const subscribeViewing = (
  convId: string,
  callback: (flags: Record<string, boolean>) => void,
) => subscribeFlags(`viewing/${convId}`, callback);

// Đã đọc: lưu thời điểm đọc cuối + đưa số chưa đọc về 0
export const markConversationRead = (convId: string, uid: string) =>
  update(ref(db), {
    [`readStatus/${convId}/${uid}`]: serverTimestamp(),
    [`userChats/${uid}/${convId}/unread`]: 0,
  });

export function subscribeReadStatus(
  convId: string,
  callback: (status: Record<string, number>) => void,
) {
  return onValue(
    ref(db, `readStatus/${convId}`),
    snapshot => callback(snapshot.val() ?? {}),
    () => callback({}),
  );
}
