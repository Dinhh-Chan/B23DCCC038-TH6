import { push, ref, serverTimestamp, update } from 'firebase/database';
import { memberIds } from '../commons/conversation';
import { ConversationMeta } from '../commons/types';
import { buildMessageUpdates } from './chatService';
import { db } from './firebase';
import {
  newNotificationPath,
  notificationPayload,
} from './notificationService';

type Actor = { uid: string; name: string };

// Tin hệ thống ("A đã tạo nhóm", "A đã rời nhóm"...) gửi tới các thành viên
// trong recipients, đi chung lệnh update() với thay đổi của nhóm
function systemMessage(
  convId: string,
  actor: Actor,
  recipients: string[],
  text: string,
) {
  return buildMessageUpdates({
    convId,
    memberUids: recipients,
    senderId: actor.uid,
    content: { type: 'system', text },
    preview: text,
    countUnread: false,
  }).updates;
}

function addedNotifications(
  convId: string,
  actor: Actor,
  uids: string[],
  groupName: string,
) {
  const updates: Record<string, unknown> = {};
  for (const uid of uids) {
    updates[newNotificationPath(uid)] = notificationPayload(
      'group_added',
      convId,
      actor.uid,
      `${actor.name} đã thêm bạn vào nhóm "${groupName}"`,
    );
  }
  return updates;
}

// Tạo nhóm: conversations + userChats của mọi thành viên + tin hệ thống
// + thông báo "được thêm vào nhóm", tất cả trong một lệnh update()
export async function createGroup(
  actor: Actor,
  name: string,
  memberUidsWithoutMe: string[],
) {
  const convId = `g_${push(ref(db, 'conversations')).key}`;
  const all = [actor.uid, ...memberUidsWithoutMe];
  const members: Record<string, true> = {};
  for (const uid of all) members[uid] = true;

  await update(ref(db), {
    [`conversations/${convId}`]: {
      type: 'group',
      name,
      members,
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
    },
    ...systemMessage(convId, actor, all, `${actor.name} đã tạo nhóm "${name}"`),
    ...addedNotifications(convId, actor, memberUidsWithoutMe, name),
  });
  return convId;
}

export function renameGroup(
  meta: ConversationMeta,
  actor: Actor,
  newName: string,
) {
  return update(ref(db), {
    [`conversations/${meta.id}/name`]: newName,
    ...systemMessage(
      meta.id,
      actor,
      memberIds(meta),
      `${actor.name} đã đổi tên nhóm thành "${newName}"`,
    ),
  });
}

export function addMembers(
  meta: ConversationMeta,
  actor: Actor,
  newMembers: Actor[],
) {
  const updates: Record<string, unknown> = {};
  for (const m of newMembers) {
    updates[`conversations/${meta.id}/members/${m.uid}`] = true;
  }
  const recipients = [...memberIds(meta), ...newMembers.map(m => m.uid)];
  const names = newMembers.map(m => m.name).join(', ');
  return update(ref(db), {
    ...updates,
    ...systemMessage(
      meta.id,
      actor,
      recipients,
      `${actor.name} đã thêm ${names} vào nhóm`,
    ),
    ...addedNotifications(
      meta.id,
      actor,
      newMembers.map(m => m.uid),
      meta.name ?? 'Nhóm',
    ),
  });
}

// Xoá thành viên: bỏ khỏi members và xoá cuộc trò chuyện khỏi Home của họ
export function removeMember(
  meta: ConversationMeta,
  actor: Actor,
  member: Actor,
) {
  const remaining = memberIds(meta).filter(uid => uid !== member.uid);
  return update(ref(db), {
    ...systemMessage(
      meta.id,
      actor,
      remaining,
      `${actor.name} đã xoá ${member.name} khỏi nhóm`,
    ),
    [`conversations/${meta.id}/members/${member.uid}`]: null,
    [`userChats/${member.uid}/${meta.id}`]: null,
  });
}

// Rời nhóm: các thành viên còn lại thấy tin "A đã rời nhóm"
export function leaveGroup(meta: ConversationMeta, actor: Actor) {
  const remaining = memberIds(meta).filter(uid => uid !== actor.uid);
  return update(ref(db), {
    ...systemMessage(meta.id, actor, remaining, `${actor.name} đã rời nhóm`),
    [`conversations/${meta.id}/members/${actor.uid}`]: null,
    [`userChats/${actor.uid}/${meta.id}`]: null,
  });
}
