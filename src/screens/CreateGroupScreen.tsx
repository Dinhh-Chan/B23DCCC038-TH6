import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normalize } from '../commons/utils';
import { SearchBar, SelectableContactItem, StackHeader } from '../components';
import { useApp } from '../contexts/AppContext';
import { RootStackParamList } from '../navigation/types';
import { createGroup } from '../services/groupService';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateGroup'>;

const MIN_MEMBERS = 2; // tối thiểu 2 người ngoài bản thân

export default function CreateGroupScreen({ navigation }: Props) {
  const { colors, users, account } = useApp();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const q = normalize(query);
  const data = users
    .filter(u => !q || normalize(u.name).includes(q) || u.email.includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  const toggle = (uid: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });

  const canCreate = name.trim().length > 0 && selected.size >= MIN_MEMBERS;
  const hint = !name.trim()
    ? 'Nhập tên nhóm'
    : selected.size < MIN_MEMBERS
    ? `Chọn thêm ${
        MIN_MEMBERS - selected.size
      } thành viên (tối thiểu ${MIN_MEMBERS})`
    : `Đã chọn ${selected.size} thành viên`;

  const handleCreate = async () => {
    if (!canCreate || !account) return;
    setCreating(true);
    try {
      const convId = await createGroup(
        { uid: account.uid, name: account.name },
        name.trim(),
        [...selected],
      );
      navigation.replace('Chat', { convId });
    } catch (error) {
      setCreating(false);
      Alert.alert('Không tạo được nhóm', (error as Error).message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StackHeader title="Tạo nhóm" onBack={() => navigation.goBack()} />
      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.text }]}>Tên nhóm</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ví dụ: Nhóm bài tập Mobile"
          placeholderTextColor={colors.subText}
          maxLength={50}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />
        <Text style={[styles.label, { color: colors.text }]}>
          Thành viên ({selected.size} đã chọn)
        </Text>
      </View>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Tìm trong danh bạ..."
      />
      <FlatList
        data={data}
        keyExtractor={item => item.uid}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <SelectableContactItem
            user={item}
            selected={selected.has(item.uid)}
            onToggle={() => toggle(item.uid)}
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.subText }]}>
            Không tìm thấy liên hệ nào
          </Text>
        }
      />
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.hint, { color: colors.subText }]}>{hint}</Text>
        <TouchableOpacity
          disabled={!canCreate || creating}
          onPress={handleCreate}
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            !canCreate && styles.disabled,
          ]}
        >
          {creating ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
              Tạo nhóm
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { paddingHorizontal: 16, paddingTop: 16 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 18,
  },
  list: { paddingBottom: 20 },
  separator: { height: 8 },
  empty: { textAlign: 'center', marginTop: 30, fontSize: 14 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hint: { fontSize: 13, textAlign: 'center', marginBottom: 8 },
  button: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
