import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StackHeader } from '../components';
import { useApp } from '../contexts/AppContext';
import { RootStackParamList } from '../navigation/types';
import {
  CameraPermissionError,
  pickImage,
  PickSource,
  uploadImage,
} from '../services/uploadService';
import { updateUserProfile } from '../services/userService';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const { colors, account } = useApp();
  const [name, setName] = useState(account?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!account) return null;

  const changeAvatar = async (source: PickSource) => {
    try {
      const uri = await pickImage(source);
      if (!uri) return;
      setUploading(true);
      setProgress(0);
      const url = await uploadImage(uri, setProgress);
      await updateUserProfile(account.uid, { avatar: url });
    } catch (error) {
      if (error instanceof CameraPermissionError) {
        Alert.alert(
          'Không có quyền camera',
          'Bạn đã từ chối quyền camera. Hãy cấp quyền trong Cài đặt.',
          [
            { text: 'Đóng', style: 'cancel' },
            { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
          ],
        );
      } else {
        Alert.alert('Không đổi được ảnh', (error as Error).message);
      }
    } finally {
      setUploading(false);
    }
  };

  const pickSource = () =>
    Alert.alert('Ảnh đại diện', 'Chọn nguồn ảnh', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Thư viện', onPress: () => changeAvatar('library') },
      { text: 'Chụp ảnh', onPress: () => changeAvatar('camera') },
    ]);

  const value = name.trim();
  const saveName = async () => {
    if (!value || value === account.name) return;
    setSavingName(true);
    try {
      await updateUserProfile(account.uid, { name: value });
      Alert.alert('Đã lưu', 'Họ tên mới đã được cập nhật.');
    } catch (error) {
      Alert.alert('Không lưu được', (error as Error).message);
    } finally {
      setSavingName(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StackHeader title="Hồ sơ cá nhân" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          disabled={uploading}
          onPress={pickSource}
          style={styles.avatarWrap}
          accessibilityLabel="Đổi ảnh đại diện"
        >
          <Image
            source={{ uri: account.avatar }}
            style={[styles.avatar, { backgroundColor: colors.border }]}
          />
          {uploading ? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.progress}>{Math.round(progress * 100)}%</Text>
            </View>
          ) : (
            <View
              style={[
                styles.cameraBadge,
                { backgroundColor: colors.primary, borderColor: colors.bg },
              ]}
            >
              <Camera size={16} color={colors.onPrimary} />
            </View>
          )}
        </TouchableOpacity>
        <Text style={[styles.email, { color: colors.subText }]}>
          {account.email}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>Họ tên</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={40}
            placeholder="Nhập họ tên"
            placeholderTextColor={colors.subText}
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
          />
          <TouchableOpacity
            disabled={!value || value === account.name || savingName}
            onPress={saveName}
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              (!value || value === account.name) && styles.disabled,
            ]}
          >
            {savingName ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                Lưu thay đổi
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, alignItems: 'stretch' },
  avatarWrap: { alignSelf: 'center', marginTop: 12 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  progress: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: { textAlign: 'center', fontSize: 14, marginTop: 10, marginBottom: 20 },
  card: { borderRadius: 18, padding: 16 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonText: { fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
