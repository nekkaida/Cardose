/**
 * Platform Helper Functions
 *
 * React Native platform detection, deep linking (WhatsApp, phone, email),
 * and confirmation dialogs.
 */

import { Alert, Linking, Platform } from 'react-native';
import { BUSINESS_CONFIG } from '../config';

/**
 * Open WhatsApp with phone number
 */
export const openWhatsApp = async (phoneNumber: string, message?: string): Promise<void> => {
  const phone = phoneNumber.startsWith('0')
    ? BUSINESS_CONFIG.WHATSAPP_COUNTRY_CODE + phoneNumber.substring(1)
    : phoneNumber;

  const url = message
    ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`
    : `whatsapp://send?phone=${phone}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'WhatsApp tidak terinstall di perangkat Anda');
    }
  } catch (error) {
    console.error('Error opening WhatsApp:', error);
    Alert.alert('Error', 'Gagal membuka WhatsApp');
  }
};

/**
 * Make phone call
 */
export const makePhoneCall = async (phoneNumber: string): Promise<void> => {
  const url = `tel:${phoneNumber}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Tidak dapat melakukan panggilan telepon');
    }
  } catch (error) {
    console.error('Error making phone call:', error);
    Alert.alert('Error', 'Gagal melakukan panggilan');
  }
};

/**
 * Send email
 */
export const sendEmail = async (
  email: string,
  subject?: string,
  body?: string
): Promise<void> => {
  const url = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}${body ? `&body=${encodeURIComponent(body)}` : ''}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Tidak dapat mengirim email');
    }
  } catch (error) {
    console.error('Error sending email:', error);
    Alert.alert('Error', 'Gagal mengirim email');
  }
};

/**
 * Check if platform is iOS
 */
export const isIOS = (): boolean => {
  return Platform.OS === 'ios';
};

/**
 * Check if platform is Android
 */
export const isAndroid = (): boolean => {
  return Platform.OS === 'android';
};

/**
 * Show confirmation dialog
 */
export const showConfirmDialog = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  Alert.alert(
    title,
    message,
    [
      {
        text: 'Batal',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'Ya',
        onPress: onConfirm,
      },
    ],
    { cancelable: true }
  );
};

/**
 * Show delete confirmation dialog
 */
export const showDeleteConfirmation = (
  itemName: string,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  Alert.alert(
    'Konfirmasi Hapus',
    `Apakah Anda yakin ingin menghapus ${itemName}? Tindakan ini tidak dapat dibatalkan.`,
    [
      {
        text: 'Batal',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: onConfirm,
      },
    ],
    { cancelable: true }
  );
};
