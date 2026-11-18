// Cloudinary Console → Settings → Upload → Upload presets → Add upload preset
// Signing mode: Unsigned. Chỉ cần cloud name + tên preset, KHÔNG đưa API secret vào app.
export const cloudinaryConfig = {
  cloudName: 'lp5ivvbj',
  uploadPreset: 'chatapp_unsigned',
};

export const isCloudinaryConfigured =
  !cloudinaryConfig.cloudName.startsWith('YOUR_');
