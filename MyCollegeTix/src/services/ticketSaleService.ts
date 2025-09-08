import { supabase } from '@/src/lib/supabase';
import { TicketSaleData } from '@/src/components/TicketSaleModal';

export interface TicketSale {
  id: string;
  created_at: string;
  updated_at: string;
  ticket_id: string;
  seller_id: string;
  seller_name: string | null;
  buyer_id: string | null;
  buyer_name: string;
  sale_price: number;
  payment_method: string | null;
  additional_notes: string | null;
  original_asking_price: number | null;
}

export class TicketSaleService {
  /**
   * Record a ticket sale with the provided information
   */
  static async recordTicketSale(
    ticketId: string,
    sellerId: string,
    sellerName: string,
    originalPrice: number,
    saleData: TicketSaleData
  ): Promise<{ success: boolean; error?: string; data?: TicketSale }> {
    try {
      // Validate input
      const salePrice = parseFloat(saleData.salePrice);
      if (isNaN(salePrice) || salePrice < 0) {
        return { success: false, error: 'Invalid sale price' };
      }

      if (!saleData.buyerName.trim()) {
        return { success: false, error: 'Buyer name is required' };
      }

      // Insert sale record
      const { data, error } = await supabase
        .from('ticket_sales')
        .insert({
          ticket_id: ticketId,
          seller_id: sellerId,
          seller_name: sellerName.trim(),
          buyer_id: saleData.buyerId || null,
          buyer_name: saleData.buyerName.trim(),
          sale_price: salePrice,
          payment_method: saleData.paymentMethod || null,
          additional_notes: saleData.additionalNotes?.trim() || null,
          original_asking_price: originalPrice,
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording ticket sale:', error);
        return { success: false, error: error.message };
      }

      // If seller provided a rating for the buyer, submit it
      if (saleData.buyerId && saleData.buyerRating && saleData.buyerRating > 0) {
        try {
          const ratingData = {
            rater_id: sellerId,
            rated_user_id: saleData.buyerId,
            ticket_sale_id: data.id,
            transaction_type: 'selling' as 'buying' | 'selling', // Seller is rating buyer
            rating: saleData.buyerRating,
            review_text: saleData.buyerReview?.trim() || null,
            communication_rating: saleData.communicationRating || null,
            reliability_rating: saleData.reliabilityRating || null,
            transaction_smoothness: saleData.transactionSmoothness || null,
          };

          const { error: ratingError } = await supabase
            .from('user_ratings')
            .insert([ratingData]);

          if (ratingError) {
            console.error('Error submitting seller rating:', ratingError);
            // Don't fail the entire sale if rating submission fails
            console.warn('Sale recorded successfully but rating submission failed');
          } else {
            console.log('✅ Seller rating submitted successfully');
          }
        } catch (ratingError) {
          console.error('Unexpected error submitting rating:', ratingError);
          // Continue - don't fail the sale for rating issues
        }
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error recording ticket sale:', error);
      return { success: false, error: 'Failed to record sale information' };
    }
  }

  /**
   * Get sale information for a specific ticket
   */
  static async getTicketSale(
    ticketId: string
  ): Promise<{ success: boolean; error?: string; data?: TicketSale }> {
    try {
      const { data, error } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('ticket_id', ticketId)
        .single();

      if (error) {
        console.error('Error fetching ticket sale:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error fetching ticket sale:', error);
      return { success: false, error: 'Failed to fetch sale information' };
    }
  }

  /**
   * Get all sales for a specific seller
   */
  static async getSellerSales(
    sellerId: string,
    limit: number = 50
  ): Promise<{ success: boolean; error?: string; data?: TicketSale[] }> {
    try {
      const { data, error } = await supabase
        .from('ticket_sales')
        .select(`
          *,
          tickets (
            title,
            event_date,
            location
          )
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching seller sales:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error fetching seller sales:', error);
      return { success: false, error: 'Failed to fetch sales history' };
    }
  }

  /**
   * Get sale statistics for a seller
   */
  static async getSellerSaleStats(
    sellerId: string
  ): Promise<{
    success: boolean;
    error?: string;
    data?: {
      totalSales: number;
      totalRevenue: number;
      averageSalePrice: number;
      profitLoss: number;
    };
  }> {
    try {
      const { data, error } = await supabase
        .from('ticket_sales')
        .select('sale_price, original_asking_price')
        .eq('seller_id', sellerId);

      if (error) {
        console.error('Error fetching sale stats:', error);
        return { success: false, error: error.message };
      }

      const totalSales = data.length;
      const totalRevenue = data.reduce((sum, sale) => sum + sale.sale_price, 0);
      const totalOriginalPrice = data.reduce(
        (sum, sale) => sum + (sale.original_asking_price || sale.sale_price),
        0
      );
      const averageSalePrice = totalSales > 0 ? totalRevenue / totalSales : 0;
      const profitLoss = totalRevenue - totalOriginalPrice;

      return {
        success: true,
        data: {
          totalSales,
          totalRevenue,
          averageSalePrice,
          profitLoss,
        },
      };
    } catch (error) {
      console.error('Unexpected error calculating sale stats:', error);
      return { success: false, error: 'Failed to calculate sale statistics' };
    }
  }

  /**
   * Admin function to get all sales with pagination
   */
  static async getAllSales(
    page: number = 1,
    limit: number = 50
  ): Promise<{ success: boolean; error?: string; data?: TicketSale[]; count?: number }> {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('ticket_sales')
        .select(`
          *,
          tickets (
            title,
            event_date,
            location
          ),
          profiles!ticket_sales_seller_id_fkey (
            username,
            full_name
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching all sales:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data, count: count || 0 };
    } catch (error) {
      console.error('Unexpected error fetching all sales:', error);
      return { success: false, error: 'Failed to fetch sales data' };
    }
  }

  /**
   * Update database types - call this to regenerate types after migration
   */
  static async updateDatabaseTypes(): Promise<void> {
    // This is a placeholder for type generation
    // In a real app, you'd run: supabase gen types typescript --project-id YOUR_PROJECT_ID
    console.log('Database types should be regenerated after running the migration');
  }
}