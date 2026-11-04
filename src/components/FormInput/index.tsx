import { Eye, EyeOff, LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import {
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { styles } from './styles';

type Props = TextInputProps & {
  label: string;
  icon: LucideIcon;
  error?: string;
  secure?: boolean; // ô mật khẩu: ẩn ký tự + nút ẩn/hiện
};

export default function FormInput({
  label,
  icon: Icon,
  error,
  secure,
  ...inputProps
}: Props) {
  const { colors } = useApp();
  const [showText, setShowText] = useState(false);

  return (
    <>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.inputBox,
          { borderColor: error ? colors.danger : colors.border },
        ]}
      >
        <Icon size={18} color={colors.subText} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholderTextColor={colors.subText}
          secureTextEntry={secure && !showText}
          autoCapitalize="none"
          {...inputProps}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShowText(s => !s)} hitSlop={8}>
            {showText ? (
              <EyeOff size={18} color={colors.subText} />
            ) : (
              <Eye size={18} color={colors.subText} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {!!error && (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      )}
    </>
  );
}
