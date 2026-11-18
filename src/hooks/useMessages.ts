import { useCallback, useEffect, useRef, useState } from 'react';
import { Message } from '../commons/types';
import {
  loadLatestMessages,
  loadOlderMessages,
  PAGE_SIZE,
  subscribeMessagesFrom,
} from '../services/chatService';

const byId = (a: Message, b: Message) => (a.id < b.id ? -1 : 1);

// Tin nhắn của một cuộc trò chuyện, sắp xếp cũ -> mới:
// - lần đầu tải 20 tin mới nhất (limitToLast(20))
// - loadMore(): tải thêm 20 tin cũ hơn khi kéo lên đầu danh sách
// - luôn nghe realtime từ tin cũ nhất đang có: tin mới, thu hồi, cảm xúc
export function useMessages(convId: string, ready: boolean) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const oldestKeyRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<() => void>(() => {});
  const aliveRef = useRef(false);
  const busyRef = useRef(false);

  // Thêm tin mới hoặc thay tin đã có (khi bị thu hồi / có cảm xúc mới)
  const upsert = useCallback((message: Message) => {
    setMessages(prev => {
      const index = prev.findIndex(m => m.id === message.id);
      if (index >= 0) {
        const next = prev.slice();
        next[index] = message;
        return next;
      }
      const last = prev[prev.length - 1];
      if (!last || last.id < message.id) return [...prev, message];
      return [...prev, message].sort(byId);
    });
  }, []);

  const listenFromOldest = useCallback(() => {
    unsubscribeRef.current();
    unsubscribeRef.current = subscribeMessagesFrom(
      convId,
      oldestKeyRef.current,
      upsert,
    );
  }, [convId, upsert]);

  useEffect(() => {
    if (!ready) return;
    aliveRef.current = true;
    setMessages([]);
    setLoadingInitial(true);
    setHasMore(false);
    oldestKeyRef.current = null;

    loadLatestMessages(convId)
      .then(list => {
        if (!aliveRef.current) return;
        setMessages(list);
        setHasMore(list.length === PAGE_SIZE);
        oldestKeyRef.current = list[0]?.id ?? null;
        listenFromOldest();
      })
      .catch(error => console.warn('Không tải được tin nhắn', error))
      .finally(() => {
        if (aliveRef.current) setLoadingInitial(false);
      });

    // Rời màn hình: huỷ listener, nếu không lần mở sau tin sẽ bị hiện lặp
    return () => {
      aliveRef.current = false;
      unsubscribeRef.current();
      unsubscribeRef.current = () => {};
    };
  }, [convId, ready, listenFromOldest]);

  const loadMore = useCallback(async () => {
    if (busyRef.current || !hasMore || !oldestKeyRef.current) return false;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const older = await loadOlderMessages(convId, oldestKeyRef.current);
      if (!aliveRef.current) return false;
      if (older.length > 0) {
        // Tin cũ được nối vào cuối mảng đảo ngược (= phía trên màn hình) nên
        // FlatList inverted giữ nguyên vị trí đang xem, danh sách không bị nhảy
        setMessages(prev => {
          const ids = new Set(older.map(m => m.id));
          return [...older, ...prev.filter(m => !ids.has(m.id))];
        });
        oldestKeyRef.current = older[0].id;
        listenFromOldest();
      }
      setHasMore(older.length === PAGE_SIZE);
      return older.length > 0;
    } catch (error) {
      console.warn('Không tải được tin cũ', error);
      return false;
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setLoadingMore(false);
    }
  }, [convId, hasMore, listenFromOldest]);

  return { messages, loadingInitial, loadingMore, hasMore, loadMore };
}
