import { Users } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../../contexts/AppContext';

// Ảnh đại diện của nhóm: biểu tượng nhóm, chấm xanh nếu có thành viên online
export default function GroupAvatar({
  size = 52,
  online,
}: {
  size?: number;
  online?: boolean;
}) {
  const { colors } = useApp();
  const dot = Math.round(size * 0.28);
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primaryLight,
        },
      ]}
    >
      <Users size={size * 0.48} color={colors.primary} />
      {online && (
        <View
          style={[
            styles.dot,
            {
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              borderColor: colors.card,
              backgroundColor: colors.success,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', right: 0, bottom: 0, borderWidth: 2 },
});
