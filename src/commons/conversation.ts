import { ConversationMeta, Message } from './types';

export const RECALLED_TEXT = 'Tin nhắn đã được thu hồi';
export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];

// Nhóm: "g_<pushId>", 1-1: "uidA_uidB" (2 uid đã sắp xếp, uid Firebase không chứa "_")
export const isGroupId = (convId: string) => convId.startsWith('g_');
export const directConvId = (a: string, b: string) => [a, b].sort().join('_');
export const getPeerId = (convId: string, myUid: string) =>
  convId.split('_').find(id => id !== myUid) ?? '';

export const memberIds = (meta?: ConversationMeta) =>
  Object.keys(meta?.members ?? {});

// Toạ độ: tin mới dùng lat/lng, tin vị trí của Bài 5 dùng latitude/longitude
export const messageCoords = (m: Message) => {
  const lat = m.lat ?? m.latitude;
  const lng = m.lng ?? m.longitude;
  return lat !== undefined && lng !== undefined ? { lat, lng } : null;
};

// Nội dung rút gọn hiển thị ở Home, thông báo và phần trích dẫn
export function messagePreview(m: Pick<Message, 'type' | 'text' | 'recalled'>) {
  if (m.recalled) return RECALLED_TEXT;
  if (m.type === 'image') return '📷 Hình ảnh';
  if (m.type === 'location') return '📍 Vị trí';
  const text = m.text ?? '';
  return text.length > 100 ? `${text.slice(0, 100)}…` : text;
}
