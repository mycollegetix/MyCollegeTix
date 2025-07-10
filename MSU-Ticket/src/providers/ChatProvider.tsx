// src/providers/ChatProvider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { ChatService } from "../services/chatService";
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
      await ChatService.markMessagesAsRead(conversationId);

      // Update local state
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      );

      // Refresh unread count
      await refreshUnreadCount();
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const getOrCreateConversation = async (
    otherUserId: string,
    ticketId?: string
  ): Promise<string | null> => {
    try {
      const { data, error } = await ChatService.getOrCreateConversation(
        otherUserId,
        ticketId
      );
      if (error || !data) {
        throw error;
      }

      // Refresh conversations to include the new one
      await loadConversations();

      return data.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
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

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to conversation updates
    const unsubscribeConversations = ChatService.subscribeToConversations(
      user.id,
      (updatedConversation) => {
        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === updatedConversation.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...updatedConversation };
            return updated;
          }
          return prev;
        });

        // Refresh unread count when conversations update
        refreshUnreadCount();
      }
    );

    // Subscribe to messages in current conversation
    let unsubscribeMessages: (() => void) | null = null;

    if (currentConversation) {
      unsubscribeMessages = ChatService.subscribeToConversationMessages(
        currentConversation.id,
        (newMessage) => {
          // Add message with sender info
          setMessages((prev) => {
            // Check if message already exists to avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }

            // For real-time messages, we need to fetch sender info
            // In a production app, you might want to optimize this
            return [...prev, newMessage as MessageWithSender];
          });

          // If it's not from current user, refresh conversations to update unread counts
          if (newMessage.sender_id !== user.id) {
            loadConversations();
          }
        }
      );
    }

    return () => {
      unsubscribeConversations();
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
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
