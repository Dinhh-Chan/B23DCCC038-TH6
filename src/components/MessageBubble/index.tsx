import { ExternalLink, MapPin } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { Message } from '../../commons/types';
import { formatMessageTime } from '../../commons/utils';
import { useApp } from '../../contexts/AppContext';
import { openInGoogleMaps } from '../../services/locationService';
import { styles } from './styles';

type Props = {
  message: Message;
  mine: boolean; // tin của mình -> bên phải
};

export default function MessageBubble({ message, mine }: Props) {
  const { colors } = useApp();
  const textColor = mine ? colors.onPrimary : colors.text;
  const time = (
    <Text
      style={[styles.time, { color: mine ? colors.onPrimary : colors.subText }]}
    >
      {formatMessageTime(message.createdAt)}
    </Text>
  );
  const bubbleStyle = [
    styles.bubble,
    mine
      ? [styles.bubbleMine, { backgroundColor: colors.primary }]
      : [
          styles.bubbleOther,
          { backgroundColor: colors.bubbleOther, borderColor: colors.border },
        ],
  ];

  if (
    message.type === 'location' &&
    message.latitude !== undefined &&
    message.longitude !== undefined
  ) {
    const { latitude, longitude } = message;
    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => openInGoogleMaps(latitude, longitude)}
          style={[bubbleStyle, styles.locationBubble]}
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
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
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
          {time}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
      <View style={bubbleStyle}>
        <Text style={[styles.text, { color: textColor }]}>{message.text}</Text>
        {time}
      </View>
    </View>
  );
}
