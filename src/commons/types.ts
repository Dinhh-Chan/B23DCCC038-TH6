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
export type Contact = UserProfile & { online: boolean };

// Người đang đăng nhập
export type Account = Pick<UserProfile, 'uid' | 'name' | 'email' | 'avatar'>;

export type Message = {
  id: string;
  senderId: string;
  type: 'text' | 'location';
  text?: string;
  latitude?: number;
  longitude?: number;
  createdAt: number;
};

export type Conversation = {
  userId: string; // uid người đang chat cùng
  chatId: string;
  lastMessage: string;
  lastSenderId: string;
  updatedAt: number;
  unread: number;
};
