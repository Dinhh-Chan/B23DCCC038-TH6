import { Heart, MessageCircle, UserPlus } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { AppNotification } from '../../commons/types';
import { formatRelative } from '../../commons/utils';
import { useApp } from '../../contexts/AppContext';
import Avatar from '../Avatar';
import { styles } from './styles';

type Props = {
  notification: AppNotification;
  avatarUri?: string; // ảnh người gây ra thông báo
  now: number;
  onPress: () => void;
};

const ICONS = {
  message: MessageCircle,
  group_added: UserPlus,
  reaction: Heart,
};

export default function NotificationItem({
  notification,
  avatarUri,
  now,
  onPress,
}: Props) {
  const { colors } = useApp();
  const unread = !notification.read;
  const Icon = ICONS[notification.type] ?? MessageCircle;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: unread ? colors.primaryLight : colors.card,
          borderColor: unread ? colors.primary : colors.border,
        },
      ]}
    >
      <View>
        {avatarUri ? (
          <Avatar uri={avatarUri} size={44} />
        ) : (
          <View style={[styles.icon, { backgroundColor: colors.border }]} />
        )}
        <View
          style={[
            styles.typeIcon,
            {
              backgroundColor: unread ? colors.primary : colors.subText,
              borderColor: colors.card,
            },
          ]}
        >
          <Icon size={11} color={colors.onPrimary} />
        </View>
      </View>
      <View style={styles.body}>
        <Text
          style={[
            styles.content,
            { color: colors.text, fontWeight: unread ? '700' : '400' },
          ]}
          numberOfLines={3}
        >
          {notification.text}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.time, { color: colors.subText }]}>
            {formatRelative(notification.createdAt, now)}
          </Text>
          <Text
            style={[
              styles.state,
              { color: unread ? colors.primary : colors.subText },
            ]}
          >
            {unread ? '• Chưa đọc' : 'Đã đọc'}
          </Text>
        </View>
      </View>
      {unread && (
        <View style={[styles.dot, { backgroundColor: colors.danger }]} />
      )}
    </TouchableOpacity>
  );
}
