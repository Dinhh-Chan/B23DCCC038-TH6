import Geolocation, {
  GeolocationResponse,
} from '@react-native-community/geolocation';
import { Linking, PermissionsAndroid, Platform } from 'react-native';

// Android 12+ cho phép người dùng chỉ cấp vị trí gần đúng (COARSE) -> vẫn chấp nhận
export async function requestLocationPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }
  const { ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION } =
    PermissionsAndroid.PERMISSIONS;
  const result = await PermissionsAndroid.requestMultiple([
    ACCESS_FINE_LOCATION,
    ACCESS_COARSE_LOCATION,
  ]);
  return [ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION].some(
    p => result[p] === PermissionsAndroid.RESULTS.GRANTED,
  );
}

const getPosition = (enableHighAccuracy: boolean) =>
  new Promise<GeolocationResponse>((resolve, reject) =>
    Geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy,
      timeout: 15000,
      maximumAge: 10000,
    }),
  );

// Thử GPS trước, không được (vd. trong nhà, máy ảo) thì dùng vị trí mạng
export async function getCurrentLocation() {
  let position: GeolocationResponse;
  try {
    position = await getPosition(true);
  } catch {
    position = await getPosition(false);
  }
  const { latitude, longitude } = position.coords;
  return { latitude, longitude };
}

export const openInGoogleMaps = (latitude: number, longitude: number) =>
  Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  );
