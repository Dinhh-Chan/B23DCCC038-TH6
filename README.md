# Bài thực hành 6 – Chat nhóm, gửi ảnh, đã xem, thu hồi (React Native CLI + Firebase)

Sinh viên: **Trần Đức Định** – MSSV: **B23DCCC038**

Phát triển tiếp ứng dụng chat của Bài thực hành 5, bổ sung các tính năng của một ứng dụng nhắn tin thực tế:
chat nhóm, gửi ảnh (Cloudinary), trạng thái "đang soạn tin…" / "Đã xem", thu hồi tin nhắn, thả cảm xúc và
màn hình Thông báo dùng dữ liệu thật.

## Chức năng

### Phần A – Bắt buộc

| Yêu cầu | Cách làm | File chính |
|---|---|---|
| "đang soạn tin…" | `typing/{convId}/{uid}`, tự tắt sau 3 giây không gõ, khi gửi tin, khi rời màn hình hoặc app xuống nền | `ChatScreen.tsx`, `chatService.ts` |
| "Đã gửi" / "Đã xem lúc HH:mm" | `readStatus/{convId}/{uid}` = thời điểm đọc cuối, so với `createdAt` tin cuối của mình. Nhóm: "Đã xem bởi A, B" | `ChatScreen.tsx` |
| "Hoạt động X phút trước" | `status/{uid}.lastChanged`, tự cập nhật mỗi 30 giây | `utils.ts`, `useNow.ts` |
| Không bị kẹt trạng thái | `onDisconnect()` cho online (`status`), đang gõ (`typing`) và đang xem (`viewing`) | `userService.ts`, `chatService.ts` |
| Nhấn giữ tin | Menu: thả 👍 ❤️ 😂 😮 😢, Trả lời, Sao chép, Thu hồi (chỉ tin của mình) | `MessageActionSheet` |
| Thu hồi | Không xoá node: đặt `recalled: true` và xoá nội dung. Nếu là tin cuối thì cập nhật cả dòng tin cuối ở Home | `chatService.recallMessage` |
| Cảm xúc | `reactions/{uid}: emoji`, hiển thị dưới bong bóng kèm tổng số người thả | `MessageBubble` |
| Gửi ảnh | Nút 📷: Chụp ảnh / Thư viện (`react-native-image-picker`), xin quyền camera, thu nhỏ cạnh dài ≤ 1024px, tải lên Cloudinary bằng unsigned preset, chỉ lưu URL | `uploadService.ts` |
| Bong bóng tạm khi tải ảnh | Vòng loading + %, lỗi thì có nút "Thử lại" / huỷ | `PendingImageBubble` |
| Xem ảnh toàn màn hình | Nhấn vào ảnh | `ImageViewer` |
| Home: "📷 Hình ảnh", "📍 Vị trí" | Dòng tin cuối lấy từ `messagePreview()` | `conversation.ts` |
| Tạo nhóm | Tên nhóm + chọn thành viên có checkbox, tối thiểu 2 người ngoài bản thân | `CreateGroupScreen.tsx`, `groupService.ts` |
| Chat nhóm | Tên người gửi phía trên bong bóng, tiêu đề: tên nhóm + số thành viên đang online. Hỗ trợ tin thường, vị trí, ảnh | `ChatScreen.tsx` |
| Home 1-1 + nhóm | Sắp theo tin mới nhất, mỗi thành viên có số chưa đọc riêng | `HomeScreen.tsx`, `AppContext.tsx` |
| Thông báo thật | `notifications/{uid}`: tin mới khi không mở cuộc trò chuyện đó, được thêm vào nhóm, có người thả cảm xúc. Badge số chưa đọc, nhấn để mở đúng cuộc trò chuyện, "Đánh dấu tất cả đã đọc" | `notificationService.ts`, `NotificationsScreen.tsx` |

### Phần B – Kỹ thuật

- **Multi-path update:** `buildMessageUpdates()` gom tin nhắn, `lastMessage`/`lastMessageId`/`updatedAt` của mọi
  thành viên, số chưa đọc (`increment(1)`) và thông báo vào **một** lệnh `update()`. Tạo nhóm, thêm/xoá thành viên,
  rời nhóm, thu hồi, thả cảm xúc cũng đều là một lệnh `update()`.
- **Phân trang:** lần đầu `limitToLast(20)`. Kéo lên đầu danh sách thì `endBefore(tin cũ nhất) + limitToLast(20)`.
  Danh sách là FlatList `inverted` nên tin cũ được chèn phía trên mà không làm nhảy vị trí đang xem
  (`hooks/useMessages.ts`).
- **Listener:** mọi `onValue` / `onChildAdded` / `onChildChanged` đều được huỷ trong cleanup của `useEffect`.
- **Không có API secret của Cloudinary trong mã nguồn:** chỉ dùng cloud name + unsigned upload preset.
- **Code Firebase & Cloudinary** gom trong `src/services/`: `chatService.ts`, `groupService.ts`,
  `uploadService.ts`, `notificationService.ts`, `userService.ts`, `authService.ts`.

### Phần C – Nâng cao

