import { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { styles } from './styles';

type Props = {
  title: string;
  avatar: ReactNode;
  preview: string; // dòng tin cuối: "Bạn: ...", "📷 Hình ảnh", "📍 Vị trí"...
  time: string;
  unread: number;
  onPress: () => void;
};

export default function ConversationItem(props: Props) {
  const { colors } = useApp();
  const hasUnread = props.unread > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={props.onPress}
      accessibilityLabel={`Cuộc trò chuyện ${props.title}`}
      style={[styles.container, { backgroundColor: colors.card }]}
    >
      {props.avatar}
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {props.title}
          </Text>
          <Text
            style={[
              styles.time,
              { color: hasUnread ? colors.primary : colors.subText },
            ]}
          >
            {props.time}
          </Text>
        </View>
        <View style={styles.row}>
          <Text
            numberOfLines={1}
            style={[
              styles.preview,
              hasUnread
                ? { color: colors.text, fontWeight: '600' }
                : { color: colors.subText },
            ]}
          >
            {props.preview}
          </Text>
          {hasUnread && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: colors.onPrimary }]}>
                {props.unread > 99 ? '99+' : props.unread}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
