import { requireOptionalNativeModule } from 'expo';
import { PermissionsAndroid, Platform } from 'react-native';

export interface SmsMessage {
  id: string;
  address: string;
  body: string;
  /** Epoch millis the message was received. */
  date: number;
}

interface SmsInboxNativeModule {
  readInbox(since: number, limit: number): Promise<SmsMessage[]>;
}

// Optional rather than required: the module is Android-only, so on iOS and web
// this resolves to null and `isSupported` turns the feature off in the UI.
const SmsInbox = requireOptionalNativeModule<SmsInboxNativeModule>('SmsInbox');

export const isSupported = Platform.OS === 'android' && SmsInbox !== null;

export async function hasSmsPermission(): Promise<boolean> {
  if (!isSupported) return false;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
}

export async function requestSmsPermission(): Promise<boolean> {
  if (!isSupported) return false;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
    title: 'Read your bank messages',
    message:
      'Spent looks through your SMS inbox for bank and UPI alerts so it can suggest transactions. Messages are read on this device and never leave it.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/** Newest first. `since` is epoch millis, exclusive. */
export async function readInbox(since = 0, limit = 500): Promise<SmsMessage[]> {
  if (!SmsInbox) return [];
  return SmsInbox.readInbox(since, limit);
}
