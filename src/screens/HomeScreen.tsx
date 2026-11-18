import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UsersRound } from 'lucide-react-native';
import { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getPeerId, memberIds } from '../commons/conversation';
import { Conversation } from '../commons/types';
import { formatListTime, normalize } from '../commons/utils';
import {
  Avatar,
  ConversationItem,
  GroupAvatar,
  ScreenHeader,
  SearchBar,
} from '../components';
import { useApp } from '../contexts/AppContext';
import { RootStackParamList } from '../navigation/types';
import { SYSTEM_SENDER } from '../services/chatService';

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, conversations, getUser, account } = useApp();
  const [query, setQuery] = useState('');
  const myId = account?.uid ?? '';

  // Tên, ảnh và dòng tin cuối của một cuộc trò chuyện (1-1 hoặc nhóm)
  const describe = (conv: Conversation) => {
    const isGroup = conv.meta?.type === 'group';
    const peer = isGroup ? undefined : getUser(getPeerId(conv.id, myId));
    const title = isGroup ? conv.meta?.name ?? 'Nhóm' : peer?.name ?? '...';
    let prefix = '';
    if (conv.lastSenderId === myId) prefix = 'Bạn: ';
    else if (isGroup && conv.lastSenderId !== SYSTEM_SENDER) {
      const sender = getUser(conv.lastSenderId)?.name;
      if (sender) prefix = `${sender}: `;
    }
    const avatar = isGroup ? (
      <GroupAvatar
        online={memberIds(conv.meta).some(
          uid => uid !== myId && getUser(uid)?.online,
        )}
      />
    ) : (
      <Avatar uri={peer?.avatar ?? ''} online={peer?.online} />
    );
    return { title, preview: prefix + conv.lastMessage, avatar };
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);
  const q = normalize(query);
  const data = conversations
    .map(conv => ({ conv, ...describe(conv) }))
    .filter(
      item =>
        !q ||
        normalize(item.title).includes(q) ||
        normalize(item.conv.lastMessage).includes(q),
    );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title="Tin nhắn"
        subtitle={
          totalUnread > 0
            ? `Bạn có ${totalUnread} tin nhắn chưa đọc`
            : 'Không có tin nhắn chưa đọc'
        }
        right={
          <View style={styles.headerRight}>
            <TouchableOpacity
              accessibilityLabel="Tạo nhóm"
              onPress={() => navigation.navigate('CreateGroup')}
              style={[
                styles.newGroup,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <UsersRound size={20} color={colors.primary} />
            </TouchableOpacity>
            {account ? <Avatar uri={account.avatar} size={42} /> : null}
          </View>
        }
      />
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Tìm kiếm cuộc trò chuyện..."
      />
      <FlatList
        data={data}
        keyExtractor={item => item.conv.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <ConversationItem
            title={item.title}
            avatar={item.avatar}
            preview={item.preview}
            time={formatListTime(item.conv.updatedAt)}
            unread={item.conv.unread}
            onPress={() =>
              navigation.navigate('Chat', { convId: item.conv.id })
            }
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.subText }]}>
            {q
              ? 'Không tìm thấy cuộc trò chuyện nào'
              : 'Chưa có cuộc trò chuyện nào.\nVào Danh bạ để nhắn tin hoặc bấm nút nhóm để tạo nhóm!'}
          </Text>
        }
      />
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  newGroup: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingBottom: 20 },
  separator: { height: 8 },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    marginHorizontal: 24,
    fontSize: 14,
    lineHeight: 20,
  },
});
