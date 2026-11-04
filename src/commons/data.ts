// Thông báo vẫn dùng dữ liệu mẫu như Bài 4
export type AppNotification = {
  id: string;
  content: string;
  time: string;
  read: boolean;
};

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    content: 'Nguyễn Văn An đã gửi cho bạn 2 tin nhắn mới.',
    time: '5 phút trước',
    read: false,
  },
  {
    id: 'n2',
    content: 'Lê Hoàng Cường đã thêm bạn vào nhóm "Đá bóng PTIT".',
    time: '1 giờ trước',
    read: false,
  },
  {
    id: 'n3',
    content: 'Đặng Ngọc Lan đã nhắc đến bạn trong một tin nhắn.',
    time: '3 giờ trước',
    read: false,
  },
  {
    id: 'n4',
    content: 'Trần Thị Bích đã chấp nhận lời mời kết bạn.',
    time: 'Hôm qua',
    read: true,
  },
  {
    id: 'n5',
    content: 'Tài khoản của bạn vừa đăng nhập trên thiết bị mới.',
    time: 'Hôm qua',
    read: true,
  },
  {
    id: 'n6',
    content: 'Hoàng Thu Hà đã cập nhật ảnh đại diện.',
    time: '2 ngày trước',
    read: true,
  },
  {
    id: 'n7',
    content: 'Chào mừng bạn đến với ChatApp! 🎉',
    time: '1 tuần trước',
    read: true,
  },
];
