import { useEffect, useState } from 'react';

// Thời điểm hiện tại, tự cập nhật định kỳ để các chữ như
// "Hoạt động 5 phút trước" thay đổi theo thời gian
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
