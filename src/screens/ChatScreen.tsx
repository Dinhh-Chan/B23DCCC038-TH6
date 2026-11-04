import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, MapPin, Send } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Message } from '../commons/types';
import { Avatar, MessageBubble } from '../components';
import { useApp } from '../contexts/AppContext';
import { RootStackParamList } from '../navigation/types';
import {
  getChatId,
  markConversationRead,
  sendLocationMessage,
  sendTextMessage,
  subscribeMessages,
} from '../services/chatService';
import {
  getCurrentLocation,
  requestLocationPermission,
} from '../services/locationService';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { colors, account, getUser, conversations } = useApp();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sendingLocation, setSendingLocation] = useState(false);

  const myId = account?.uid ?? '';
  const chatId = getChatId(myId, userId);
  const user = getUser(userId);
  const unread = conversations.find(c => c.userId === userId)?.unread ?? 0;

  // Nghe tin nhắn realtime: mỗi tin mới -> onChildAdded gọi 1 lần -> nối vào cuối danh sách.
  // Rời màn hình thì cleanup huỷ lắng nghe; nếu không, lần mở sau sẽ có 2 listener
  // cùng chạy và mỗi tin bị hiện lặp 2 lần.
  useEffect(() => {
    setMessages([]);
    const unsubscribe = subscribeMessages(chatId, message =>
      setMessages(prev => [...prev, message]),
    );
    return unsubscribe;
  }, [chatId]);

  // Danh sách lật ngược (inverted): phần tử đầu nằm ở đáy màn hình, nên đảo thứ tự
  // để tin mới nhất luôn ở dưới cùng, sát ô nhập
  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);

  // Đang mở cuộc trò chuyện -> có tin mới là đánh dấu đã đọc ngay (số chưa đọc về 0)
  useEffect(() => {
    if (unread > 0 && myId) {
      markConversationRead(myId, userId).catch(() => {});
    }
  }, [unread, myId, userId]);

  if (!account || !user) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const handleSend = () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    sendTextMessage(myId, userId, value).catch(() => {
      setText(value);
      Alert.alert('Gửi thất bại', 'Không gửi được tin nhắn, hãy thử lại.');
    });
  };

  const handleSendLocation = async () => {
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert(
        'Không có quyền truy cập vị trí',
        'Bạn đã từ chối quyền vị trí nên không thể gửi vị trí hiện tại. Hãy cấp quyền trong Cài đặt của máy.',
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    setSendingLocation(true);
    try {
      const { latitude, longitude } = await getCurrentLocation();
      await sendLocationMessage(myId, userId, latitude, longitude);
    } catch {
      Alert.alert(
        'Không lấy được vị trí',
        'Hãy bật định vị (GPS) của thiết bị rồi thử lại.',
      );
    } finally {
      setSendingLocation(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Avatar uri={user.avatar} online={user.online} size={42} />
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {user.name}
          </Text>
          <Text
            style={[
              styles.status,
              { color: user.online ? colors.success : colors.subText },
            ]}
          >
            {user.online ? 'Đang hoạt động' : 'Ngoại tuyến'}
          </Text>
        </View>
      </View>

      <FlatList
        // inverted giữ danh sách luôn ở cuối: có tin mới là hiện ngay tin mới nhất,
        // không cần tự gọi scrollToEnd (dễ bị lệch khi FlatList còn đang render dần)
        inverted
        data={newestFirst}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} mine={item.senderId === myId} />
        )}
        contentContainerStyle={styles.messages}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Avatar uri={user.avatar} size={72} />
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              Hãy gửi lời chào đến {user.name} 👋
            </Text>
          </View>
        }
      />

      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: insets.bottom + 8,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          accessibilityLabel="Gửi vị trí"
          onPress={handleSendLocation}
          disabled={sendingLocation}
          style={[styles.iconButton, { backgroundColor: colors.primaryLight }]}
        >
          {sendingLocation ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MapPin size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.bg, color: colors.text },
          ]}
          value={text}
          onChangeText={setText}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={colors.subText}
          multiline
        />
        <TouchableOpacity
          accessibilityLabel="Gửi tin nhắn"
          onPress={handleSend}
          disabled={!text.trim()}
          style={[
            styles.iconButton,
            { backgroundColor: colors.primary, opacity: text.trim() ? 1 : 0.5 },
          ]}
        >
          <Send size={20} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  status: { fontSize: 12, marginTop: 2 },
  messages: { paddingVertical: 12, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
