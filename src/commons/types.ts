export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  createdAt?: number;
};

export type UserStatus = {
  online: boolean;
  lastChanged?: number;
};

// Người dùng khác kèm trạng thái online (dùng ở Danh bạ, Home, Chat)
export type Contact = UserProfile & { online: boolean; lastChanged?: number };

// Người đang đăng nhập
export type Account = Pick<UserProfile, 'uid' | 'name' | 'email' | 'avatar'>;

export type MessageType = 'text' | 'image' | 'location' | 'system';

// Tin được trích dẫn khi trả lời
export type ReplyRef = { id: string; senderId: string; preview: string };

// messages/{convId}/{msgId}
export type Message = {
  id: string;
  senderId: string;
  type: MessageType;
  text?: string;
  imageUrl?: string;
  lat?: number;
  lng?: number;
  latitude?: number; // tin vị trí của Bài 5 dùng latitude/longitude
  longitude?: number;
  createdAt: number;
  recalled?: boolean;
  reactions?: Record<string, string>; // uid -> emoji
  replyTo?: ReplyRef;
};

// conversations/{convId}
export type ConversationMeta = {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  members: Record<string, true>;
  createdBy: string;
  createdAt: number;
};

// userChats/{uid}/{convId} + thông tin cuộc trò chuyện
export type Conversation = {
  id: string;
  lastMessage: string;
  lastSenderId: string;
  lastMessageId?: string;
  updatedAt: number;
  unread: number;
  meta?: ConversationMeta;
};

export type NotificationType = 'message' | 'group_added' | 'reaction';

// notifications/{uid}/{id}
export type AppNotification = {
  id: string;
  type: NotificationType;
  convId: string;
  fromUid: string;
  text: string;
  createdAt: number;
  read: boolean;
};
