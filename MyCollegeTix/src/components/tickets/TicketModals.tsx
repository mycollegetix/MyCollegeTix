// src/components/tickets/TicketModals.tsx
// All modal rendering for the Tickets screen

import React from "react";
import TicketEditModal, { TicketEditData } from "@/src/components/TicketEditModal";
import TicketSaleModal, { TicketSaleData } from "@/src/components/TicketSaleModal";
import SellerRatingModal from "@/src/components/SellerRatingModal";
import TransferProofModal from "@/src/components/TransferProofModal";
import { OrderItem } from "./types";
import { UseRatingPromptsReturn } from "@/src/hooks/useRatingPrompts";

interface TicketModalsProps {
  // Colors
  primaryColor: string;
  secondaryColor: string;

  // Edit modal
  editVisible: boolean;
  editTicket: OrderItem | null;
  editSaving: boolean;
  onEditClose: () => void;
  onEditSave: (data: TicketEditData) => Promise<void>;

  // Sale modal
  saleVisible: boolean;
  saleTicket: OrderItem | null;
  saleSaving: boolean;
  onSaleClose: () => void;
  onSaleConfirm: (data: TicketSaleData) => Promise<void>;

  // Rating modals (from useRatingPrompts hook)
  ratings: UseRatingPromptsReturn;

  // Transfer proof modal
  transferProofVisible: boolean;
  transferItem: OrderItem | null;
  onTransferProofClose: () => void;
  onTransferProofConfirm: (proofImageUri: string | null) => Promise<void>;
}

export function TicketModals({
  primaryColor,
  secondaryColor,
  editVisible,
  editTicket,
  editSaving,
  onEditClose,
  onEditSave,
  saleVisible,
  saleTicket,
  saleSaving,
  onSaleClose,
  onSaleConfirm,
  ratings,
  transferProofVisible,
  transferItem,
  onTransferProofClose,
  onTransferProofConfirm,
}: TicketModalsProps) {
  return (
    <>
      {/* Edit Modal */}
      <TicketEditModal
        visible={editVisible}
        onClose={onEditClose}
        onSave={onEditSave}
        ticket={
          editTicket
            ? {
                id: editTicket.id,
                title: editTicket.title,
                price: editTicket.price,
                description: editTicket.description,
              }
            : null
        }
        isLoading={editSaving}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />

      {/* Sale Modal */}
      {saleTicket && (
        <TicketSaleModal
          visible={saleVisible}
          onClose={onSaleClose}
          onConfirmSale={onSaleConfirm}
          ticket={{
            id: saleTicket.id,
            title: saleTicket.title,
            price: saleTicket.price,
          }}
          isLoading={saleSaving}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      )}

      {/* Buyer rates seller (auto-prompt from needsSellerRating) */}
      {ratings.sellerRating.ticket && (
        <SellerRatingModal
          visible={ratings.sellerRating.visible}
          onClose={ratings.sellerRating.onClose}
          onConfirmRating={ratings.sellerRating.onConfirm}
          ticket={{
            id: ratings.sellerRating.ticket.id,
            title: ratings.sellerRating.ticket.title,
            seller_name:
              ratings.sellerRating.ticket.seller_name || "Unknown Seller",
          }}
          isLoading={ratings.sellerRating.saving}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      )}

      {/* Seller rates buyer (from rating_prompts) */}
      {ratings.sellerRatingBuyer.prompt && (
        <SellerRatingModal
          visible={ratings.sellerRatingBuyer.visible}
          onClose={ratings.sellerRatingBuyer.onClose}
          onConfirmRating={ratings.sellerRatingBuyer.onConfirm}
          ticket={{
            id: ratings.sellerRatingBuyer.prompt.order_id,
            title: ratings.sellerRatingBuyer.prompt.ticket_title,
            seller_name: ratings.sellerRatingBuyer.prompt.ratee_name,
          }}
          isLoading={ratings.sellerRatingBuyer.saving}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          isSellerRatingBuyer={true}
        />
      )}

      {/* Buyer rates seller (from rating_prompts) */}
      {ratings.buyerRatingSeller.prompt && (
        <SellerRatingModal
          visible={ratings.buyerRatingSeller.visible}
          onClose={ratings.buyerRatingSeller.onClose}
          onConfirmRating={ratings.buyerRatingSeller.onConfirm}
          ticket={{
            id: ratings.buyerRatingSeller.prompt.order_id,
            title: ratings.buyerRatingSeller.prompt.ticket_title,
            seller_name: ratings.buyerRatingSeller.prompt.ratee_name,
          }}
          isLoading={ratings.buyerRatingSeller.saving}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          isSellerRatingBuyer={false}
        />
      )}

      {/* Transfer Proof Modal */}
      {transferItem && (
        <TransferProofModal
          visible={transferProofVisible}
          onClose={onTransferProofClose}
          onConfirm={onTransferProofConfirm}
          ticketTitle={transferItem.title}
          buyerName={transferItem.buyer_name || "Buyer"}
          primaryColor={primaryColor}
        />
      )}
    </>
  );
}

export default TicketModals;
