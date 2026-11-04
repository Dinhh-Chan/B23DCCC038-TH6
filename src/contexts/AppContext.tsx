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
import { AppNotification, NOTIFICATIONS } from '../commons/data';
import { Colors, darkColors, lightColors } from '../commons/theme';
import {
  Account,
  Contact,
  Conversation,
  UserProfile,
  UserStatus,
} from '../commons/types';
import {
  logout as firebaseLogout,
  subscribeAuth,
} from '../services/authService';
import { subscribeConversations } from '../services/chatService';
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
  getUser: (uid: string) => Contact | undefined;
  conversations: Conversation[];

  notifications: AppNotification[];
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] =
    useState<AppNotification[]>(NOTIFICATIONS);
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
      setConversations([]);
      return;
    }
    unsubscribersRef.current = [
      subscribeUsers(setProfiles),
      subscribeStatuses(setStatuses),
      subscribeConversations(uid, setConversations),
      startPresence(uid),
    ];
    return stopListening;
  }, [uid, stopListening]);

  const logout = useCallback(async () => {
    if (!uid) {
      return;
    }
    // Huỷ lắng nghe trước, nếu không Firebase sẽ báo permission_denied khi mất quyền đọc
    stopListening();
    await firebaseLogout(uid);
  }, [uid, stopListening]);

  const users = useMemo<Contact[]>(
    () =>
      profiles
        .filter(p => p.uid !== uid)
        .map(p => ({ ...p, online: !!statuses[p.uid]?.online })),
    [profiles, statuses, uid],
  );

  const account = useMemo<Account | null>(() => {
    if (!authUser) {
      return null;
    }
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

  const value = useMemo<AppContextValue>(
    () => ({
      initializing,
      account,
      logout,
      users,
      getUser: id => users.find(u => u.uid === id),
      conversations,
      notifications,
      markNotificationRead: id =>
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read: true } : n)),
        ),
      markAllNotificationsRead: () =>
        setNotifications(prev => prev.map(n => ({ ...n, read: true }))),
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
      conversations,
      notifications,
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
