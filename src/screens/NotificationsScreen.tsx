import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCheck } from 'lucide-react-native';
import { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppNotification } from '../commons/types';
import { NotificationItem, ScreenHeader } from '../components';
import { useApp } from '../contexts/AppContext';
import { useNow } from '../hooks/useNow';
import { RootStackParamList } from '../navigation/types';

type Filter = 'all' | 'unread' | 'read';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'unread', label: 'Chưa đọc' },
  { key: 'read', label: 'Đã đọc' },
];

export default function NotificationsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    colors,
    notifications,
    unreadNotificationCount,
    getUser,
    markNotificationRead,
    markAllNotificationsRead,
  } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const now = useNow();

  const data = notifications.filter(n =>
    filter === 'all' ? true : filter === 'unread' ? !n.read : n.read,
  );

  // Nhấn thông báo: đánh dấu đã đọc rồi mở đúng cuộc trò chuyện
  const open = (n: AppNotification) => {
    if (!n.read) markNotificationRead(n.id);
    navigation.navigate('Chat', { convId: n.convId });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title="Thông báo"
        subtitle={
          unreadNotificationCount > 0
            ? `${unreadNotificationCount} thông báo chưa đọc`
            : 'Bạn đã đọc tất cả thông báo'
        }
      />

      <View style={styles.filters}>
        {FILTERS.map(f => {
          const active = f.key === filter;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: active ? colors.onPrimary : colors.subText },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        disabled={unreadNotificationCount === 0}
        onPress={markAllNotificationsRead}
        style={[
          styles.markAll,
          { backgroundColor: colors.primaryLight },
          unreadNotificationCount === 0 && styles.disabled,
        ]}
      >
        <CheckCheck size={16} color={colors.primary} />
        <Text style={[styles.markAllText, { color: colors.primary }]}>
          Đánh dấu tất cả đã đọc
        </Text>
      </TouchableOpacity>

      <FlatList
        data={data}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            avatarUri={getUser(item.fromUid)?.avatar}
            now={now}
            onPress={() => open(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.subText }]}>
            Không có thông báo
          </Text>
        }
      />
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 13, fontWeight: '600' },
  markAll: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  markAllText: { fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  list: { paddingBottom: 20 },
  separator: { height: 8 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
