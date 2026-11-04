import { MessageCircle } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { Contact } from '../../commons/types';
import { useApp } from '../../contexts/AppContext';
import Avatar from '../Avatar';
import { styles } from './styles';

type Props = {
  user: Contact;
  onPress: () => void;
};

export default function ContactItem({ user, onPress }: Props) {
  const { colors } = useApp();
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.container, { backgroundColor: colors.card }]}
    >
      <Avatar uri={user.avatar} online={user.online} size={48} />
      <View style={styles.body}>
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
      <View style={[styles.action, { backgroundColor: colors.primaryLight }]}>
        <MessageCircle size={18} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}
