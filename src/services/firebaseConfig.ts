// Cấu hình lấy từ Firebase Console:
// Project settings → General → Your apps → Web app (</>) → SDK setup and configuration → Config
// databaseURL lấy ở Build → Realtime Database (đường link phía trên tab Data)
export const firebaseConfig = {
  apiKey: 'AIzaSyAWyXdA3odX4opP7fvMPHNq4OPmJjKZsC0',
  authDomain: 'chatapp-b23dccc038.firebaseapp.com',
  databaseURL:
    'https://chatapp-b23dccc038-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'chatapp-b23dccc038',
  storageBucket: 'chatapp-b23dccc038.firebasestorage.app',
  messagingSenderId: '812236665181',
  appId: '1:812236665181:web:e613844fdf18ceff9d78b4',
};

export const isFirebaseConfigured = !firebaseConfig.apiKey.startsWith('YOUR_');
