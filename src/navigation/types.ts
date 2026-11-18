import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Contacts: undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Chat: { convId: string }; // 1-1: "uidA_uidB", nhóm: "g_..."
  CreateGroup: undefined;
  GroupInfo: { convId: string };
  EditProfile: undefined;
};
