// Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const ddmm = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

const daysAgo = (d: Date) => {
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return Math.round((startOf(new Date()) - startOf(d)) / 86400000);
};

// Dưới mỗi tin nhắn: "14:05" (hôm nay) hoặc "12/10 14:05"
export function formatMessageTime(timestamp: number) {
  const d = new Date(timestamp);
  return daysAgo(d) === 0 ? hhmm(d) : `${ddmm(d)} ${hhmm(d)}`;
}

// Danh sách cuộc trò chuyện: "14:05", "Hôm qua" hoặc "12/10"
export function formatListTime(timestamp: number) {
  const d = new Date(timestamp);
  const days = daysAgo(d);
  if (days === 0) {
    return hhmm(d);
  }
  return days === 1 ? 'Hôm qua' : ddmm(d);
}

// "Hoạt động X phút trước" khi người kia offline
export function formatLastActive(timestamp?: number, now = Date.now()) {
  if (!timestamp) return 'Ngoại tuyến';
  const minutes = Math.floor((now - timestamp) / 60000);
  if (minutes < 1) return 'Hoạt động vừa xong';
  if (minutes < 60) return `Hoạt động ${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hoạt động ${hours} giờ trước`;
  return `Hoạt động ${Math.floor(hours / 24)} ngày trước`;
}

// Thời gian ở danh sách thông báo: "Vừa xong", "5 phút trước", "Hôm qua"...
export function formatRelative(timestamp: number, now = Date.now()) {
  const minutes = Math.floor((now - timestamp) / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} giờ trước`;
  return formatListTime(timestamp);
}

export const formatClock = (timestamp: number) => hhmm(new Date(timestamp));
