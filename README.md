# Bài thực hành 5 – Chat 1-1 realtime với Firebase (React Native CLI)

Sinh viên: **Trần Đức Định** – MSSV: **B23DCCC038**

Phát triển tiếp ứng dụng chat của Bài thực hành 4: thay dữ liệu mẫu bằng dữ liệu thời gian thực trên
Firebase (Authentication Email/Password + Realtime Database) để hai người dùng nhắn tin trực tiếp với nhau.

## Chức năng

| Yêu cầu | Màn hình / file |
|---|---|
| Đăng ký (họ tên, email, mật khẩu ≥ 6 ký tự, nhập lại mật khẩu) | `src/screens/RegisterScreen.tsx` |
| Đăng nhập Firebase, báo lỗi khi sai tài khoản/mật khẩu | `src/screens/LoginScreen.tsx` |
| Đăng xuất ở Cài đặt → về màn hình Đăng nhập | `src/screens/SettingsScreen.tsx` |
| Danh bạ: người dùng từ Firebase (trừ bản thân), online/offline realtime, tìm kiếm | `src/screens/ContactsScreen.tsx` |
| Chat 1-1 realtime, tin của mình bên phải, có giờ gửi, không gửi tin rỗng, tự cuộn xuống | `src/screens/ChatScreen.tsx` |
| Thanh tiêu đề chat: tên + trạng thái online | `src/screens/ChatScreen.tsx` |
| Nút 📍 gửi vị trí (xin quyền, báo lỗi khi bị từ chối), nhấn tin vị trí → Google Maps | `ChatScreen.tsx`, `src/components/MessageBubble`, `src/services/locationService.ts` |
| Home: ảnh, tên, tin cuối, thời gian, mới nhất trên cùng, số tin chưa đọc | `src/screens/HomeScreen.tsx` |
| Thông báo: giữ như Bài 4 | `src/screens/NotificationsScreen.tsx` |

## Cấu trúc mã nguồn

```
src/
├── services/            # Toàn bộ code Firebase (và định vị)
│   ├── firebaseConfig.ts   # cấu hình project – CẦN ĐIỀN
│   ├── firebase.ts         # khởi tạo app, auth, database
│   ├── authService.ts      # đăng ký, đăng nhập, đăng xuất, thông báo lỗi tiếng Việt
│   ├── userService.ts      # danh sách người dùng, trạng thái online (presence)
│   ├── chatService.ts      # nghe/gửi tin nhắn, danh sách cuộc trò chuyện, số chưa đọc
│   └── locationService.ts  # xin quyền, lấy vị trí, mở Google Maps
├── contexts/AppContext.tsx # giữ trạng thái đăng nhập + dữ liệu realtime dùng chung
├── navigation/             # Stack (Login/Register | Main/Chat) + Bottom Tabs
├── screens/                # các màn hình
├── components/             # Avatar, FormInput, MessageBubble, ConversationItem, ...
└── commons/                # types, theme, hàm định dạng thời gian, dữ liệu mẫu thông báo
```

## Cấu trúc dữ liệu trên Realtime Database

```
users/{uid}                    { name, email, avatar, createdAt }
status/{uid}                   { online, lastChanged }
messages/{chatId}/{messageId}  { senderId, type: "text" | "location",
                                 text | latitude + longitude, createdAt }
userChats/{uid}/{otherUid}     { chatId, lastMessage, lastSenderId, updatedAt, unread }
```

- `chatId` = hai uid sắp xếp rồi nối bằng `_`, nên hai người luôn ra cùng một phòng chat.
- Khi gửi tin, app dùng **một lệnh `update` nhiều đường dẫn** để ghi tin nhắn và cập nhật `userChats` của
  cả hai người. Số chưa đọc của người nhận được tăng bằng `increment(1)` trên server.
- Khi mở cuộc trò chuyện, app đặt `userChats/{tôi}/{người kia}/unread = 0`.
- Online/offline: khi có kết nối (`.info/connected`), app ghi `online: true` và đăng ký
  `onDisconnect()` để server tự ghi `online: false` khi app bị tắt hoặc mất mạng. App chuyển xuống nền
  cũng ghi offline.
- Mọi listener (`onValue`, `onChildAdded`) đều được huỷ trong cleanup của `useEffect`, nên tin nhắn
  không bị hiện lặp khi mở lại màn hình.

## Cài đặt Firebase

