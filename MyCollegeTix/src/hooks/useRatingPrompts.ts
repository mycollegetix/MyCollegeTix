// src/hooks/useRatingPrompts.ts
// Hook for managing rating prompt logic and modal state on the Tickets screen

import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { supabase } from "@/src/lib/supabase";
import { OrderItem } from "@/src/components/tickets/types";
import { SellerRatingData } from "@/src/components/SellerRatingModal";

interface RatingPrompt {
  id: string;
  order_id: string;
  ratee_id: string;
  ratee_name: string;
  ticket_title: string;
}

export interface UseRatingPromptsReturn {
  // Buyer rates seller (auto-prompt from needsSellerRating)
  sellerRating: {
    visible: boolean;
    ticket: OrderItem | null;
    saving: boolean;
    onRate: (item: OrderItem) => void;
    onConfirm: (data: SellerRatingData) => Promise<void>;
    onClose: () => void;
  };
  // Seller rates buyer (from rating_prompts table)
  sellerRatingBuyer: {
    visible: boolean;
    prompt: RatingPrompt | null;
    saving: boolean;
    onConfirm: (data: SellerRatingData) => Promise<void>;
    onClose: () => void;
  };
  // Buyer rates seller (from rating_prompts table)
  buyerRatingSeller: {
    visible: boolean;
    prompt: RatingPrompt | null;
    saving: boolean;
    onConfirm: (data: SellerRatingData) => Promise<void>;
    onClose: () => void;
  };
  // For triggering pending rating check after tab switch
  checkForPendingRatings: () => void;
}

