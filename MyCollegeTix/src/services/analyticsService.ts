// src/services/analyticsService.ts
// Centralized Google Analytics 4 service via Firebase Analytics
// Gracefully no-ops when Firebase native modules aren't available (e.g. Expo Go)

// Dynamically import to avoid crash when native module isn't linked
let analyticsModule: any = null;
let firebaseAvailable = false;

try {
  analyticsModule = require("@react-native-firebase/analytics").default;
  // Test that the native module is actually available
  analyticsModule();
  firebaseAvailable = true;
} catch (e) {
  console.warn("Firebase Analytics not available — events will be no-ops");
}

function getAnalytics() {
  if (!firebaseAvailable || !analyticsModule) return null;
  return analyticsModule();
}

// Standard GA4 item structure for e-commerce events
interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_category?: string; // sport
  price?: number;
}

function buildItem(ticket: {
  id: string;
  title: string;
  sport?: string | null;
  price?: number;
}): AnalyticsItem {
  return {
    item_id: ticket.id,
    item_name: ticket.title,
    ...(ticket.sport && { item_category: ticket.sport }),
    ...(ticket.price != null && { price: ticket.price }),
  };
}

export const analyticsService = {
  // ─── Screen Tracking ───────────────────────────────────────────

  async logScreenView(screenName: string, screenClass?: string) {
    try {
      await getAnalytics()?.logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (e) {
      console.warn("Analytics: screen_view failed", e);
    }
  },

  // ─── Auth Events ───────────────────────────────────────────────

  async logLogin(method: "email" | "google" | "microsoft") {
    try {
      await getAnalytics()?.logLogin({ method });
    } catch (e) {
      console.warn("Analytics: login failed", e);
    }
  },

  async logSignUp(method: "email" | "google" | "microsoft") {
    try {
      await getAnalytics()?.logSignUp({ method });
    } catch (e) {
      console.warn("Analytics: sign_up failed", e);
    }
  },

  async logLogout() {
    try {
      await getAnalytics()?.logEvent("logout");
    } catch (e) {
      console.warn("Analytics: logout failed", e);
    }
  },

  // ─── E-commerce Funnel ─────────────────────────────────────────

  async logViewItem(ticket: {
    id: string;
    title: string;
    sport?: string | null;
    price?: number;
  }) {
    try {
      await getAnalytics()?.logViewItem({
        items: [buildItem(ticket) as any],
        ...(ticket.price != null && {
          value: ticket.price,
          currency: "USD",
        }),
      });
    } catch (e) {
      console.warn("Analytics: view_item failed", e);
    }
  },

  async logAddToWishlist(ticket: {
    id: string;
    title: string;
    sport?: string | null;
    price?: number;
  }) {
    try {
      await getAnalytics()?.logAddToWishlist({
        items: [buildItem(ticket) as any],
        ...(ticket.price != null && {
          value: ticket.price,
          currency: "USD",
        }),
      });
    } catch (e) {
      console.warn("Analytics: add_to_wishlist failed", e);
    }
  },

  async logRemoveFromWishlist(ticketId: string) {
    try {
      await getAnalytics()?.logEvent("remove_from_wishlist", {
        item_id: ticketId,
      });
    } catch (e) {
      console.warn("Analytics: remove_from_wishlist failed", e);
    }
  },

  async logBeginCheckout(ticket: {
    id: string;
    title: string;
    sport?: string | null;
    price: number;
  }) {
    try {
      await getAnalytics()?.logBeginCheckout({
        items: [buildItem(ticket) as any],
        value: ticket.price,
        currency: "USD",
      });
    } catch (e) {
      console.warn("Analytics: begin_checkout failed", e);
    }
  },

  async logPurchase(
    orderId: string,
    ticket: {
      id: string;
      title: string;
      sport?: string | null;
      price: number;
    },
    amount: number
  ) {
    try {
      await getAnalytics()?.logPurchase({
        transaction_id: orderId,
        items: [buildItem(ticket) as any],
        value: amount,
        currency: "USD",
      });
    } catch (e) {
      console.warn("Analytics: purchase failed", e);
    }
  },

  async logRefund(orderId: string, amount: number, reason?: string) {
    try {
      const a = getAnalytics();
      await a?.logRefund({
        transaction_id: orderId,
        value: amount,
        currency: "USD",
      });
      if (reason) {
        await a?.logEvent("refund_reason", { reason });
      }
    } catch (e) {
      console.warn("Analytics: refund failed", e);
    }
  },

  // ─── Seller Events ────────────────────────────────────────────

  async logListItem(ticket: {
    id: string;
    title: string;
    sport?: string | null;
    price: number;
  }) {
    try {
      await getAnalytics()?.logEvent("list_item", {
        item_id: ticket.id,
        item_name: ticket.title,
        ...(ticket.sport && { item_category: ticket.sport }),
        price: ticket.price,
        currency: "USD",
      });
    } catch (e) {
      console.warn("Analytics: list_item failed", e);
    }
  },

  async logTransferSent(orderId: string) {
    try {
      await getAnalytics()?.logEvent("transfer_sent", {
        order_id: orderId,
      });
    } catch (e) {
      console.warn("Analytics: transfer_sent failed", e);
    }
  },

  async logReceiptConfirmed(orderId: string) {
    try {
      await getAnalytics()?.logEvent("receipt_confirmed", {
        order_id: orderId,
      });
    } catch (e) {
      console.warn("Analytics: receipt_confirmed failed", e);
    }
  },

  async logPayoutReceived(orderId: string, amount: number) {
    try {
      await getAnalytics()?.logEvent("payout_received", {
        order_id: orderId,
        value: amount,
        currency: "USD",
      });
    } catch (e) {
      console.warn("Analytics: payout_received failed", e);
    }
  },

  // ─── Engagement Events ─────────────────────────────────────────

  async logMessageSent(conversationId: string) {
    try {
      await getAnalytics()?.logEvent("message_sent", {
        conversation_id: conversationId,
      });
    } catch (e) {
      console.warn("Analytics: message_sent failed", e);
    }
  },

  async logDisputeOpened(orderId: string, reason: string) {
    try {
      await getAnalytics()?.logEvent("dispute_opened", {
        order_id: orderId,
        reason,
      });
    } catch (e) {
      console.warn("Analytics: dispute_opened failed", e);
    }
  },

  async logStripeOnboardingStarted() {
    try {
      await getAnalytics()?.logEvent("stripe_onboarding_started");
    } catch (e) {
      console.warn("Analytics: stripe_onboarding_started failed", e);
    }
  },

  async logStripeOnboardingCompleted() {
    try {
      await getAnalytics()?.logEvent("stripe_onboarding_completed");
    } catch (e) {
      console.warn("Analytics: stripe_onboarding_completed failed", e);
    }
  },

  // ─── User Properties ──────────────────────────────────────────

  async setUserProperties(
    userId: string,
    college?: string | null,
    isAdmin?: boolean
  ) {
    try {
      const a = getAnalytics();
      await a?.setUserId(userId);
      if (college) {
        await a?.setUserProperty("college", college);
      }
      if (isAdmin != null) {
        await a?.setUserProperty("is_admin", String(isAdmin));
      }
    } catch (e) {
      console.warn("Analytics: setUserProperties failed", e);
    }
  },

  async clearUserProperties() {
    try {
      const a = getAnalytics();
      await a?.setUserId(null);
      await a?.setUserProperty("college", null);
      await a?.setUserProperty("is_admin", null);
    } catch (e) {
      console.warn("Analytics: clearUserProperties failed", e);
    }
  },
};
