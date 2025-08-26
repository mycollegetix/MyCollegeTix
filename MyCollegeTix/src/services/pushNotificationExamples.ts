// services/pushNotificationExamples.ts
// Examples of how to use the push notification system

import { NotificationService } from './notificationService';

/**
 * Example usage of the push notification system
 */
export class PushNotificationExamples {
  
  // Example 1: Send notification when someone purchases a ticket
  static async notifyTicketPurchased(
    sellerId: string,
    buyerName: string,
    ticketTitle: string,
    ticketId: string,
    orderId: string
  ) {
    await NotificationService.createAndSendNotification(
      sellerId,
      {
        title: "Ticket Sold!",
        message: `${buyerName} purchased your ${ticketTitle} ticket`,
        type: "sale",
        related_ticket_id: ticketId,
        related_order_id: orderId,
      },
      {
        screen: `/ticket-details/${ticketId}`,
        ticket_id: ticketId,
        order_id: orderId,
      }
    );
  }

  // Example 2: Send notification when a new ticket is listed
  static async notifyNewTicketListed(
    interestedUserIds: string[],
    eventTitle: string,
    ticketPrice: number,
    ticketId: string
  ) {
    await NotificationService.sendPushNotification(
      interestedUserIds,
      "New Ticket Available!",
      `${eventTitle} ticket listed for $${ticketPrice}`,
      {
        screen: `/ticket-details/${ticketId}`,
        ticket_id: ticketId,
        type: 'listing'
      }
    );
  }

  // Example 3: Send reminder notification 
  static async scheduleEventReminder(
    userId: string,
    eventTitle: string,
    eventDate: Date,
    ticketId: string
  ) {
    // Schedule local notification for 1 hour before event
    const reminderTime = new Date(eventDate.getTime() - 60 * 60 * 1000);
    
    // Schedule local notification for 1 hour before event - disabled for now
    // await NotificationService.scheduleLocalNotification(
    //   "Event Reminder",
    //   `Your event "${eventTitle}" starts in 1 hour!`,
    //   reminderTime,
    //   {
    //     screen: `/ticket-details/${ticketId}`,
    //     ticket_id: ticketId,
    //     type: 'reminder'
    //   }
    // );
  }

  // Example 4: Send system notification
  static async notifySystemUpdate(
    userIds: string[],
    updateTitle: string,
    updateDescription: string
  ) {
    await NotificationService.sendPushNotification(
      userIds,
      updateTitle,
      updateDescription,
      {
        screen: '/notifications',
        type: 'system'
      }
    );
  }

  // Example 5: Send chat message notification
  static async notifyChatMessage(
    receiverId: string,
    senderName: string,
    messagePreview: string,
    chatId: string
  ) {
    await NotificationService.createAndSendNotification(
      receiverId,
      {
        title: `Message from ${senderName}`,
        message: messagePreview,
        type: "system", // You might want to add a 'message' type
      },
      {
        screen: `/chat/${chatId}`,
        chat_id: chatId,
        type: 'message'
      }
    );
  }

  // Example 6: Send price drop notification
  static async notifyPriceDrop(
    watchlistUserIds: string[],
    eventTitle: string,
    oldPrice: number,
    newPrice: number,
    ticketId: string
  ) {
    const savings = oldPrice - newPrice;
    
    await NotificationService.sendPushNotification(
      watchlistUserIds,
      "Price Drop Alert!",
      `${eventTitle} ticket price dropped by $${savings} to $${newPrice}`,
      {
        screen: `/ticket-details/${ticketId}`,
        ticket_id: ticketId,
        type: 'price_drop',
        old_price: oldPrice,
        new_price: newPrice
      }
    );
  }

  // Example 7: Test notification (for development)
  static async sendTestNotification(userId: string) {
    await NotificationService.createAndSendNotification(
      userId,
      {
        title: "Test Notification",
        message: "This is a test push notification from MyCollegeTix!",
        type: "system",
      },
      {
        screen: '/notifications',
        type: 'test'
      }
    );
  }
}

/**
 * Integration examples for different parts of the app
 */
export class NotificationIntegrationExamples {
  
  // In ticket purchase flow
  static async handleTicketPurchase(
    ticketId: string,
    sellerId: string,
    buyerId: string,
    orderId: string
  ) {
    // Send notification to seller
    await PushNotificationExamples.notifyTicketPurchased(
      sellerId,
      "A buyer", // You'd get actual buyer name from user data
      "Event Ticket", // You'd get actual ticket title
      ticketId,
      orderId
    );

    // Send confirmation to buyer
    await NotificationService.createAndSendNotification(
      buyerId,
      {
        title: "Purchase Confirmed!",
        message: "Your ticket purchase was successful",
        type: "purchase",
        related_ticket_id: ticketId,
        related_order_id: orderId,
      },
      {
        screen: `/orders`,
        order_id: orderId,
      }
    );
  }

  // In watchlist service
  static async handleWatchlistAlert(
    watchlistUserIds: string[],
    eventTitle: string,
    ticketId: string
  ) {
    await PushNotificationExamples.notifyNewTicketListed(
      watchlistUserIds,
      eventTitle,
      100, // You'd get actual price
      ticketId
    );
  }

  // In admin panel
  static async sendBulkNotification(
    userIds: string[],
    title: string,
    message: string,
    deepLinkScreen?: string
  ) {
    await NotificationService.sendPushNotification(
      userIds,
      title,
      message,
      {
        screen: deepLinkScreen || '/notifications',
        type: 'admin_broadcast'
      }
    );
  }
}