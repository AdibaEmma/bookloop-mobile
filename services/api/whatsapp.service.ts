/**
 * WhatsApp Integration Service (Placeholder)
 *
 * Future integration with Meta WhatsApp Cloud API for:
 * - Exchange notifications
 * - Verification reminders
 * - Meeting reminders
 * - Bot commands (status, verify, help)
 *
 * NOTE: This is a placeholder for future implementation.
 * WhatsApp Bot integration is deferred to post-MVP launch.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import { Linking, Platform, Alert } from 'react-native';

/**
 * WhatsApp message templates for future bot integration
 */
export const WhatsAppTemplates = {
  // Exchange notifications
  NEW_REQUEST: 'You have a new book request from {{userName}}!',
  REQUEST_ACCEPTED: '{{userName}} accepted your book request! Choose a meetup point.',
  MEETING_REMINDER: "Don't forget to meet {{userName}} today at {{time}} at {{location}}!",

  // Verification reminders
  VERIFICATION_PENDING: 'Complete your verification to start trading on BookLoop!',
  VERIFICATION_APPROVED: 'Congratulations! Your BookLoop account is now verified.',

  // Listing performance
  LISTING_VIEWS: 'Your listing "{{bookTitle}}" has {{views}} new views! Boost it for more visibility?',

  // Bot commands
  COMMAND_STATUS: 'Reply with "status" to check your active exchanges',
  COMMAND_VERIFY: 'Reply with "verify" to resume verification',
  COMMAND_HELP: 'Reply with "help" to get support',
};

/**
 * WhatsApp Bot Commands (for future implementation)
 */
export type WhatsAppCommand = 'status' | 'verify' | 'help';

/**
 * WhatsApp Service
 *
 * Currently provides utility functions for opening WhatsApp.
 * Full bot integration to be implemented post-MVP.
 */
export const whatsappService = {
  /**
   * Check if WhatsApp is installed on the device
   */
  async isWhatsAppInstalled(): Promise<boolean> {
    const whatsappUrl = Platform.select({
      ios: 'whatsapp://',
      android: 'whatsapp://send',
    });

    if (!whatsappUrl) return false;

    try {
      return await Linking.canOpenURL(whatsappUrl);
    } catch {
      return false;
    }
  },

  /**
   * Open WhatsApp chat with a specific phone number
   */
  async openChat(phoneNumber: string, message?: string): Promise<boolean> {
    // Remove any non-numeric characters and ensure country code
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const formattedNumber = cleanNumber.startsWith('233')
      ? cleanNumber
      : `233${cleanNumber.replace(/^0/, '')}`;

    const encodedMessage = message ? encodeURIComponent(message) : '';
    const url = `whatsapp://send?phone=${formattedNumber}${encodedMessage ? `&text=${encodedMessage}` : ''}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        Alert.alert(
          'WhatsApp Not Installed',
          'Please install WhatsApp to use this feature.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      console.error('Failed to open WhatsApp:', error);
      return false;
    }
  },

  /**
   * Open WhatsApp support chat
   * Uses BookLoop's official WhatsApp Business number
   */
  async openSupportChat(): Promise<boolean> {
    // TODO: Replace with actual BookLoop support number
    const supportNumber = '233XXXXXXXXX'; // Placeholder
    const welcomeMessage = 'Hi! I need help with BookLoop.';

    return this.openChat(supportNumber, welcomeMessage);
  },

  /**
   * Share a book listing via WhatsApp
   */
  async shareListingViaWhatsApp(
    bookTitle: string,
    bookAuthor: string,
    listingUrl: string
  ): Promise<boolean> {
    const message = `Check out "${bookTitle}" by ${bookAuthor} on BookLoop!\n\n${listingUrl}`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Send exchange meeting reminder via WhatsApp
   * (Placeholder for future bot integration)
   */
  async sendMeetingReminder(
    phoneNumber: string,
    partnerName: string,
    meetupLocation: string,
    meetupTime: string
  ): Promise<boolean> {
    const message = WhatsAppTemplates.MEETING_REMINDER
      .replace('{{userName}}', partnerName)
      .replace('{{location}}', meetupLocation)
      .replace('{{time}}', meetupTime);

    return this.openChat(phoneNumber, message);
  },

  // ============================================
  // Future Bot Integration Methods (Placeholders)
  // ============================================

  /**
   * Register user for WhatsApp notifications
   * TODO: Implement when WhatsApp Cloud API is set up
   */
  async registerForNotifications(_userId: string, _phoneNumber: string): Promise<void> {
    console.log('[WhatsApp] registerForNotifications - Not yet implemented');
    // Future: POST to backend to register for WhatsApp notifications
  },

  /**
   * Unregister user from WhatsApp notifications
   * TODO: Implement when WhatsApp Cloud API is set up
   */
  async unregisterFromNotifications(_userId: string): Promise<void> {
    console.log('[WhatsApp] unregisterFromNotifications - Not yet implemented');
    // Future: POST to backend to unregister from WhatsApp notifications
  },

  /**
   * Send exchange notification via WhatsApp Bot
   * TODO: Implement when WhatsApp Cloud API is set up
   */
  async sendExchangeNotification(
    _type: 'new_request' | 'accepted' | 'reminder',
    _exchangeId: string
  ): Promise<void> {
    console.log('[WhatsApp] sendExchangeNotification - Not yet implemented');
    // Future: POST to backend to trigger WhatsApp bot message
  },

  /**
   * Send verification reminder via WhatsApp Bot
   * TODO: Implement when WhatsApp Cloud API is set up
   */
  async sendVerificationReminder(_userId: string): Promise<void> {
    console.log('[WhatsApp] sendVerificationReminder - Not yet implemented');
    // Future: POST to backend to trigger WhatsApp bot message
  },
};

export default whatsappService;
