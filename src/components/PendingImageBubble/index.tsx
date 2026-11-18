import { RotateCw, X } from 'lucide-react-native';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../../contexts/AppContext';

export type PendingImage = {
  id: string;
  uri: string; // ảnh trên máy, hiện ngay trong lúc tải lên
  progress: number; // 0 -> 1
  error?: string;
};

// Bong bóng tạm khi đang tải ảnh lên Cloudinary: vòng loading + %,
// lỗi thì có nút "Thử lại" và nút huỷ
export default function PendingImageBubble({
  item,
  onRetry,
  onCancel,
}: {
  item: PendingImage;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const { colors } = useApp();
  return (
    <View style={styles.row}>
      <View style={[styles.bubble, { backgroundColor: colors.primary }]}>
        <Image source={{ uri: item.uri }} style={styles.image} />
        <View style={styles.overlay}>
          {item.error ? (
            <>
              <Text style={styles.errorText} numberOfLines={2}>
                Tải ảnh lên thất bại
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={onRetry}
                  style={[styles.retry, { backgroundColor: colors.card }]}
                >
                  <RotateCw size={16} color={colors.primary} />
                  <Text style={[styles.retryText, { color: colors.primary }]}>
                    Thử lại
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onCancel}
                  style={styles.cancel}
                  accessibilityLabel="Huỷ gửi ảnh"
                >
                  <X size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <ActivityIndicator color="#FFFFFF" size="large" />
              <Text style={styles.progress}>
                Đang gửi {Math.round(item.progress * 100)}%
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 3 },
  bubble: { padding: 4, borderRadius: 18, borderBottomRightRadius: 4 },
  image: { width: 200, height: 200, borderRadius: 14 },
  overlay: {
    ...StyleSheet.absoluteFill,
    margin: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
  },
  progress: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  errorText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  retryText: { fontSize: 13, fontWeight: '700' },
  cancel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
