// services/chatService.ts
import { supabase } from "../lib/supabase";
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
  // Get or create a conversation between two users
  static async getOrCreateConversation(
    otherUserId: string,
    ticketId?: string
  ): Promise<{ data: Conversation | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // First, try to find existing conversation (check both directions)
      const { data: existingConversations, error: findError } = await supabase
        .from("conversations")
        .select("*")
        .or(
          `and(participant_1_id.eq.${user.id},participant_2_id.eq.${otherUserId}),and(participant_1_id.eq.${otherUserId},participant_2_id.eq.${user.id})`
        );

      if (findError) {
        throw findError;
      }

      if (existingConversations && existingConversations.length > 0) {
        return { data: existingConversations[0], error: null };
      }

      // Create new conversation if it doesn't exist
      // Always order participants consistently to prevent duplicates
      const conversationData: ConversationInsert = {
        participant_1_id: user.id < otherUserId ? user.id : otherUserId,
        participant_2_id: user.id < otherUserId ? otherUserId : user.id,
        ticket_id: ticketId || null,
      };

      const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert(conversationData)
        .select()
        .single();

      if (createError) {
        // If there's a constraint violation, try to fetch existing conversation again
        if (createError.code === "23505") {
          // Unique violation
          const { data: existingConversation } = await supabase
            .from("conversations")
            .select("*")
            .or(
              `and(participant_1_id.eq.${user.id},participant_2_id.eq.${otherUserId}),and(participant_1_id.eq.${otherUserId},participant_2_id.eq.${user.id})`
            )
            .single();

          if (existingConversation) {
            return { data: existingConversation, error: null };
          }
        }
        throw createError;
      }

      return { data: newConversation, error: null };
    } catch (error) {
      console.error("Error getting/creating conversation:", error);
      return { data: null, error };
    }
  }

  // Get user's conversations with details - SIMPLIFIED VERSION
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

      // Step 1: Get basic conversations
      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (convError) {
        console.error("❌ Error fetching conversations:", convError);
        throw convError;
      }

      console.log("✅ Found conversations:", conversations?.length || 0);

      if (!conversations || conversations.length === 0) {
        return { data: [], error: null };
      }

      // Step 2: Enhance each conversation with details
      const enhancedConversations = await Promise.all(
        conversations.map(async (conv) => {
          try {
            // Get participant 1
            const { data: participant1 } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", conv.participant_1_id)
              .single();

            // Get participant 2
            const { data: participant2 } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", conv.participant_2_id)
              .single();

            // Get last message if exists
            let lastMessage = null;
            if (conv.last_message_id) {
              const { data: messageData } = await supabase
                .from("messages")
                .select("*")
                .eq("id", conv.last_message_id)
                .single();
              lastMessage = messageData;
            }

            // Get ticket if exists
            let ticket = null;
            if (conv.ticket_id) {
              const { data: ticketData } = await supabase
                .from("tickets")
                .select("*")
                .eq("id", conv.ticket_id)
                .single();
              ticket = ticketData;
            }

            // Get unread count
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
            };
          } catch (error) {
            console.error("Error enhancing conversation:", error);
            return null;
          }
        })
      );

      // Filter out null results
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

  // Get messages for a conversation - SIMPLIFIED VERSION
  static async getConversationMessages(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<{ data: MessageWithSender[]; error: any }> {
    try {
      console.log("🔍 Fetching messages for conversation:", conversationId);

      // Step 1: Get messages
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

      // Step 2: Get sender details for each message
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

      // Reverse to show oldest first
      return {
        data: messagesWithSenders.reverse() as MessageWithSender[],
        error: null,
      };
    } catch (error) {
      console.error("Error fetching messages:", error);
      return { data: [], error };
    }
  }

  // Send a message
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

      return { data, error: null };
    } catch (error) {
      console.error("Error sending message:", error);
      return { data: null, error };
    }
  }

  // Mark messages as read
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

      const { error } = await supabase
        .from("messages")
        .update({
          read_by_recipient: true,
          read_at: new Date().toISOString(),
        })
        .eq("conversation_id", conversationId)
        .eq("read_by_recipient", false)
        .neq("sender_id", user.id);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error("Error marking messages as read:", error);
      return { error };
    }
  }

  // Get unread message count for user
  static async getUnreadMessageCount(): Promise<{ count: number; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { count: 0, error: null };
      }

      // Get all user's conversations
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

  // Subscribe to new messages in a conversation
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

  // Subscribe to conversation updates
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

  // Delete a conversation (soft delete by removing messages)
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