export function useRatingPrompts(
  userId: string | undefined,
  purchases: OrderItem[],
  activeTab: string,
  loadData: () => Promise<void>
): UseRatingPromptsReturn {
  // ─── Buyer rates seller (auto-prompt) ──────────────────────────────
  const [sellerRatingVisible, setSellerRatingVisible] = useState(false);
  const [selectedTicketForRating, setSelectedTicketForRating] =
    useState<OrderItem | null>(null);
  const [savingRating, setSavingRating] = useState(false);

  // ─── Seller rates buyer (from rating_prompts) ─────────────────────
  const [pendingSellerRatingPrompt, setPendingSellerRatingPrompt] =
    useState<RatingPrompt | null>(null);
  const [sellerRatingBuyerVisible, setSellerRatingBuyerVisible] =
    useState(false);
  const [savingSellerRating, setSavingSellerRating] = useState(false);

  // ─── Buyer rates seller (from rating_prompts) ─────────────────────
  const [pendingBuyerRatingPrompt, setPendingBuyerRatingPrompt] =
    useState<RatingPrompt | null>(null);
  const [buyerRatingSellerVisible, setBuyerRatingSellerVisible] =
    useState(false);
  const [savingBuyerRating, setSavingBuyerRating] = useState(false);

  // ─── Auto-check for pending ratings ────────────────────────────────
  const checkForPendingRatings = useCallback(() => {
    const ticketNeedingRating = purchases.find(
      (ticket) => ticket.needsSellerRating
    );
    if (ticketNeedingRating && !sellerRatingVisible) {
      setSelectedTicketForRating(ticketNeedingRating);
      setSellerRatingVisible(true);
    }
  }, [purchases, sellerRatingVisible]);

  useEffect(() => {
    checkForPendingRatings();
  }, [purchases]);

  // ─── Check for seller-rates-buyer prompts ──────────────────────────
  const checkForSellerRatingPrompts = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: prompts, error } = await supabase
        .from("rating_prompts")
        .select(`id, ticket_sale_id, ratee_id, prompt_type`)
        .eq("prompter_id", userId)
        .eq("prompt_type", "seller_rate_buyer")
        .eq("status", "pending")
        .limit(1)
        .single();

      if (error || !prompts) return;

      const { data: order } = await supabase
        .from("orders")
        .select(
          `id, buyer:profiles!orders_buyer_id_fkey(full_name), ticket:tickets!orders_ticket_id_fkey(title)`
        )
        .eq("id", prompts.ticket_sale_id)
        .single();

      if (order) {
        setPendingSellerRatingPrompt({
          id: prompts.id,
          order_id: order.id,
          ratee_id: prompts.ratee_id,
          ratee_name: order.buyer?.full_name || "Buyer",
          ticket_title: order.ticket?.title || "Ticket",
        });
        setTimeout(() => setSellerRatingBuyerVisible(true), 500);
      }
    } catch (err) {
      console.log("No pending seller rating prompts");
    }
  }, [userId]);

  // ─── Check for buyer-rates-seller prompts ──────────────────────────
  const checkForBuyerRatingPrompts = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: prompts, error } = await supabase
        .from("rating_prompts")
        .select(`id, ticket_sale_id, ratee_id, prompt_type`)
        .eq("prompter_id", userId)
        .eq("prompt_type", "buyer_rate_seller")
        .eq("status", "pending")
        .limit(1)
        .single();

      if (error || !prompts) return;

      const { data: order } = await supabase
        .from("orders")
        .select(
          `id, seller:profiles!orders_seller_id_fkey(full_name), ticket:tickets!orders_ticket_id_fkey(title)`
        )
        .eq("id", prompts.ticket_sale_id)
        .single();

      if (order) {
        setPendingBuyerRatingPrompt({
          id: prompts.id,
          order_id: order.id,
          ratee_id: prompts.ratee_id,
          ratee_name: order.seller?.full_name || "Seller",
          ticket_title: order.ticket?.title || "Ticket",
        });
        setTimeout(() => setBuyerRatingSellerVisible(true), 500);
      }
    } catch (err) {
      console.log("No pending buyer rating prompts");
    }
  }, [userId]);

  useEffect(() => {
    if (userId && activeTab === "selling") checkForSellerRatingPrompts();
  }, [userId, activeTab]);

  useEffect(() => {
    if (userId && activeTab === "bought") checkForBuyerRatingPrompts();
  }, [userId, activeTab]);

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleRateSeller = (ticket: OrderItem) => {
    setSelectedTicketForRating(ticket);
    setSellerRatingVisible(true);
  };

  const handleConfirmSellerRating = async (ratingData: SellerRatingData) => {
    if (!selectedTicketForRating || !userId) return;
    setSavingRating(true);
    try {
      const { error } = await supabase.from("user_ratings").insert({
        rater_id: userId,
        rated_user_id: selectedTicketForRating.seller_id!,
        ticket_sale_id: selectedTicketForRating.order_id!,
        transaction_type: "buying" as const,
        rating: ratingData.rating,
        review_text: ratingData.review || null,
      });
      if (error) throw error;

      Alert.alert("Success", "Rating submitted successfully!");
      setSellerRatingVisible(false);
      setSelectedTicketForRating(null);
      await loadData();
      setTimeout(() => checkForPendingRatings(), 500);
    } catch (error) {
      console.error("Error submitting seller rating:", error);
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    } finally {
      setSavingRating(false);
    }
  };

  const handleConfirmSellerRatingBuyer = async (
    ratingData: SellerRatingData
  ) => {
    if (!pendingSellerRatingPrompt || !userId) return;
    setSavingSellerRating(true);
    try {
      const { error } = await supabase.from("user_ratings").insert({
        rater_id: userId,
        rated_user_id: pendingSellerRatingPrompt.ratee_id,
        ticket_sale_id: pendingSellerRatingPrompt.order_id,
        transaction_type: "selling" as const,
        rating: ratingData.rating,
        review_text: ratingData.review || null,
      });
      if (error) throw error;

      await supabase
        .from("rating_prompts")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", pendingSellerRatingPrompt.id);

      Alert.alert("Thank You!", "Your rating for the buyer has been submitted.");
      setSellerRatingBuyerVisible(false);
      setPendingSellerRatingPrompt(null);
      setTimeout(() => checkForSellerRatingPrompts(), 500);
    } catch (error) {
      console.error("Error submitting buyer rating:", error);
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    } finally {
      setSavingSellerRating(false);
    }
  };

  const handleConfirmBuyerRatingSeller = async (
    ratingData: SellerRatingData
  ) => {
    if (!pendingBuyerRatingPrompt || !userId) return;
    setSavingBuyerRating(true);
    try {
      const { error } = await supabase.from("user_ratings").insert({
        rater_id: userId,
        rated_user_id: pendingBuyerRatingPrompt.ratee_id,
        ticket_sale_id: pendingBuyerRatingPrompt.order_id,
        transaction_type: "buying" as const,
        rating: ratingData.rating,
        review_text: ratingData.review || null,
      });
      if (error) throw error;

      await supabase
        .from("rating_prompts")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", pendingBuyerRatingPrompt.id);

      Alert.alert(
        "Thank You!",
        "Your rating for the seller has been submitted."
      );
      setBuyerRatingSellerVisible(false);
      setPendingBuyerRatingPrompt(null);
      setTimeout(() => checkForBuyerRatingPrompts(), 500);
    } catch (error) {
      console.error("Error submitting seller rating:", error);
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    } finally {
      setSavingBuyerRating(false);
    }
  };

  return {
    sellerRating: {
      visible: sellerRatingVisible,
      ticket: selectedTicketForRating,
      saving: savingRating,
      onRate: handleRateSeller,
      onConfirm: handleConfirmSellerRating,
      onClose: () => {
        setSellerRatingVisible(false);
        setSelectedTicketForRating(null);
        setTimeout(() => checkForPendingRatings(), 300);
      },
    },
    sellerRatingBuyer: {
      visible: sellerRatingBuyerVisible,
      prompt: pendingSellerRatingPrompt,
      saving: savingSellerRating,
      onConfirm: handleConfirmSellerRatingBuyer,
      onClose: () => {
        setSellerRatingBuyerVisible(false);
        if (pendingSellerRatingPrompt) {
          supabase
            .from("rating_prompts")
            .update({ status: "dismissed" })
            .eq("id", pendingSellerRatingPrompt.id);
        }
        setPendingSellerRatingPrompt(null);
      },
    },
    buyerRatingSeller: {
      visible: buyerRatingSellerVisible,
      prompt: pendingBuyerRatingPrompt,
      saving: savingBuyerRating,
      onConfirm: handleConfirmBuyerRatingSeller,
      onClose: () => {
        setBuyerRatingSellerVisible(false);
        if (pendingBuyerRatingPrompt) {
          supabase
            .from("rating_prompts")
            .update({ status: "dismissed" })
            .eq("id", pendingBuyerRatingPrompt.id);
        }
        setPendingBuyerRatingPrompt(null);
      },
    },
    checkForPendingRatings,
  };
}
