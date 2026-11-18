import { Check } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Contact } from '../../commons/types';
import { useApp } from '../../contexts/AppContext';
import Avatar from '../Avatar';

// Một dòng danh bạ có checkbox (màn Tạo nhóm / Thêm thành viên)
export default function SelectableContactItem({
  user,
  selected,
  onToggle,
}: {
  user: Contact;
  selected: boolean;
  onToggle: () => void;
}) {
  const { colors } = useApp();
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={user.name}
      style={[styles.row, { backgroundColor: colors.card }]}
    >
      <Avatar uri={user.avatar} online={user.online} size={44} />
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {user.name}
        </Text>
        <Text
          style={[styles.email, { color: colors.subText }]}
          numberOfLines={1}
        >
          {user.email}
        </Text>
      </View>
      <View
        style={[
          styles.box,
          selected
            ? { backgroundColor: colors.primary, borderColor: colors.primary }
            : { borderColor: colors.offline },
        ]}
      >
        {selected && (
          <Check size={16} color={colors.onPrimary} strokeWidth={3} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 16,
  },
  body: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700' },
  email: { fontSize: 12 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
