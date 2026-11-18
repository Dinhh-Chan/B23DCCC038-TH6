import { ExternalLink, MapPin, Undo2 } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { messageCoords, RECALLED_TEXT } from '../../commons/conversation';
import { Message } from '../../commons/types';
import { formatMessageTime } from '../../commons/utils';
import { useApp } from '../../contexts/AppContext';
import { openInGoogleMaps } from '../../services/locationService';
import { styles } from './styles';

type Props = {
  message: Message;
  mine: boolean; // tin của mình -> bên phải
  senderName?: string; // chat nhóm: tên người gửi phía trên bong bóng
  replyAuthor?: string; // tên tác giả tin được trích dẫn
  replyRecalled?: boolean; // tin được trích dẫn đã bị thu hồi
  status?: string; // "Đã gửi" / "Đã xem lúc 14:05" dưới tin cuối của mình
  highlighted?: boolean; // vừa cuộn tới từ phần trích dẫn
  onLongPress?: () => void;
  onPressImage?: (url: string) => void;
  onPressReply?: () => void;
};

const IMAGE_WIDTH = 220;

// Ảnh giữ đúng tỉ lệ: đo kích thước thật khi tải xong rồi tính chiều cao
function ChatImage({ uri, onPress }: { uri: string; onPress: () => void }) {
  const [ratio, setRatio] = useState(1);
  const height = Math.min(320, Math.max(120, IMAGE_WIDTH / ratio));
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Image
        source={{ uri }}
        style={[styles.image, { width: IMAGE_WIDTH, height }]}
        onLoad={e => {
          const { width, height: h } = e.nativeEvent.source;
          if (width && h) setRatio(width / h);
        }}
      />
    </TouchableOpacity>
  );
}

// Gom cảm xúc: hiện các emoji khác nhau + tổng số người thả (nếu > 1)
function Reactions({ reactions }: { reactions: Record<string, string> }) {
  const { colors } = useApp();
  const values = Object.values(reactions);
  if (values.length === 0) return null;
  const distinct = [...new Set(values)];
  return (
    <View
      style={[
        styles.reactions,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={styles.reactionEmoji}>{distinct.join('')}</Text>
      {values.length > 1 && (
        <Text style={[styles.reactionCount, { color: colors.subText }]}>
          {values.length}
        </Text>
      )}
    </View>
  );
}

export default function MessageBubble(props: Props) {
  const { message, mine, senderName, status, highlighted } = props;
  const { colors } = useApp();

  if (message.type === 'system') {
    return (
      <View style={styles.systemRow}>
        <Text
          style={[
            styles.systemText,
            { color: colors.subText, backgroundColor: colors.border },
          ]}
        >
          {message.text}
        </Text>
      </View>
    );
  }

  const textColor = mine ? colors.onPrimary : colors.text;
  const subColor = mine ? colors.onPrimary : colors.subText;
  const bubbleColors = mine
    ? [styles.bubbleMine, { backgroundColor: colors.primary }]
    : [
        styles.bubbleOther,
        { backgroundColor: colors.bubbleOther, borderColor: colors.border },
      ];
  const time = (
    <Text style={[styles.time, { color: subColor }]}>
      {formatMessageTime(message.createdAt)}
    </Text>
  );

  let body;
  if (message.recalled) {
    body = (
      <View
        style={[
          styles.bubble,
          styles.recalled,
          { borderColor: colors.border, backgroundColor: colors.bg },
        ]}
      >
        <View style={styles.recalledRow}>
          <Undo2 size={14} color={colors.subText} />
          <Text style={[styles.recalledText, { color: colors.subText }]}>
            {RECALLED_TEXT}
          </Text>
        </View>
      </View>
    );
  } else {
    const coords = message.type === 'location' ? messageCoords(message) : null;
    body = (
      <View
        style={[
          styles.bubble,
          bubbleColors,
          message.type === 'image' && styles.imageBubble,
          coords && styles.locationBubble,
        ]}
      >
        {message.replyTo && (
          <TouchableOpacity
            onPress={props.onPressReply}
            style={[
              styles.quote,
              {
                borderLeftColor: mine ? colors.onPrimary : colors.primary,
                backgroundColor: mine
                  ? 'rgba(255,255,255,0.18)'
                  : colors.primaryLight,
              },
            ]}
          >
            <Text
              style={[styles.quoteAuthor, { color: textColor }]}
              numberOfLines={1}
            >
              {props.replyAuthor ?? 'Tin nhắn'}
            </Text>
            <Text
              style={[styles.quoteText, { color: subColor }]}
              numberOfLines={2}
            >
              {props.replyRecalled ? RECALLED_TEXT : message.replyTo.preview}
            </Text>
          </TouchableOpacity>
        )}

        {message.type === 'image' && message.imageUrl ? (
          <ChatImage
            uri={message.imageUrl}
            onPress={() => props.onPressImage?.(message.imageUrl as string)}
          />
        ) : coords ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openInGoogleMaps(coords.lat, coords.lng)}
          >
            <View style={styles.locationHeader}>
              <View
                style={[
                  styles.pin,
                  { backgroundColor: mine ? colors.onPrimary : colors.danger },
                ]}
              >
                <MapPin
                  size={20}
                  color={mine ? colors.primary : colors.onPrimary}
                />
              </View>
              <View style={styles.locationTexts}>
                <Text style={[styles.locationTitle, { color: textColor }]}>
                  {mine ? 'Vị trí của bạn' : 'Vị trí được chia sẻ'}
                </Text>
                <Text style={[styles.coords, { color: textColor }]}>
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.openMap,
                { borderTopColor: mine ? colors.onPrimary : colors.border },
              ]}
            >
              <ExternalLink
                size={14}
                color={mine ? colors.onPrimary : colors.primary}
              />
              <Text
                style={[
                  styles.openMapText,
                  { color: mine ? colors.onPrimary : colors.primary },
                ]}
              >
                Mở trong Google Maps
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.text, { color: textColor }]}>
            {message.text}
          </Text>
        )}
        {time}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.row,
        mine ? styles.rowMine : styles.rowOther,
        highlighted && { backgroundColor: colors.primaryLight },
      ]}
    >
      {!!senderName && (
        <Text style={[styles.sender, { color: colors.subText }]}>
          {senderName}
        </Text>
      )}
      <Pressable
        onLongPress={message.recalled ? undefined : props.onLongPress}
        delayLongPress={300}
        style={styles.pressable}
      >
        {body}
      </Pressable>
      {!message.recalled && message.reactions && (
        <View style={mine ? styles.reactionsMine : styles.reactionsOther}>
          <Reactions reactions={message.reactions} />
        </View>
      )}
      {!!status && (
        <Text style={[styles.status, { color: colors.subText }]}>{status}</Text>
      )}
    </View>
  );
}
