import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  error: { fontSize: 12, marginTop: 6 },
});
