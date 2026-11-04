import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Lock, Mail, User } from 'lucide-react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isValidEmail } from '../commons/utils';
import { FormInput } from '../components';
import { useApp } from '../contexts/AppContext';
import { RootStackParamList } from '../navigation/types';
import { getAuthErrorMessage, register } from '../services/authService';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

type Field = 'name' | 'email' | 'password' | 'confirm';
type Errors = Partial<Record<Field | 'form', string>>;

export default function RegisterScreen({ navigation }: Props) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<Record<Field, string>>({
    name: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const change = (field: Field) => (value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined, form: undefined }));
  };

  const handleRegister = async () => {
    const next: Errors = {};
    if (!form.name.trim()) next.name = 'Vui lòng nhập họ tên';
    if (!form.email.trim()) next.email = 'Vui lòng nhập email';
    else if (!isValidEmail(form.email)) next.email = 'Email không hợp lệ';
    if (form.password.length < 6)
      next.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    if (!form.confirm) next.confirm = 'Vui lòng nhập lại mật khẩu';
    else if (form.confirm !== form.password)
      next.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      // Thành công thì Firebase tự đăng nhập luôn -> chuyển sang Home
      await register(form.name.trim(), form.email, form.password);
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
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.back}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>
          Tạo tài khoản
        </Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>
          Đăng ký để bắt đầu nhắn tin với bạn bè
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <FormInput
            label="Họ tên"
            icon={User}
            placeholder="Nguyễn Văn A"
            autoCapitalize="words"
            value={form.name}
            error={errors.name}
            onChangeText={change('name')}
          />
          <FormInput
            label="Email"
            icon={Mail}
            placeholder="email@example.com"
            keyboardType="email-address"
            value={form.email}
            error={errors.email}
            onChangeText={change('email')}
          />
          <FormInput
            label="Mật khẩu"
            icon={Lock}
            placeholder="Tối thiểu 6 ký tự"
            secure
            value={form.password}
            error={errors.password}
            onChangeText={change('password')}
          />
          <FormInput
            label="Nhập lại mật khẩu"
            icon={Lock}
            placeholder="Nhập lại mật khẩu"
            secure
            value={form.confirm}
            error={errors.confirm}
            onChangeText={change('confirm')}
            onSubmitEditing={handleRegister}
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
            onPress={handleRegister}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                Đăng ký
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={{ color: colors.subText }}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
              <Text style={[styles.link, { color: colors.primary }]}>
                Đăng nhập
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
  content: { flexGrow: 1, paddingHorizontal: 24 },
  back: { alignSelf: 'flex-start', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 24 },
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