1. Vào [Firebase Console](https://console.firebase.google.com) → **Add project**.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
3. **Build → Realtime Database → Create database** (chọn khu vực, ví dụ Singapore) → bắt đầu ở *locked mode*.
4. Tab **Rules**: dán luật bảo mật rồi bấm **Publish**. Nếu dùng luật do giảng viên cung cấp thì dán luật đó;
   luật tương ứng với cấu trúc dữ liệu ở trên nằm trong file [`database.rules.json`](database.rules.json).
5. **Project settings → General → Your apps → biểu tượng Web `</>`**, đăng ký app rồi copy `firebaseConfig`.
6. Dán vào `src/services/firebaseConfig.ts`. Nhớ kiểm tra `databaseURL` khớp với link hiện ở tab
   *Data* của Realtime Database. Database ở Singapore có dạng
   `https://<project>-default-rtdb.asia-southeast1.firebasedatabase.app`.

> Nếu chưa điền cấu hình, màn hình Đăng nhập sẽ hiện dòng cảnh báo màu đỏ.

## Chạy ứng dụng

```bash
npm install
npm start            # terminal 1: Metro
npm run android      # terminal 2: build & cài lên máy ảo/thiết bị (chỉ build ABI của máy đang cắm)
```

### Chạy 2 máy ảo để chat với nhau

```bash
# Máy ảo thứ 2 có thể dùng chung AVD với máy 1 nhờ cờ -read-only
emulator -avd Medium_Phone_API_36.1 &
emulator -avd Medium_Phone_API_36.1 -read-only &
adb devices          # thấy 2 thiết bị emulator-5554, emulator-5556
npm run android      # khi không chỉ định thiết bị, app được cài lên tất cả máy đang kết nối
```

Đăng ký 2 tài khoản khác nhau trên 2 máy rồi chat với nhau.

**Gửi vị trí trên máy ảo:** mở *Extended controls (⋯) → Location*, chọn một điểm rồi bấm **Set location**
trước khi bấm nút 📍.

> Phiên đăng nhập chỉ giữ trong bộ nhớ (`inMemoryPersistence`), nên tắt app hoặc reload JS thì phải
> đăng nhập lại. Cách này đủ cho yêu cầu bài và không cần thêm thư viện native AsyncStorage.

## Video demo & ảnh chụp

**Video** (1 phút 56 giây, 2 máy ảo đặt cạnh nhau): [`demo/B23DCCC038-TH05-demo.mp4`](demo/B23DCCC038-TH05-demo.mp4)

| Thời điểm | Nội dung |
|---|---|
| 0:00 | Danh bạ hai máy thấy nhau "Đang hoạt động" |
| 0:05 – 0:35 | tk1 gửi 2 tin, Home của tk2 tăng số chưa đọc 1 → 2 ngay lập tức |
| 0:40 – 1:05 | tk2 mở cuộc trò chuyện (chưa đọc về 0), trả lời, tin hiện ngay bên tk1 |
| 1:10 – 1:25 | tk2 bấm 📍: hỏi quyền vị trí → gửi tin vị trí, hiện ở cả hai máy |
| 1:30 – 1:40 | tk1 bấm tin vị trí → Google Maps mở đúng toạ độ; tk2 thấy tk1 "Ngoại tuyến" |
| 1:40 – 1:56 | tk2 thoát ra màn hình chính → tk1 thấy "Ngoại tuyến", mở lại → "Đang hoạt động" |

**Ảnh chụp** (thư mục [`screenshots/`](screenshots/)):

| File | Màn hình |
|---|---|
| `1-register.png` | Đăng ký |
| `2-home-unread.png` | Home có số tin chưa đọc |
| `3-contacts-online.png` | Danh bạ có trạng thái online |
| `4-chat-text-location.png` | Chat có tin thường và tin vị trí (người gửi) |
| `5-chat-receiver.png` | Cùng cuộc trò chuyện ở máy người nhận |
| `6-firebase-data.jpg`, `7-firebase-data-location.jpg` | Firebase Console – tab Data, dữ liệu tin nhắn |

## Sản phẩm nộp

- Mã nguồn (không kèm `node_modules`, `android/build`, `android/app/build`, `ios/Pods`):
  ```bash
  cd .. && zip -r B23DCCC038-TH05.zip baithuchanh5 \
    -x "baithuchanh5/node_modules/*" "baithuchanh5/android/build/*" "baithuchanh5/android/app/build/*" \
       "baithuchanh5/android/app/.cxx/*" "baithuchanh5/android/.gradle/*" "baithuchanh5/ios/Pods/*"
  ```
- Ảnh chụp và video: xem mục trên.
