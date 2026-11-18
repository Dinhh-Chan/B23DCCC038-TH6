import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  icon: { width: 44, height: 44, borderRadius: 22 },
  typeIcon: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 6 },
  content: { fontSize: 14, lineHeight: 20 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontSize: 12 },
  state: { fontSize: 12, fontWeight: '600' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
