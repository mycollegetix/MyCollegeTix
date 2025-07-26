// services/chatService.ts - UPDATED with notifications and moderation
import { supabase } from "../lib/supabase";
import { NotificationService } from "./notificationService"; // ✅ ADDED
import { freeModerationService } from "./freeModerationService"; // ✅ ADDED
import {
  Database,
  MessageWithSender,
  ConversationWithDetails,
  Tables,
} from "../types/database.types";

type Conversation = Tables<"conversations">;
type Message = Tables<"messages">;
type ConversationInsert =
  Database["public"]["Tables"]["conversations"]["Insert"];
type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];

export class ChatService {
  // Send a message - UPDATED to create notifications
  static async sendMessage(
    conversationId: string,
    content: string,
    messageType: "text" | "system" | "ticket_reference" = "text"
  ): Promise<{ data: Message | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // ✅ STEP 0: Moderate content before sending (only for user messages, not system)
      if (messageType === "text") {
        const moderationResult = await freeModerationService.moderateMessage(
          user.id,
          conversationId,
          content
        );

        if (!moderationResult.success) {
          return {
            data: null,
            error: { message: moderationResult.error || "Message violates community guidelines" }
          };
        }
      }

      // ✅ STEP 1: Get conversation details to identify the recipient
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .select(
          `
          *,
          participant_1:profiles!conversations_participant_1_fkey(id, full_name, username),
          participant_2:profiles!conversations_participant_2_fkey(id, full_name, username),
          ticket:tickets(id, title)
        `
        )
        .eq("id", conversationId)
        .single();

      if (convError || !conversation) {
        throw new Error("Conversation not found");
      }

      // ✅ STEP 2: Determine who is receiving the message
      const isParticipant1 = conversation.participant_1_id === user.id;
      const recipient = isParticipant1
        ? conversation.participant_2
        : conversation.participant_1;
      const sender = isParticipant1
        ? conversation.participant_1
        : conversation.participant_2;

      console.log(
        "💬 Sending message from:",
        sender.full_name,
        "to:",
        recipient.full_name
      );

      // ✅ STEP 3: Send the message
      const messageData: MessageInsert = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        message_type: messageType,
      };

