// src/services/ticketTransferService.ts
import { supabase } from '../lib/supabase';
import { Linking, Alert } from 'react-native';

export interface TicketTransferInfo {
  collegeId: string;
  collegeName: string;
  transferPortalUrl: string | null;
  hasTransferPortal: boolean;
}

export class TicketTransferService {
  /**
   * Get transfer portal information for a college
   */
  static async getTransferPortalInfo(collegeId: string): Promise<{
    data: TicketTransferInfo | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('id, name, short_name, transfer_portal_url')
        .eq('id', collegeId)
        .single();

      if (error) {
        return { data: null, error };
      }

      return {
        data: {
          collegeId: data.id,
          collegeName: data.name,
          transferPortalUrl: data.transfer_portal_url,
          hasTransferPortal: !!data.transfer_portal_url,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error fetching transfer portal info:', error);
      return { data: null, error };
    }
  }

  /**
   * Open the transfer portal URL for a college
   */
  static async openTransferPortal(
    collegeId: string,
    ticketInfo?: {
      title: string;
      eventDate: string;
      section?: string;
      row?: string;
      seat?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: transferInfo, error } = await this.getTransferPortalInfo(collegeId);

      if (error || !transferInfo) {
        return { success: false, error: 'Unable to get transfer portal information' };
      }

      if (!transferInfo.hasTransferPortal) {
        Alert.alert(
          'Transfer Portal Not Available',
          `${transferInfo.collegeName} doesn't have a ticket transfer portal configured. Please contact your college's athletic department for ticket transfer information.`,
          [{ text: 'OK' }]
        );
        return { success: false, error: 'Transfer portal not configured' };
      }

      // Check if URL can be opened
      const supported = await Linking.canOpenURL(transferInfo.transferPortalUrl!);
      
      if (!supported) {
        Alert.alert(
          'Cannot Open Transfer Portal',
          'Unable to open the ticket transfer portal. Please check your device settings or try again later.',
          [{ text: 'OK' }]
        );
        return { success: false, error: 'Cannot open URL' };
      }

      // Show confirmation dialog with ticket info
      return new Promise((resolve) => {
        const ticketDetails = ticketInfo 
          ? `\n\nTicket Details:\n${ticketInfo.title}\n${ticketInfo.eventDate}${
              ticketInfo.section ? `\nSection ${ticketInfo.section}` : ''
            }${
              ticketInfo.row ? ` • Row ${ticketInfo.row}` : ''
            }${
              ticketInfo.seat ? ` • Seat ${ticketInfo.seat}` : ''
            }`
          : '';

        Alert.alert(
          'Open Ticket Transfer Portal',
          `This will open ${transferInfo.collegeName}'s official ticket transfer portal where you can securely transfer your tickets.${ticketDetails}\n\nContinue to transfer portal?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve({ success: false, error: 'User cancelled' })
            },
            {
              text: 'Open Portal',
              onPress: async () => {
                try {
                  await Linking.openURL(transferInfo.transferPortalUrl!);
                  resolve({ success: true });
                } catch (error) {
                  console.error('Error opening transfer portal:', error);
                  Alert.alert(
                    'Error',
                    'Unable to open the transfer portal. Please try again later.',
                    [{ text: 'OK' }]
                  );
                  resolve({ success: false, error: 'Failed to open URL' });
                }
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('Error opening transfer portal:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  /**
   * Get all colleges with transfer portals
   */
  static async getCollegesWithTransferPortals(): Promise<{
    data: TicketTransferInfo[];
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('id, name, short_name, transfer_portal_url')
        .not('transfer_portal_url', 'is', null)
        .order('name');

      if (error) {
        return { data: [], error };
      }

      const transferInfos = data.map(college => ({
        collegeId: college.id,
        collegeName: college.name,
        transferPortalUrl: college.transfer_portal_url,
        hasTransferPortal: !!college.transfer_portal_url,
      }));

      return { data: transferInfos, error: null };
    } catch (error) {
      console.error('Error fetching colleges with transfer portals:', error);
      return { data: [], error };
    }
  }
}