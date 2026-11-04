import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { normalize } from '../commons/utils';
import {
  Avatar,
  ConversationItem,
  ScreenHeader,
  SearchBar,
} from '../components';
import { useApp } from '../contexts/AppContext';
import { RootStackParamList } from '../navigation/types';

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, conversations, getUser, account } = useApp();
  const [query, setQuery] = useState('');

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);
  const q = normalize(query);
  // conversations đã được sắp xếp mới nhất lên đầu (xem chatService)
  const data = conversations.filter(c => {
    const user = getUser(c.userId);
    return (
      !q ||
      normalize(user?.name ?? '').includes(q) ||
      normalize(c.lastMessage).includes(q)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title="Tin nhắn"
        subtitle={
          totalUnread > 0
            ? `Bạn có ${totalUnread} tin nhắn chưa đọc`
            : 'Không có tin nhắn chưa đọc'
        }
        right={account ? <Avatar uri={account.avatar} size={42} /> : null}
      />
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Tìm kiếm cuộc trò chuyện..."
      />
      <FlatList
        data={data}
        keyExtractor={item => item.userId}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => {
          const user = getUser(item.userId);
          if (!user) return null;
          return (
            <ConversationItem
              conversation={item}
              user={user}
              onPress={() =>
                navigation.navigate('Chat', { userId: item.userId })
              }
            />
          );
        }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.subText }]}>
            {q
              ? 'Không tìm thấy cuộc trò chuyện nào'
              : 'Chưa có cuộc trò chuyện nào.\nVào Danh bạ để bắt đầu nhắn tin!'}
          </Text>
        }
      />
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 20 },
  separator: { height: 8 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
