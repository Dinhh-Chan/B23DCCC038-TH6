import { X } from 'lucide-react-native';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

// Xem ảnh toàn màn hình, chạm vào ảnh hoặc nút X để đóng
export default function ImageViewer({
  uri,
  onClose,
}: {
  uri: string | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  return (
    <Modal
      visible={!!uri}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => setLoading(true)}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {!!uri && (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            onLoadEnd={() => setLoading(false)}
          />
        )}
        {loading && (
          <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
        )}
      </Pressable>
      <TouchableOpacity
        accessibilityLabel="Đóng ảnh"
        onPress={onClose}
        style={[styles.close, { top: insets.top + 12 }]}
        hitSlop={12}
      >
        <X size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  spinner: { position: 'absolute' },
  close: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
