import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LogOut, Pencil, UserMinus, UserPlus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { memberIds } from '../commons/conversation';
import { ConversationMeta } from '../commons/types';
import { formatLastActive } from '../commons/utils';
import {
  Avatar,
  GroupAvatar,
  SelectableContactItem,
  StackHeader,
} from '../components';
import { useApp } from '../contexts/AppContext';
import { useNow } from '../hooks/useNow';
import { RootStackParamList } from '../navigation/types';
import { subscribeConversation } from '../services/chatService';
import {
  addMembers,
  leaveGroup,
  removeMember,
  renameGroup,
} from '../services/groupService';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupInfo'>;

export default function GroupInfoScreen({ navigation, route }: Props) {
  const { convId } = route.params;
  const { colors, account, users, getUser } = useApp();
  const now = useNow();
  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [toAdd, setToAdd] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const hadMetaRef = useRef(false);

  const myId = account?.uid ?? '';
  const actor = { uid: myId, name: account?.name ?? '' };

  useEffect(
    () =>
      subscribeConversation(convId, value => {
        // Không còn là thành viên (rời nhóm / bị xoá) -> về Home
        if (!value?.members?.[myId]) {
          if (hadMetaRef.current) navigation.popToTop();
          return;
        }
        hadMetaRef.current = true;
        setMeta(value);
      }),
    [convId, myId, navigation],
  );

  if (!meta) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const members = memberIds(meta);
  const isAdmin = meta.createdBy === myId;
  const candidates = users.filter(u => !meta.members[u.uid]);

  const run = async (task: () => Promise<unknown>, error: string) => {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      Alert.alert(error, (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveName = () => {
    const value = newName.trim();
    if (!value || value === meta.name) {
      setEditing(false);
      return;
    }
    run(() => renameGroup(meta, actor, value), 'Không đổi được tên nhóm').then(
      () => setEditing(false),
    );
  };

  const confirmAdd = () => {
    const picked = [...toAdd].map(uid => ({
      uid,
      name: getUser(uid)?.name ?? 'Thành viên',
    }));
    if (picked.length === 0) return;
    run(
      () => addMembers(meta, actor, picked),
      'Không thêm được thành viên',
    ).then(() => {
      setAdding(false);
      setToAdd(new Set());
    });
  };

  const confirmRemove = (uid: string) => {
    const name = getUser(uid)?.name ?? 'Thành viên';
    Alert.alert('Xoá thành viên', `Xoá ${name} khỏi nhóm?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () =>
          run(
            () => removeMember(meta, actor, { uid, name }),
            'Không xoá được thành viên',
          ),
      },
    ]);
  };

  const confirmLeave = () =>
    Alert.alert('Rời nhóm', `Bạn sẽ rời nhóm "${meta.name}".`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Rời nhóm',
        style: 'destructive',
        onPress: () =>
          run(() => leaveGroup(meta, actor), 'Không rời được nhóm'),
      },
    ]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StackHeader title="Thông tin nhóm" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[styles.card, styles.top, { backgroundColor: colors.card }]}
        >
          <GroupAvatar size={80} />
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                autoFocus
                value={newName}
                onChangeText={setNewName}
                maxLength={50}
                onSubmitEditing={saveName}
                style={[
                  styles.nameInput,
                  { borderColor: colors.primary, color: colors.text },
                ]}
              />
              <TouchableOpacity
                onPress={saveName}
                style={[
                  styles.smallButton,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[styles.smallButtonText, { color: colors.onPrimary }]}
                >
                  Lưu
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.nameRow}
              onPress={() => {
                setNewName(meta.name ?? '');
                setEditing(true);
              }}
            >
              <Text style={[styles.groupName, { color: colors.text }]}>
                {meta.name}
              </Text>
              <Pencil size={16} color={colors.subText} />
            </TouchableOpacity>
          )}
          <Text style={[styles.sub, { color: colors.subText }]}>
            {members.length} thành viên
          </Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={[styles.section, { color: colors.subText }]}>
            THÀNH VIÊN
          </Text>
          {!adding && candidates.length > 0 && (
            <TouchableOpacity
              onPress={() => setAdding(true)}
              style={[
                styles.addButton,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <UserPlus size={15} color={colors.primary} />
              <Text style={[styles.addText, { color: colors.primary }]}>
                Thêm thành viên
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {adding && (
          <View style={styles.addBox}>
            {candidates.map(u => (
              <SelectableContactItem
                key={u.uid}
                user={u}
                selected={toAdd.has(u.uid)}
                onToggle={() =>
                  setToAdd(prev => {
                    const next = new Set(prev);
                    if (next.has(u.uid)) next.delete(u.uid);
                    else next.add(u.uid);
                    return next;
                  })
                }
              />
            ))}
            <View style={styles.addActions}>
              <TouchableOpacity
                onPress={() => {
                  setAdding(false);
                  setToAdd(new Set());
                }}
                style={[styles.smallButton, { backgroundColor: colors.border }]}
              >
                <Text style={[styles.smallButtonText, { color: colors.text }]}>
                  Huỷ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={toAdd.size === 0}
                onPress={confirmAdd}
                style={[
                  styles.smallButton,
                  { backgroundColor: colors.primary },
                  toAdd.size === 0 && styles.disabled,
                ]}
              >
                <Text
                  style={[styles.smallButtonText, { color: colors.onPrimary }]}
                >
                  Thêm ({toAdd.size})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {members.map(uid => {
            const user = getUser(uid);
            const isMe = uid === myId;
            return (
              <View
                key={uid}
                style={[styles.member, { borderBottomColor: colors.border }]}
              >
                <Avatar
                  uri={user?.avatar ?? ''}
                  online={user?.online}
                  size={42}
                />
                <View style={styles.memberTexts}>
                  <Text style={[styles.memberName, { color: colors.text }]}>
                    {user?.name ?? 'Thành viên'}
                    {isMe ? ' (Bạn)' : ''}
                  </Text>
                  <Text
                    style={[
                      styles.memberStatus,
                      { color: user?.online ? colors.success : colors.subText },
                    ]}
                  >
                    {meta.createdBy === uid ? 'Trưởng nhóm · ' : ''}
                    {user?.online
                      ? 'Đang hoạt động'
                      : formatLastActive(user?.lastChanged, now)}
                  </Text>
                </View>
                {isAdmin && !isMe && (
                  <TouchableOpacity
                    onPress={() => confirmRemove(uid)}
                    hitSlop={8}
                    accessibilityLabel={`Xoá ${user?.name ?? ''} khỏi nhóm`}
                  >
                    <UserMinus size={20} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          disabled={busy}
          onPress={confirmLeave}
          style={[styles.leave, { backgroundColor: colors.danger }]}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <LogOut size={20} color="#FFFFFF" />
              <Text style={styles.leaveText}>Rời nhóm</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 18, paddingHorizontal: 14 },
  top: { alignItems: 'center', paddingVertical: 22, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  groupName: { fontSize: 20, fontWeight: '800' },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    alignSelf: 'stretch',
  },
  nameInput: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  sub: { fontSize: 13 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 8,
  },
  section: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addText: { fontSize: 13, fontWeight: '700' },
  addBox: { gap: 8, marginBottom: 12, marginHorizontal: -16 },
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
  },
  smallButton: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: { fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberTexts: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberStatus: { fontSize: 12, marginTop: 2 },
  leave: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    marginTop: 24,
  },
  leaveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
