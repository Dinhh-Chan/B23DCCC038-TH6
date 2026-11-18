import Clipboard from '@react-native-clipboard/clipboard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  MapPin,
  Send,
  X,
} from 'lucide-react-native';
import {
  ComponentRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
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
import {
  getPeerId,
  isGroupId,
  memberIds,
  messagePreview,
} from '../commons/conversation';
import { ConversationMeta, Message } from '../commons/types';
import { formatClock, formatLastActive, normalize } from '../commons/utils';
import {
  Avatar,
  ChatHeader,
  GroupAvatar,
  ImageViewer,
  MessageActionSheet,
  MessageBubble,
  PendingImage,
  PendingImageBubble,
} from '../components';
import { useApp } from '../contexts/AppContext';
import { useMessages } from '../hooks/useMessages';
import { useNow } from '../hooks/useNow';
import { RootStackParamList } from '../navigation/types';
import {
  ensureDirectConversation,
  markConversationRead,
  MessageContent,
  recallMessage,
  sendMessage,
  setTyping,
  setViewing,
  subscribeConversation,
  subscribeReadStatus,
  subscribeTyping,
  subscribeViewing,
  toggleReaction,
} from '../services/chatService';
import {
  getCurrentLocation,
  requestLocationPermission,
} from '../services/locationService';
import {
  CameraPermissionError,
  pickImage,
  PickSource,
  uploadImage,
} from '../services/uploadService';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const TYPING_TIMEOUT = 3000; // tự tắt "đang soạn tin" sau 3 giây không gõ

export default function ChatScreen({ navigation, route }: Props) {
  const { convId } = route.params;
  const { colors, account, getUser, getConversation } = useApp();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const myId = account?.uid ?? '';
  const myName = account?.name ?? '';
  const isGroup = isGroupId(convId);

  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [ready, setReady] = useState(false);
  const [typingFlags, setTypingFlags] = useState<Record<string, boolean>>({});
  const [viewers, setViewers] = useState<Record<string, boolean>>({});
  const [readStatus, setReadStatus] = useState<Record<string, number>>({});
  const [appActive, setAppActive] = useState(
    AppState.currentState === 'active',
  );
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [selected, setSelected] = useState<Message | null>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);

  const listRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const typingRef = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // Giá trị mới nhất cho các hàm async (tải ảnh lên xong mới gửi tin)
  const metaRef = useRef(meta);
  const viewersRef = useRef(viewers);
  metaRef.current = meta;
  viewersRef.current = viewers;

  // 1-1: tạo conversations/{uidA_uidB} nếu chưa có, sau đó nghe thông tin cuộc trò chuyện
  useEffect(() => {
    if (!myId) return;
    let alive = true;
    let unsubscribe = () => {};
    const start = async () => {
      if (!isGroup) {
        await ensureDirectConversation(myId, getPeerId(convId, myId)).catch(
          error => console.warn('Không tạo được cuộc trò chuyện', error),
        );
      }
      if (!alive) return;
      let wasMember = false;
      unsubscribe = subscribeConversation(convId, value => {
        const member = !!value?.members?.[myId];
        if (wasMember && !member) {
          // Bị xoá khỏi nhóm -> mất quyền đọc. Nếu đang ở màn Thông tin nhóm
          // thì màn đó tự quay về Home
          if (navigation.isFocused()) navigation.goBack();
          return;
        }
        wasMember = member;
        setMeta(value);
        setReady(member);
      });
    };
    start();
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [convId, isGroup, myId, navigation]);

  const { messages, loadingInitial, loadingMore, hasMore, loadMore } =
    useMessages(convId, ready);

  // Đang gõ / đang xem / đã đọc của các thành viên
  useEffect(() => {
    if (!ready) return;
    const offs = [
      subscribeTyping(convId, setTypingFlags),
      subscribeViewing(convId, setViewers),
      subscribeReadStatus(convId, setReadStatus),
    ];
    return () => offs.forEach(off => off());
  }, [convId, ready]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state =>
      setAppActive(state === 'active'),
    );
    return () => sub.remove();
  }, []);

  // Đánh dấu "đang xem" khi màn hình đang mở và app ở foreground
  useEffect(() => {
    if (!ready || !appActive) return;
    setViewing(convId, myId, true).catch(() => {});
    return () => {
      setViewing(convId, myId, false).catch(() => {});
    };
  }, [convId, myId, ready, appActive]);

  // Có tin mới khi đang xem -> cập nhật thời điểm đọc + số chưa đọc về 0
  const newestId = messages[messages.length - 1]?.id;
  const unread = getConversation(convId)?.unread ?? 0;
  useEffect(() => {
    if (!ready || !appActive) return;
    markConversationRead(convId, myId).catch(() => {});
  }, [convId, myId, ready, appActive, newestId, unread]);

  // ----- Trạng thái đang gõ -----
  const stopTyping = useCallback(() => {
    clearTimeout(typingTimer.current);
    if (typingRef.current) {
      typingRef.current = false;
      setTyping(convId, myId, false).catch(() => {});
    }
  }, [convId, myId]);

  // Rời màn hình hoặc app xuống nền -> tắt "đang soạn tin"
  useEffect(() => stopTyping, [stopTyping]);
  useEffect(() => {
    if (!appActive) stopTyping();
  }, [appActive, stopTyping]);

  const handleChangeText = (value: string) => {
    setText(value);
    if (!ready) return;
    if (!value.trim()) {
      stopTyping();
      return;
    }
    if (!typingRef.current) {
      typingRef.current = true;
      setTyping(convId, myId, true).catch(() => {});
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, TYPING_TIMEOUT);
  };

  // ----- Gửi tin -----
  const send = useCallback(
    (content: MessageContent, reply?: Message | null) => {
      const current = metaRef.current;
      if (!current) return Promise.reject(new Error('Chưa sẵn sàng'));
      return sendMessage({
        meta: current,
        senderId: myId,
        senderName: myName,
        content,
        viewers: viewersRef.current,
        replyTo: reply
          ? {
              id: reply.id,
              senderId: reply.senderId,
              preview: messagePreview(reply),
            }
          : undefined,
      });
    },
    [myId, myName],
  );

  const handleSend = () => {
    const value = text.trim();
    if (!value) return; // không gửi tin rỗng
    const reply = replyTo;
    // clear() xoá thẳng ô nhập phía native: chỉ setText('') thì bàn phím còn giữ
    // phần chữ đang soạn dở (gạch chân) và chữ cũ bị dồn vào tin tiếp theo
    inputRef.current?.clear();
    setText('');
    setReplyTo(null);
    stopTyping();
    send({ type: 'text', text: value }, reply).catch(() => {
      setText(value);
      Alert.alert('Gửi thất bại', 'Không gửi được tin nhắn, hãy thử lại.');
    });
  };

  const handleSendLocation = async () => {
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert(
        'Không có quyền truy cập vị trí',
        'Bạn đã từ chối quyền vị trí nên không thể gửi vị trí hiện tại.',
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
      await send({ type: 'location', lat: latitude, lng: longitude });
    } catch {
      Alert.alert('Không lấy được vị trí', 'Hãy bật định vị rồi thử lại.');
    } finally {
      setSendingLocation(false);
    }
  };

  // ----- Gửi ảnh: chọn -> hiện bong bóng tạm -> tải lên Cloudinary -> gửi URL -----
  const upload = useCallback(
    async (item: PendingImage) => {
      const patch = (changes: Partial<PendingImage>) =>
        setPending(list =>
          list.map(p => (p.id === item.id ? { ...p, ...changes } : p)),
        );
      patch({ error: undefined, progress: 0 });
      try {
        const imageUrl = await uploadImage(item.uri, progress =>
          patch({ progress }),
        );
        // Tải lên xong là bỏ bong bóng tạm: Firebase hiện tin ngay trong danh sách
        // và tự đồng bộ lên server khi có mạng
        setPending(list => list.filter(p => p.id !== item.id));
        send({ type: 'image', imageUrl }).catch(() =>
          Alert.alert('Gửi thất bại', 'Không gửi được tin ảnh, hãy thử lại.'),
        );
      } catch (error) {
        patch({ error: (error as Error).message || 'Lỗi' });
      }
    },
    [send],
  );

  const pickAndSend = async (source: PickSource) => {
    try {
      const uri = await pickImage(source);
      if (!uri) return;
      const item: PendingImage = { id: `${Date.now()}`, uri, progress: 0 };
      setPending(list => [...list, item]);
      upload(item);
    } catch (error) {
      if (error instanceof CameraPermissionError) {
        Alert.alert(
          'Không có quyền camera',
          'Bạn đã từ chối quyền camera nên không thể chụp ảnh. Hãy cấp quyền trong Cài đặt.',
          [
            { text: 'Đóng', style: 'cancel' },
            { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
          ],
        );
      } else {
        Alert.alert('Không mở được ảnh', (error as Error).message);
      }
    }
  };

  const handlePressCamera = () =>
    Alert.alert('Gửi ảnh', 'Chọn nguồn ảnh', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Thư viện', onPress: () => pickAndSend('library') },
      { text: 'Chụp ảnh', onPress: () => pickAndSend('camera') },
    ]);

  // ----- Thu hồi / cảm xúc -----
  const handleRecall = (message: Message) =>
    Alert.alert('Thu hồi tin nhắn', 'Tin nhắn sẽ bị thu hồi với mọi người.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Thu hồi',
        style: 'destructive',
        onPress: () => {
          if (!meta) return;
          const isLast = getConversation(convId)?.lastMessageId === message.id;
          recallMessage(meta, message, isLast).catch(() =>
            Alert.alert('Lỗi', 'Không thu hồi được tin nhắn.'),
          );
        },
      },
    ]);

  const handleReact = (message: Message, emoji: string) => {
    if (!meta) return;
    toggleReaction({ meta, message, myUid: myId, myName, emoji }).catch(() =>
      Alert.alert('Lỗi', 'Không thả được cảm xúc.'),
    );
  };

  // ----- Danh sách: inverted, tin mới nhất ở dưới -----
  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);
  const newestFirstRef = useRef(newestFirst);
  newestFirstRef.current = newestFirst;
  const byId = useMemo(
    () => new Map(messages.map(m => [m.id, m] as const)),
    [messages],
  );

  // Cuộn tới một tin (trích dẫn / tìm kiếm). Chưa tải tới thì tải thêm trang cũ
  const jumpTo = useCallback(
    async (id: string) => {
      let index = newestFirstRef.current.findIndex(m => m.id === id);
      for (let i = 0; index < 0 && i < 10; i++) {
        if (!(await loadMore())) break;
        await new Promise<void>(resolve => setTimeout(resolve, 80));
        index = newestFirstRef.current.findIndex(m => m.id === id);
      }
      if (index < 0) {
        Alert.alert('Không tìm thấy', 'Tin nhắn gốc không còn tồn tại.');
        return;
      }
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
      setHighlightId(id);
      setTimeout(() => setHighlightId(null), 1800);
    },
    [loadMore],
  );

  // ----- Tìm kiếm trong cuộc trò chuyện (trên các tin đã tải) -----
  const matches = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return newestFirst
      .filter(m => m.type === 'text' && !m.recalled)
      .filter(m => normalize(m.text ?? '').includes(q))
      .map(m => m.id);
  }, [newestFirst, query]);

  useEffect(() => {
    setMatchIndex(0);
    if (matches[0]) jumpTo(matches[0]);
    // Chỉ nhảy tới kết quả đầu khi đổi từ khoá
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const gotoMatch = (step: number) => {
    if (matches.length === 0) return;
    const next = (matchIndex + step + matches.length) % matches.length;
    setMatchIndex(next);
    jumpTo(matches[next]);
  };

  // ----- Hiển thị -----
  const members = memberIds(meta ?? undefined);
  const peer = isGroup ? undefined : getUser(getPeerId(convId, myId));
  const nameOf = (uid: string) =>
    uid === myId ? 'Bạn' : getUser(uid)?.name ?? 'Thành viên';

  const typers = Object.keys(typingFlags).filter(
    uid => uid !== myId && meta?.members?.[uid],
  );
  let subtitle: string;
  let highlight = false;
  if (typers.length > 0) {
    subtitle = isGroup
      ? `${typers.map(nameOf).join(', ')} đang soạn tin…`
      : 'đang soạn tin…';
    highlight = true;
  } else if (isGroup) {
    const online = members.filter(uid =>
      uid === myId ? true : getUser(uid)?.online,
    ).length;
    subtitle = `${members.length} thành viên · ${online} đang online`;
  } else if (peer?.online) {
    subtitle = 'Đang hoạt động';
    highlight = true;
  } else {
    subtitle = formatLastActive(peer?.lastChanged, now);
  }

  // "Đã gửi" / "Đã xem" dưới tin cuối cùng (chưa thu hồi) của mình
  const myLast = useMemo(
    () =>
      [...messages]
        .reverse()
        .find(m => m.senderId === myId && m.type !== 'system' && !m.recalled),
    [messages, myId],
  );
  let seenText: string | undefined;
  if (myLast) {
    const others = members.filter(uid => uid !== myId);
    const seenBy = others.filter(
      uid => (readStatus[uid] ?? 0) >= myLast.createdAt,
    );
    if (seenBy.length === 0) seenText = 'Đã gửi';
    else if (!isGroup)
      seenText = `Đã xem lúc ${formatClock(readStatus[seenBy[0]])}`;
    else if (seenBy.length === others.length) seenText = 'Đã xem bởi tất cả';
    else seenText = `Đã xem bởi ${seenBy.map(nameOf).join(', ')}`;
  }

  if (!account || !meta || (!isGroup && !peer)) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const title = isGroup ? meta.name ?? 'Nhóm' : peer?.name ?? '';
  const anyOnline = members.some(uid => uid !== myId && getUser(uid)?.online);

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const mine = item.senderId === myId;
    const older = newestFirst[index + 1];
    // Nhóm: tên người gửi ở tin đầu tiên của mỗi chuỗi tin liên tiếp
    const showName =
      isGroup &&
      !mine &&
      item.type !== 'system' &&
      (!older || older.senderId !== item.senderId || older.type === 'system');
    const quoted = item.replyTo ? byId.get(item.replyTo.id) : undefined;
    return (
      <MessageBubble
        message={item}
        mine={mine}
        senderName={showName ? nameOf(item.senderId) : undefined}
        replyAuthor={item.replyTo ? nameOf(item.replyTo.senderId) : undefined}
        replyRecalled={quoted?.recalled}
        status={item.id === myLast?.id ? seenText : undefined}
        highlighted={item.id === highlightId}
        onLongPress={() => setSelected(item)}
        onPressImage={setViewerUri}
        onPressReply={() => item.replyTo && jumpTo(item.replyTo.id)}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ChatHeader
        avatar={
          isGroup ? (
            <GroupAvatar size={42} online={anyOnline} />
          ) : (
            <Avatar uri={peer?.avatar ?? ''} online={peer?.online} size={42} />
          )
        }
        title={title}
        subtitle={subtitle}
        highlight={highlight}
        onBack={() => navigation.goBack()}
        onSearch={() => {
          setSearchOpen(open => !open);
          setQuery('');
        }}
        onInfo={
          isGroup
            ? () => navigation.navigate('GroupInfo', { convId })
            : undefined
        }
      />

      {searchOpen && (
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm trong cuộc trò chuyện..."
            placeholderTextColor={colors.subText}
            style={[
              styles.searchInput,
              { backgroundColor: colors.bg, color: colors.text },
            ]}
          />
          <Text style={[styles.searchCount, { color: colors.subText }]}>
            {matches.length ? `${matchIndex + 1}/${matches.length}` : '0/0'}
          </Text>
          <TouchableOpacity onPress={() => gotoMatch(1)} hitSlop={6}>
            <ChevronUp size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => gotoMatch(-1)} hitSlop={6}>
            <ChevronDown size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}
      {searchOpen && !!query && hasMore && (
        <TouchableOpacity
          onPress={loadMore}
          style={[styles.searchMore, { backgroundColor: colors.primaryLight }]}
        >
          <Text style={[styles.searchMoreText, { color: colors.primary }]}>
            {loadingMore ? 'Đang tải...' : 'Tìm thêm trong tin nhắn cũ hơn'}
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={listRef}
        // inverted: tin mới nhất ở dưới, thêm tin cũ phía trên không làm nhảy danh sách
        inverted
        data={newestFirst}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messages}
        // Kéo lên đầu danh sách -> tải thêm 20 tin cũ hơn
        onEndReached={() => {
          if (hasMore) loadMore();
        }}
        onEndReachedThreshold={0.2}
        onScrollToIndexFailed={info => {
          listRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: false,
          });
          setTimeout(
            () =>
              listRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.5,
              }),
            250,
          );
        }}
        ListHeaderComponent={
          // inverted: header nằm ở đáy -> bong bóng ảnh đang tải lên
          <>
            {pending.map(item => (
              <PendingImageBubble
                key={item.id}
                item={item}
                onRetry={() => upload(item)}
                onCancel={() =>
                  setPending(list => list.filter(p => p.id !== item.id))
                }
              />
            ))}
          </>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.primary} style={styles.more} />
          ) : undefined
        }
        ListEmptyComponent={
          loadingInitial ? (
            <ActivityIndicator color={colors.primary} style={styles.more} />
          ) : (
            <View style={styles.empty}>
              {isGroup ? (
                <GroupAvatar size={72} />
              ) : (
                <Avatar uri={peer?.avatar ?? ''} size={72} />
              )}
              <Text style={[styles.emptyText, { color: colors.subText }]}>
                Hãy gửi lời chào đến {title} 👋
              </Text>
            </View>
          )
        }
      />

      {replyTo && (
        <View
          style={[
            styles.replyBar,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          <View
            style={[styles.replyLine, { backgroundColor: colors.primary }]}
          />
          <View style={styles.replyTexts}>
            <Text style={[styles.replyTitle, { color: colors.primary }]}>
              Đang trả lời {nameOf(replyTo.senderId)}
            </Text>
            <Text
              style={[styles.replyPreview, { color: colors.subText }]}
              numberOfLines={1}
            >
              {messagePreview(replyTo)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setReplyTo(null)}
            hitSlop={8}
            accessibilityLabel="Huỷ trả lời"
          >
            <X size={20} color={colors.subText} />
          </TouchableOpacity>
        </View>
      )}

      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: insets.bottom + 8,
            backgroundColor: colors.card,
            borderTopColor: replyTo ? 'transparent' : colors.border,
          },
        ]}
      >
        <TouchableOpacity
          accessibilityLabel="Gửi ảnh"
          onPress={handlePressCamera}
          style={[styles.iconButton, { backgroundColor: colors.primaryLight }]}
        >
          <Camera size={20} color={colors.primary} />
        </TouchableOpacity>
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
          ref={inputRef}
          style={[
            styles.input,
            { backgroundColor: colors.bg, color: colors.text },
          ]}
          value={text}
          onChangeText={handleChangeText}
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
            { backgroundColor: colors.primary },
            !text.trim() && styles.disabled,
          ]}
        >
          <Send size={20} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <MessageActionSheet
        visible={!!selected}
        myReaction={selected?.reactions?.[myId]}
        canCopy={selected?.type === 'text'}
        canRecall={selected?.senderId === myId}
        onClose={() => setSelected(null)}
        onReact={emoji => selected && handleReact(selected, emoji)}
        onReply={() => {
          setReplyTo(selected);
          inputRef.current?.focus();
        }}
        onCopy={() => selected?.text && Clipboard.setString(selected.text)}
        onRecall={() => selected && handleRecall(selected)}
      />
      <ImageViewer uri={viewerUri} onClose={() => setViewerUri(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messages: { paddingVertical: 12, flexGrow: 1 },
  more: { marginVertical: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  searchCount: { fontSize: 12, minWidth: 34, textAlign: 'center' },
  searchMore: { paddingVertical: 8, alignItems: 'center' },
  searchMoreText: { fontSize: 13, fontWeight: '600' },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyLine: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  replyTexts: { flex: 1 },
  replyTitle: { fontSize: 12, fontWeight: '700' },
  replyPreview: { fontSize: 13, marginTop: 1 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 10,
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
  disabled: { opacity: 0.5 },
});
