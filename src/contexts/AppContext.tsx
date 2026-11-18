import { User } from 'firebase/auth';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Colors, darkColors, lightColors } from '../commons/theme';
import {
  Account,
  AppNotification,
  Contact,
  Conversation,
  ConversationMeta,
  UserProfile,
  UserStatus,
} from '../commons/types';
import {
  logout as firebaseLogout,
  subscribeAuth,
} from '../services/authService';
import {
  subscribeChatSummaries,
  subscribeConversation,
} from '../services/chatService';
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from '../services/notificationService';
import {
  avatarFor,
  startPresence,
  subscribeStatuses,
  subscribeUsers,
} from '../services/userService';

type AppContextValue = {
  initializing: boolean; // đang chờ Firebase báo trạng thái đăng nhập
  account: Account | null;
  logout: () => Promise<void>;

  users: Contact[]; // mọi người đã đăng ký, trừ bản thân
  getUser: (uid: string) => Contact | undefined; // kể cả bản thân

  conversations: Conversation[]; // 1-1 và nhóm, mới nhất lên đầu
  getConversation: (convId: string) => Conversation | undefined;

  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  colors: Colors;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});
  const [summaries, setSummaries] = useState<Conversation[]>([]);
  const [metas, setMetas] = useState<Record<string, ConversationMeta | null>>(
    {},
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const unsubscribersRef = useRef<(() => void)[]>([]);

  const uid = authUser?.uid;

  useEffect(
    () =>
      subscribeAuth(user => {
        setAuthUser(user);
        setInitializing(false);
      }),
    [],
  );

  const stopListening = useCallback(() => {
    unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribersRef.current = [];
  }, []);

  // Đăng nhập xong thì bắt đầu nghe dữ liệu realtime, đăng xuất thì huỷ hết
  useEffect(() => {
    if (!uid) {
      setProfiles([]);
      setStatuses({});
      setSummaries([]);
      setNotifications([]);
      return;
    }
    unsubscribersRef.current = [
      subscribeUsers(setProfiles),
      subscribeStatuses(setStatuses),
      subscribeChatSummaries(uid, setSummaries),
      subscribeNotifications(uid, setNotifications),
      startPresence(uid),
    ];
    return stopListening;
  }, [uid, stopListening]);

  // Thông tin (loại, tên nhóm, thành viên) của từng cuộc trò chuyện trong userChats
  const convIdsKey = summaries
    .map(s => s.id)
    .sort()
    .join(',');
  useEffect(() => {
    if (!convIdsKey) {
      setMetas({});
      return;
    }
    const unsubscribers = convIdsKey
      .split(',')
      .map(id =>
        subscribeConversation(id, meta =>
          setMetas(prev => ({ ...prev, [id]: meta })),
        ),
      );
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [convIdsKey]);

  const logout = useCallback(async () => {
    if (!uid) return;
    // Huỷ lắng nghe trước, nếu không Firebase sẽ báo permission_denied khi mất quyền đọc
    stopListening();
    await firebaseLogout(uid);
  }, [uid, stopListening]);

  const allUsers = useMemo<Contact[]>(
    () =>
      profiles.map(p => ({
        ...p,
        online: !!statuses[p.uid]?.online,
        lastChanged: statuses[p.uid]?.lastChanged,
      })),
    [profiles, statuses],
  );

  const users = useMemo(
    () => allUsers.filter(u => u.uid !== uid),
    [allUsers, uid],
  );

  const account = useMemo<Account | null>(() => {
    if (!authUser) return null;
    const profile = profiles.find(p => p.uid === authUser.uid);
    const email = authUser.email ?? '';
    return {
      uid: authUser.uid,
      email,
      // Vừa đăng ký xong thì hồ sơ trên database có thể chưa về kịp
      name: profile?.name ?? authUser.displayName ?? email,
      avatar: profile?.avatar ?? avatarFor(authUser.uid),
    };
  }, [authUser, profiles]);

  // Chỉ hiện cuộc trò chuyện đã tải được thông tin, mới nhất lên đầu
  const conversations = useMemo<Conversation[]>(
    () =>
      summaries
        .filter(s => metas[s.id])
        .map(s => ({ ...s, meta: metas[s.id] as ConversationMeta }))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [summaries, metas],
  );

  const unreadNotificationCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      initializing,
      account,
      logout,
      users,
      getUser: id => allUsers.find(u => u.uid === id),
      conversations,
      getConversation: id => conversations.find(c => c.id === id),
      notifications,
      unreadNotificationCount,
      markNotificationRead: id => {
        if (uid) markNotificationRead(uid, id).catch(() => {});
      },
      markAllNotificationsRead: () => {
        if (!uid) return;
        const ids = notifications.filter(n => !n.read).map(n => n.id);
        markAllNotificationsRead(uid, ids).catch(() => {});
      },
      darkMode,
      setDarkMode,
      notificationsEnabled,
      setNotificationsEnabled,
      colors: darkMode ? darkColors : lightColors,
    }),
    [
      initializing,
      account,
      logout,
      users,
      allUsers,
      conversations,
      notifications,
      unreadNotificationCount,
      uid,
      darkMode,
      notificationsEnabled,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp phải được dùng bên trong AppProvider');
  return ctx;
}
