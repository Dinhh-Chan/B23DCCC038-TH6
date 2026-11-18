import { ArrowLeft, Info, Search } from 'lucide-react-native';
import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../contexts/AppContext';

type Props = {
  avatar: ReactNode;
  title: string;
  subtitle: string; // "đang soạn tin…" / "Đang hoạt động" / "Hoạt động 5 phút trước"
  highlight?: boolean; // tô màu chính cho dòng phụ (đang soạn tin, đang hoạt động)
  onBack: () => void;
  onSearch: () => void;
  onInfo?: () => void; // chỉ chat nhóm
};

export default function ChatHeader(props: Props) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  return (
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
      <TouchableOpacity
        onPress={props.onBack}
        hitSlop={10}
        accessibilityLabel="Quay lại"
      >
        <ArrowLeft size={24} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.center}
        activeOpacity={props.onInfo ? 0.6 : 1}
        onPress={props.onInfo}
      >
        {props.avatar}
        <View style={styles.texts}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {props.title}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.subtitle,
              { color: props.highlight ? colors.success : colors.subText },
            ]}
          >
            {props.subtitle}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={props.onSearch}
        hitSlop={8}
        accessibilityLabel="Tìm trong cuộc trò chuyện"
      >
        <Search size={22} color={colors.text} />
      </TouchableOpacity>
      {props.onInfo && (
        <TouchableOpacity
          onPress={props.onInfo}
          hitSlop={8}
          accessibilityLabel="Thông tin nhóm"
        >
          <Info size={22} color={colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  texts: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
});
