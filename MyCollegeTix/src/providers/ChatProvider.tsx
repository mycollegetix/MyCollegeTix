// src/providers/ChatProvider.tsx - SIMPLIFIED VERSION (No Infinite Loops)
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ChatService } from "../services/chatService";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";
import {
  ConversationWithDetails,
  MessageWithSender,
} from "../types/database.types";

type ChatContextType = {
  conversations: ConversationWithDetails[];
  currentConversation: ConversationWithDetails | null;
  messages: MessageWithSender[];
  unreadCount: number;
  loading: boolean;
  messagesLoading: boolean;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<boolean>;
  markAsRead: (conversationId: string) => Promise<void>;
  setCurrentConversation: (
    conversation: ConversationWithDetails | null
  ) => void;
  getOrCreateConversation: (
    otherUserId: string,
    ticketId?: string
  ) => Promise<string | null>;
  refreshUnreadCount: () => Promise<void>;
};

const ChatContext = createContext<ChatContextType>({
  conversations: [],
  currentConversation: null,
  messages: [],
  unreadCount: 0,
  loading: false,
  messagesLoading: false,
  loadConversations: async () => {},
  loadMessages: async () => {},
  sendMessage: async () => false,
  markAsRead: async () => {},
  setCurrentConversation: () => {},
  getOrCreateConversation: async () => null,
  refreshUnreadCount: async () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>(
    []
  );
  const [currentConversation, setCurrentConversation] =
    useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const loadConversations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await ChatService.getUserConversations();
      if (!error && data) {
        setConversations(data);
        // Update unread count
        const totalUnread = data.reduce(
          (sum, conv) => sum + conv.unread_count,
          0
        );
        setUnreadCount(totalUnread);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const { data, error } = await ChatService.getConversationMessages(
        conversationId
      );
      if (!error && data) {
        setMessages(data);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async (
    conversationId: string,
    content: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await ChatService.sendMessage(
        conversationId,
        content
      );
      if (error || !data) {
        throw error;
      }
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      console.log(`📖 ChatProvider: Marking conversation ${conversationId} as read`);
      
      // ✅ STEP 1: Update local state immediately for instant UX
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      );

      // ✅ STEP 2: Update unread count immediately
      setUnreadCount((prev) => {
        const conversation = conversations.find(c => c.id === conversationId);
        const unreadToSubtract = conversation?.unread_count || 0;
        return Math.max(0, prev - unreadToSubtract);
      });

      // ✅ STEP 3: Update database in background (no refresh needed)
      await ChatService.markMessagesAsRead(conversationId);
      
      console.log("✅ ChatProvider: Successfully marked as read (no refresh)");
    } catch (error) {
      console.error("Error marking messages as read:", error);
      // Revert local state on error
      loadConversations();
    }
  };

  const getOrCreateConversation = async (
    otherUserId: string,
    ticketId?: string
  ): Promise<string | null> => {
    console.log("🔍 ChatProvider: Creating/finding conversation");

    if (!user?.id) {
      console.error("❌ ChatProvider: No authenticated user found");
      return null;
    }

    try {
      const result = await ChatService.getOrCreateConversation(
        otherUserId,
        ticketId
      );

      if (result.error || !result.data) {
        const errorMessage = result.error
          ? JSON.stringify(result.error)
          : "No conversation data returned";
        console.error("❌ ChatProvider: Error from ChatService:", errorMessage);
        throw new Error(errorMessage);
      }

      // ✅ OPTIMIZED: Only refresh if it's a new conversation
      const existingConversation = conversations.find(c => c.id === result.data!.id);
      if (!existingConversation) {
        console.log("🔄 ChatProvider: New conversation created, refreshing...");
        await loadConversations();
      } else {
        console.log("✅ ChatProvider: Using existing conversation (no refresh needed)");
      }

      return result.data.id;
    } catch (error) {
      console.error("❌ ChatProvider: getOrCreateConversation error:", error);
      return null;
    }
  };

  const refreshUnreadCount = async () => {
    try {
      const { count, error } = await ChatService.getUnreadMessageCount();
      if (!error) {
        setUnreadCount(count);
      }
    } catch (error) {
      console.error("Error refreshing unread count:", error);
    }
  };

  // Load conversations when user changes
  useEffect(() => {
    if (user) {
      loadConversations();
    } else {
      setConversations([]);
      setCurrentConversation(null);
      setMessages([]);
      setUnreadCount(0);
    }
  }, [user]);

  // ✅ ENHANCED: Real-time subscriptions with proper message handling
  useEffect(() => {
    if (!user) return;

    console.log("🔄 Setting up real-time subscriptions for user:", user.id);

    // Subscribe to conversation updates (last_message changes only)
    const unsubscribeConversations = ChatService.subscribeToConversations(
      user.id,
      (updatedConversation) => {
        console.log("📝 Conversation updated:", updatedConversation.id);
        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === updatedConversation.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...updatedConversation };
            return updated;
          }
          return prev;
        });
      }
    );

    // ✅ ENHANCED: Subscribe to NEW messages globally for unread count updates
    const newMessageChannel = supabase
      .channel(`new-messages:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          console.log("📨 New message received:", {
            id: newMessage.id,
            conversation_id: newMessage.conversation_id,
            sender_id: newMessage.sender_id,
            content: newMessage.content?.substring(0, 50) + "...",
            is_from_me: newMessage.sender_id === user.id
          });

          // Only process messages not from current user
          if (newMessage.sender_id !== user.id) {
            // Get sender information for the message
            const { data: sender } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", newMessage.sender_id)
              .single();

            const messageWithSender = {
              ...newMessage,
              sender: sender
            };

            // ✅ UPDATE CURRENT CONVERSATION MESSAGES: If this message is for the currently viewed conversation
            if (currentConversation && newMessage.conversation_id === currentConversation.id) {
              console.log("📨 Adding message to current conversation");
              setMessages((prev) => {
                // Check if message already exists to avoid duplicates
                if (prev.some((m) => m.id === newMessage.id)) {
                  return prev;
                }
                return [...prev, messageWithSender as MessageWithSender];
              });
            }

            // ✅ UPDATE CONVERSATIONS LIST: Increment unread count for the specific conversation
            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id === newMessage.conversation_id) {
                  // Only increment unread count if user is not currently viewing this conversation
                  const shouldIncrementUnread = !currentConversation || currentConversation.id !== newMessage.conversation_id;
                  return {
                    ...conv,
                    unread_count: shouldIncrementUnread ? conv.unread_count + 1 : conv.unread_count,
                    last_message_at: newMessage.created_at,
                    updated_at: newMessage.created_at
                  };
                }
                return conv;
              })
            );

            // ✅ UPDATE GLOBAL UNREAD COUNT: Only if not viewing the conversation
            if (!currentConversation || currentConversation.id !== newMessage.conversation_id) {
              setUnreadCount((prev) => prev + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log("🧹 Cleaning up real-time subscriptions");
      unsubscribeConversations();
      supabase.removeChannel(newMessageChannel);
    };
  }, [user, currentConversation]);

  const value = {
    conversations,
    currentConversation,
    messages,
    unreadCount,
    loading,
    messagesLoading,
    loadConversations,
    loadMessages,
    sendMessage,
    markAsRead,
    setCurrentConversation,
    getOrCreateConversation,
    refreshUnreadCount,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