      const { data, error } = await supabase
        .from("messages")
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      // ✅ STEP 4: Update conversation's last_message info
      const { error: updateError } = await supabase
        .from("conversations")
        .update({
          last_message_id: data.id,
          last_message_at: data.created_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (updateError) {
        console.error(
          "Warning: Failed to update conversation last_message:",
          updateError
        );
      }

      // ✅ STEP 5: Create notification for the recipient
      try {
        // Create a custom notification entry for the recipient
        const notificationTitle = `New message from ${sender.full_name}`;
        const notificationMessage =
          content.length > 50 ? `${content.substring(0, 50)}...` : content;

        const ticketContext = conversation.ticket
          ? ` about "${conversation.ticket.title}"`
          : "";

        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: recipient.id,
            title: notificationTitle,
            message: `${notificationMessage}${ticketContext}`,
            type: "message", // ✅ UPDATED: Use specific message type
            related_ticket_id: conversation.ticket_id,
            read: false,
          });

        if (notificationError) {
          console.error(
            "Failed to create message notification:",
            notificationError
          );
        } else {
          console.log("✅ Created notification for:", recipient.full_name);
        }
      } catch (notificationError) {
        console.error(
          "Error creating message notification:",
          notificationError
        );
        // Don't fail the message send if notification fails
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error sending message:", error);
      return { data: null, error };
    }
  }

  // Get or create a conversation between two users - FIXED for ticket-specific conversations
  static async getOrCreateConversation(
    otherUserId: string,
    ticketId?: string
  ): Promise<{ data: Conversation | null; error: any }> {
    console.log("🔥 ENTERED ChatService.getOrCreateConversation");

    try {
      console.log("🔍 Getting current user...");
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) {
        console.error("❌ Auth error:", authError);
        throw authError;
      }

      if (!authData?.user) {
        console.error("❌ No user found in auth");
        throw new Error("User not authenticated");
      }

      const user = authData.user;
      console.log("✅ Got user:", user.id);
      console.log(
        "🔍 Creating conversation between:",
        user.id,
        "and",
        otherUserId
      );
      console.log("🔍 Ticket ID:", ticketId);

      // ✅ FIXED: Search for existing conversation including ticket_id
      console.log("🔍 Searching for existing conversation...");
      let query = supabase
        .from("conversations")
        .select("*")
        .or(
          `and(participant_1_id.eq.${user.id},participant_2_id.eq.${otherUserId}),and(participant_1_id.eq.${otherUserId},participant_2_id.eq.${user.id})`
        );

      // ✅ CRITICAL: Add ticket_id to the search if provided
      if (ticketId) {
        query = query.eq("ticket_id", ticketId);
      } else {
        query = query.is("ticket_id", null);
      }

      const { data: existingConversations, error: findError } = await query;

      if (findError) {
        console.error("❌ Error searching for conversation:", findError);
        throw findError;
      }

      console.log(
        "✅ Search result:",
        existingConversations?.length || 0,
        "conversations found"
      );

      if (existingConversations && existingConversations.length > 0) {
        console.log(
          "✅ Found existing conversation:",
          existingConversations[0].id
        );
        return { data: existingConversations[0], error: null };
      }

      // Create new conversation if it doesn't exist
      console.log("🆕 Creating new conversation...");

      // Always order participants consistently to prevent duplicates
      const conversationData: ConversationInsert = {
        participant_1_id: user.id < otherUserId ? user.id : otherUserId,
        participant_2_id: user.id < otherUserId ? otherUserId : user.id,
        ticket_id: ticketId || null, // ✅ IMPORTANT: Include ticket_id
        last_message_id: null,
        last_message_at: null,
      };

      console.log(
        "📝 Conversation data:",
        JSON.stringify(conversationData, null, 2)
      );

      const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert(conversationData)
        .select()
        .single();

      if (createError) {
        console.error("❌ Error creating conversation:", createError);
        console.error("❌ Supabase error details:", {
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          code: createError.code,
        });

        // If there's a constraint violation, try to fetch existing conversation again
        if (createError.code === "23505") {
          console.log(
            "🔄 Unique violation, trying to fetch existing conversation..."
          );
          let retryQuery = supabase
            .from("conversations")
            .select("*")
            .or(
              `and(participant_1_id.eq.${user.id},participant_2_id.eq.${otherUserId}),and(participant_1_id.eq.${otherUserId},participant_2_id.eq.${user.id})`
            );

          if (ticketId) {
            retryQuery = retryQuery.eq("ticket_id", ticketId);
          } else {
            retryQuery = retryQuery.is("ticket_id", null);
          }

          const { data: existingConversation } = await retryQuery.single();

          if (existingConversation) {
            console.log(
              "✅ Found existing conversation after unique violation:",
              existingConversation.id
            );
            return { data: existingConversation, error: null };
          }
        }
        throw createError;
      }

      console.log(
        "✅ Successfully created new conversation:",
        newConversation?.id
      );


      return { data: newConversation, error: null };
    } catch (error) {
      console.error("💥 Error in getOrCreateConversation:", error);
      console.error("💥 Error details:", JSON.stringify(error, null, 2));
      return { data: null, error };
    }
  }

  // Rest of your methods remain the same...
  static async getUserConversations(): Promise<{
    data: ConversationWithDetails[];
    error: any;
  }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("🔍 Fetching conversations for user:", user.id);

      // ✅ UPDATED: Get conversations with archived status
      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order("archived", { ascending: true }) // Show active conversations first
        .order("updated_at", { ascending: false });

      if (convError) {
        console.error("❌ Error fetching conversations:", convError);
        throw convError;
      }

      console.log("✅ Found conversations:", conversations?.length || 0);

      if (!conversations || conversations.length === 0) {
        return { data: [], error: null };
      }

      const enhancedConversations = await Promise.all(
        conversations.map(async (conv) => {
          try {
            const { data: participant1 } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", conv.participant_1_id)
              .single();

            const { data: participant2 } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", conv.participant_2_id)
              .single();

            let lastMessage = null;
            if (conv.last_message_id) {
              const { data: messageData } = await supabase
                .from("messages")
                .select("*")
                .eq("id", conv.last_message_id)
                .single();
              lastMessage = messageData;
            }

            let ticket = null;
            let isExpired = false;
            if (conv.ticket_id) {
              const { data: ticketData } = await supabase
                .from("tickets")
                .select("*")
                .eq("id", conv.ticket_id)
                .single();
              ticket = ticketData;

              // ✅ CHECK: Determine if ticket/conversation is expired
              if (ticket) {
                const eventDate = new Date(ticket.event_date);
                const expiryDate = new Date(
                  eventDate.getTime() + 7 * 24 * 60 * 60 * 1000
                ); // 7 days after event
                isExpired = new Date() > expiryDate;

                // Auto-archive if expired and not already archived
                if (isExpired && !conv.archived) {
                  await supabase
                    .from("conversations")
                    .update({ archived: true })
                    .eq("id", conv.id);
                  conv.archived = true;
                }
              }
            }

            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conv.id)
              .eq("read_by_recipient", false)
              .neq("sender_id", user.id);

            return {
              ...conv,
              participant_1: participant1,
              participant_2: participant2,
              last_message: lastMessage,
              ticket: ticket,
              unread_count: count || 0,
              is_expired: isExpired, // ✅ ADDED: Flag for expired status
            };
          } catch (error) {
            console.error("Error enhancing conversation:", error);
            return null;
          }
        })
      );

      const validConversations = enhancedConversations.filter(
        (conv) => conv !== null
      );

      console.log("✅ Enhanced conversations:", validConversations.length);

      return {
        data: validConversations as ConversationWithDetails[],
        error: null,
      };
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return { data: [], error };
    }
  }

  // Other methods remain the same...
  static async getConversationMessages(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<{ data: MessageWithSender[]; error: any }> {
    try {
      console.log("🔍 Fetching messages for conversation:", conversationId);

      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (messagesError) {
        console.error("❌ Error fetching messages:", messagesError);
        throw messagesError;
      }

      console.log("✅ Found messages:", messages?.length || 0);

      if (!messages || messages.length === 0) {
        return { data: [], error: null };
      }

      const messagesWithSenders = await Promise.all(
        messages.map(async (message) => {
          const { data: sender } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", message.sender_id)
            .single();

          return {
            ...message,
            sender: sender,
          };
        })
      );

      return {
        data: messagesWithSenders.reverse() as MessageWithSender[],
        error: null,
      };
    } catch (error) {
      console.error("Error fetching messages:", error);
      return { data: [], error };
    }
  }

  // Enhanced markMessagesAsRead function in chatService.ts:

  static async markMessagesAsRead(
    conversationId: string
  ): Promise<{ error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log(
        `📖 Marking messages as read for conversation: ${conversationId}`
      );

      const { error } = await supabase
        .from("messages")
        .update({
          read_by_recipient: true,
          read_at: new Date().toISOString(),
        })
        .eq("conversation_id", conversationId)
        .eq("read_by_recipient", false)
        .neq("sender_id", user.id);

      if (error) {
        console.error("❌ Error marking messages as read:", error);
        throw error;
      }

      console.log("✅ Successfully marked messages as read");
      return { error: null };
    } catch (error) {
      console.error("Error marking messages as read:", error);
      return { error };
    }
  }
  static async getUnreadMessageCount(): Promise<{ count: number; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { count: 0, error: null };
      }

      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`);

      if (!conversations || conversations.length === 0) {
        return { count: 0, error: null };
      }

      const conversationIds = conversations.map((c) => c.id);

      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .eq("read_by_recipient", false)
        .neq("sender_id", user.id);

      if (error) throw error;

      return { count: count || 0, error: null };
    } catch (error) {
      console.error("Error getting unread count:", error);
      return { count: 0, error };
    }
  }

  static subscribeToConversationMessages(
    conversationId: string,
    onMessage: (message: Message) => void
  ) {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessage(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  static subscribeToConversations(
    userId: string,
    onConversationUpdate: (conversation: Conversation) => void
  ) {
    const channel = supabase
      .channel(`conversations:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `or(participant_1_id.eq.${userId},participant_2_id.eq.${userId})`,
        },
        (payload) => {
          onConversationUpdate(payload.new as Conversation);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  static async deleteConversation(
    conversationId: string
  ): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error("Error deleting conversation:", error);
      return { error };
    }
  }
}
