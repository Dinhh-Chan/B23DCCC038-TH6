import { Copy, Reply, Undo2 } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { REACTIONS } from '../../commons/conversation';
import { useApp } from '../../contexts/AppContext';
import { styles } from './styles';

type Props = {
  visible: boolean;
  myReaction?: string;
  canCopy: boolean; // chỉ tin văn bản
  canRecall: boolean; // chỉ tin của mình
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onRecall: () => void;
};

// Menu khi nhấn giữ một tin: thả cảm xúc + Trả lời / Sao chép / Thu hồi
export default function MessageActionSheet(props: Props) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();

  const action = (label: string, icon: ReactNode, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      style={[styles.action, { borderTopColor: colors.border }]}
      onPress={() => {
        props.onClose();
        onPress();
      }}
    >
      {icon}
      <Text style={[styles.actionText, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="fade"
      onRequestClose={props.onClose}
    >
      <Pressable style={styles.backdrop} onPress={props.onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + 8 },
          ]}
        >
          <View style={styles.reactions}>
            {REACTIONS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                accessibilityLabel={`Thả ${emoji}`}
                onPress={() => {
                  props.onClose();
                  props.onReact(emoji);
                }}
                style={[
                  styles.emojiButton,
                  props.myReaction === emoji && {
                    backgroundColor: colors.primaryLight,
                  },
                ]}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {action(
            'Trả lời',
            <Reply size={20} color={colors.text} />,
            props.onReply,
          )}
          {props.canCopy &&
            action(
              'Sao chép',
              <Copy size={20} color={colors.text} />,
              props.onCopy,
            )}
          {props.canRecall &&
            action(
              'Thu hồi',
              <Undo2 size={20} color={colors.danger} />,
              props.onRecall,
            )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
