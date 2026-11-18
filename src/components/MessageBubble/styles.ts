import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 3 },
  rowMine: { alignItems: 'flex-end' },
  rowOther: { alignItems: 'flex-start' },
  pressable: { maxWidth: '78%' },
  sender: { fontSize: 12, fontWeight: '600', marginLeft: 12, marginBottom: 2 },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4, borderWidth: 1 },
  text: { fontSize: 15, lineHeight: 20 },
  time: { fontSize: 10, marginTop: 3, alignSelf: 'flex-end', opacity: 0.75 },
  status: { fontSize: 11, marginTop: 3, marginRight: 4 },

  recalled: { borderWidth: 1, borderStyle: 'dashed' },
  recalledRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recalledText: { fontSize: 14, fontStyle: 'italic' },

  quote: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  quoteAuthor: { fontSize: 12, fontWeight: '700' },
  quoteText: { fontSize: 12, marginTop: 1 },

  imageBubble: { paddingHorizontal: 4, paddingTop: 4 },
  image: { borderRadius: 14 },

  locationBubble: { width: 240, paddingTop: 12 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTexts: { flex: 1 },
  locationTitle: { fontSize: 15, fontWeight: '700' },
  coords: { fontSize: 12, marginTop: 2, opacity: 0.85 },
  openMap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  openMapText: { fontSize: 13, fontWeight: '600' },

  reactionsMine: { marginTop: -8, marginRight: 10 },
  reactionsOther: { marginTop: -8, marginLeft: 10 },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 11, fontWeight: '600' },

  systemRow: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 24,
  },
  systemText: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