| Tính năng | File |
|---|---|
| Quản trị nhóm: đổi tên, thêm / xoá thành viên (trưởng nhóm), rời nhóm, tin hệ thống "A đã rời nhóm" | `GroupInfoScreen.tsx`, `groupService.ts` |
| Trả lời một tin cụ thể (trích dẫn), nhấn trích dẫn để cuộn tới tin gốc (tự tải thêm trang cũ nếu cần) | `ChatScreen.tsx`, `MessageBubble` |
| Hồ sơ cá nhân: đổi họ tên, ảnh đại diện (tải lên Cloudinary), cập nhật ở Danh bạ, Home, Chat | `EditProfileScreen.tsx` |
| Tìm kiếm nội dung tin nhắn trong cuộc trò chuyện (không phân biệt dấu, nhảy giữa các kết quả) | `ChatScreen.tsx` |

## Cấu trúc dữ liệu

```
users/{uid}                  { name, email, avatar, createdAt }
status/{uid}                 { online, lastChanged }
conversations/{convId}       { type: "direct" | "group", name, members: {uid: true}, createdBy, createdAt }
messages/{convId}/{msgId}    { senderId, type: "text" | "image" | "location" | "system",
                               text, imageUrl, lat, lng, createdAt, recalled, reactions: {uid: emoji},
                               replyTo: {id, senderId, preview} }
userChats/{uid}/{convId}     { lastMessage, lastSenderId, lastMessageId, updatedAt, unread }
readStatus/{convId}/{uid}    thời điểm đọc cuối
typing/{convId}/{uid}        true
viewing/{convId}/{uid}       true khi đang mở cuộc trò chuyện (để không gửi thông báo thừa)
notifications/{uid}/{id}     { type: "message" | "group_added" | "reaction", convId, fromUid, text, createdAt, read }
```

- Chat 1-1: `convId = uidA_uidB` (2 uid đã sắp xếp), nên tin nhắn cũ của Bài 5 vẫn đọc được.
- Chat nhóm: `convId = g_<pushId>`.

## Luật bảo mật

File [`database.rules.json`](database.rules.json):

- **Chỉ thành viên** (`conversations/{convId}/members/{uid}`) mới đọc được `messages`, `readStatus`, `typing`,
  `viewing` của cuộc trò chuyện, và mới gửi được tin (`senderId` phải là chính mình).
- **Tin nhắn chỉ được tạo mới, không được sửa.** Riêng `recalled` chỉ **người gửi** mới ghi được (và chỉ được ghi
  `true`). Người gửi được xoá nội dung khi thu hồi.
- **Mỗi người chỉ ghi `reactions/{uid}`, `typing/{convId}/{uid}`, `readStatus/{convId}/{uid}` của chính mình.**
- `userChats/{uid}` chỉ chủ sở hữu đọc được. Thành viên của cùng cuộc trò chuyện được cập nhật dòng tin cuối /
  số chưa đọc của nhau.
- `notifications/{uid}` chỉ chủ sở hữu đọc và sửa được. Người khác chỉ được **tạo mới** thông báo do chính mình gây
  ra (`fromUid`), và phải là thành viên của cuộc trò chuyện đó.
- Với các thao tác tạo nhóm (nhóm và tin đầu tiên được ghi cùng lúc), membership được kiểm tra trên dữ liệu
  **sau khi ghi** bằng `newData.parent()…`, vì trong một multi-path update thì `root` là dữ liệu cũ.

## Cấu hình

### Firebase

1. [Firebase Console](https://console.firebase.google.com) → tạo project.
2. **Authentication → Sign-in method → Email/Password → Enable**.
3. **Realtime Database → Create database**, tab **Rules**: dán nội dung `database.rules.json` → **Publish**.
4. **Project settings → Your apps → Web app (`</>`)** → copy `firebaseConfig` vào `src/services/firebaseConfig.ts`.

### Cloudinary (gửi ảnh, đổi ảnh đại diện)

1. Đăng ký tài khoản miễn phí tại [cloudinary.com](https://cloudinary.com), ghi lại **Cloud name** ở trang Dashboard.
2. **Settings (⚙) → Upload → Upload presets → Add upload preset**:
   - **Signing mode: Unsigned**
   - (tuỳ chọn) Folder: `chatapp`
   - Lưu lại, ghi nhớ **tên preset**.
3. Điền vào `src/services/cloudinaryConfig.ts`:
   ```ts
   export const cloudinaryConfig = {
     cloudName: '<cloud name>',
     uploadPreset: '<tên unsigned preset>',
   };
   ```
   **Không** đưa API key / API secret vào app: unsigned preset không cần chữ ký.

## Chạy ứng dụng

```bash
npm install
npm start            # terminal 1: Metro
npm run android      # terminal 2: build & cài lên mọi máy ảo / thiết bị đang kết nối
```

Phiên đăng nhập được lưu bằng AsyncStorage, nên tắt app mở lại không phải đăng nhập lại.

**Chạy 3 máy ảo** từ cùng một AVD (cờ `-read-only`, port khác nhau):

```bash
emulator -avd Medium_Phone_API_36.1 -read-only -port 5556 -gpu swiftshader_indirect &
emulator -avd Medium_Phone_API_36.1 -read-only -port 5558 -gpu swiftshader_indirect &
emulator -avd Medium_Phone_API_36.1 -read-only -port 5560 -gpu swiftshader_indirect &
```

## Sản phẩm nộp

- Mã nguồn (không kèm `node_modules`, `android/build`, `android/app/build`, `ios/Pods`) + `database.rules.json`
  + README này.
- Ảnh chụp màn hình: thư mục [`screenshots/`](screenshots/).
- Video demo: thư mục [`demo/`](demo/).
- Báo cáo luật bảo mật: [`docs/`](docs/).
