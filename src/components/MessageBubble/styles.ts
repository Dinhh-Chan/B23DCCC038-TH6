import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 12, marginVertical: 3 },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4, borderWidth: 1 },
  text: { fontSize: 15, lineHeight: 20 },
  time: { fontSize: 10, marginTop: 3, alignSelf: 'flex-end', opacity: 0.75 },
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
});
