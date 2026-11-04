import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock, Mail, MessageCircle } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { isValidEmail } from '../commons/utils';
import { FormInput } from '../components';
import { useApp } from '../contexts/AppContext';
import { RootStackParamList } from '../navigation/types';
import { getAuthErrorMessage, login } from '../services/authService';
import { isFirebaseConfigured } from '../services/firebaseConfig';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

type Errors = { email?: string; password?: string; form?: string };

export default function LoginScreen({ navigation }: Props) {
  const { colors } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const handleLogin = async () => {
    const next: Errors = {};
    if (!email.trim()) next.email = 'Vui lòng nhập email';
    else if (!isValidEmail(email)) next.email = 'Email không hợp lệ';
    if (!password) next.password = 'Vui lòng nhập mật khẩu';
    setErrors(next);
    if (next.email || next.password) return;

    setLoading(true);
    try {
      // Thành công -> onAuthStateChanged báo có user -> tự chuyển sang Home
      await login(email, password);
    } catch (error) {
      setErrors({ form: getAuthErrorMessage(error) });
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <MessageCircle
              size={42}
              color={colors.onPrimary}
              strokeWidth={2.2}
            />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>ChatApp</Text>
          <Text style={[styles.slogan, { color: colors.subText }]}>
            Kết nối mọi người, mọi lúc, mọi nơi
          </Text>
        </View>

        {!isFirebaseConfigured && (
          <Text
            style={[
              styles.warning,
              { color: colors.danger, borderColor: colors.danger },
            ]}
          >
            Chưa cấu hình Firebase. Hãy điền thông tin project vào
            src/services/firebaseConfig.ts
          </Text>
        )}

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <FormInput
            label="Email"
            icon={Mail}
            placeholder="Nhập email"
            keyboardType="email-address"
            value={email}
            error={errors.email}
            onChangeText={t => {
              setEmail(t);
              setErrors(e => ({ ...e, email: undefined, form: undefined }));
            }}
          />
          <FormInput
            label="Mật khẩu"
            icon={Lock}
            placeholder="Nhập mật khẩu"
            secure
            value={password}
            error={errors.password}
            onChangeText={t => {
              setPassword(t);
              setErrors(e => ({ ...e, password: undefined, form: undefined }));
            }}
            onSubmitEditing={handleLogin}
          />

          {!!errors.form && (
            <Text style={[styles.formError, { color: colors.danger }]}>
              {errors.form}
            </Text>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={loading}
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleLogin}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                Đăng nhập
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={{ color: colors.subText }}>Chưa có tài khoản? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              hitSlop={8}
            >
              <Text style={[styles.link, { color: colors.primary }]}>
                Đăng ký
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', marginBottom: 32 },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: { fontSize: 32, fontWeight: '800' },
  slogan: { fontSize: 14, marginTop: 6 },
  warning: {
    fontSize: 13,
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  card: { borderRadius: 20, padding: 20 },
  formError: { fontSize: 13, marginTop: 12, textAlign: 'center' },
  button: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  link: { fontWeight: '700' },
});
