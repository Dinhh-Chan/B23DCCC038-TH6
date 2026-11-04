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
