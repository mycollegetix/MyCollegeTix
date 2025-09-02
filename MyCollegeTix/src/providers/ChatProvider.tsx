// src/providers/ChatProvider.tsx - SIMPLIFIED VERSION (No Infinite Loops)
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
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
  clearMessagesForNewConversation: () => void;
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
  clearMessagesForNewConversation: () => {},
  getOrCreateConversation: async () => null,
  refreshUnreadCount: async () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>(
    []
  );
  const [currentConversation, setCurrentConversationState] =
    useState<ConversationWithDetails | null>(null);
    
  // ✅ ENHANCED: Smart conversation setter with message isolation
  const setCurrentConversation = useCallback((conversation: ConversationWithDetails | null) => {
    const previousConversationId = currentConversation?.id;
    const newConversationId = conversation?.id;
    
    console.log("🔄 ChatProvider: Setting current conversation:", {
      from: previousConversationId,
      to: newConversationId
    });
    
    // ✅ CRITICAL: Clear messages when switching conversations
    if (previousConversationId !== newConversationId) {
      console.log("🧹 Clearing messages for conversation switch");
      setMessages([]);
      setCurrentConversationId(newConversationId || null);
    }
    
    setCurrentConversationState(conversation);
  }, [currentConversation?.id]);
  
  // ✅ NEW: Explicit function to clear messages when starting new conversation
  const clearMessagesForNewConversation = useCallback(() => {
    console.log("🧹 ChatProvider: Clearing messages for new conversation");
    setMessages([]);
    setCurrentConversationId(null);
  }, []);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  
  // Use ref to avoid stale closures in subscriptions
  const currentConversationRef = useRef<ConversationWithDetails | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  
  // Update refs whenever currentConversation changes
  useEffect(() => {
    currentConversationRef.current = currentConversation;
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversation, currentConversationId]);

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
    console.log("📨 ChatProvider: Loading messages for conversation:", conversationId);
    setMessagesLoading(true);
    
    // ✅ CRITICAL: Reset messages immediately when loading different conversation
    if (currentConversationId !== conversationId) {
      console.log("🔄 Different conversation detected, clearing messages");
      setMessages([]);
      setCurrentConversationId(conversationId);
    }
    
    try {
      const { data, error } = await ChatService.getConversationMessages(
        conversationId
      );
      if (!error && data) {
        // ✅ SAFETY: Double-check we're still loading the same conversation
        setCurrentConversationId((currentId) => {
          if (currentId === conversationId) {
            setMessages(data);
            console.log("✅ Messages loaded:", data.length, "messages");
          } else {
            console.log("⚠️ Conversation changed during load, discarding messages");
          }
          return currentId;
        });
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
      
      // Refresh messages to show the sent message immediately
      // This ensures the message appears even if real-time subscription has issues
      await loadMessages(conversationId);
      
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

      // ✅ OPTIMIZED: Always refresh to get the latest conversation data
      console.log("🔄 ChatProvider: Refreshing conversations for conversation:", result.data.id);
      await loadConversations();

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
      setCurrentConversationState(null);
      setMessages([]);
      setCurrentConversationId(null);
      setUnreadCount(0);
      // Clear processed message IDs when user changes
      processedMessageIds.current.clear();
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
          try {
            const newMessage = payload.new as any;
            
            // Skip if we've already processed this message
            if (processedMessageIds.current.has(newMessage.id)) {
              console.log("🔄 Skipping already processed message:", newMessage.id);
              return;
            }
            
            // Add to processed set
            processedMessageIds.current.add(newMessage.id);
            
            // Clean up old processed IDs (keep last 100)
            if (processedMessageIds.current.size > 100) {
              const ids = Array.from(processedMessageIds.current);
              processedMessageIds.current = new Set(ids.slice(-100));
            }
            
            console.log("📨 New message received:", {
              id: newMessage.id,
              conversation_id: newMessage.conversation_id,
              sender_id: newMessage.sender_id,
              content: newMessage.content?.substring(0, 50) + "...",
              is_from_me: newMessage.sender_id === user.id
            });

            // Get sender information for the message with error handling
            const { data: sender, error: senderError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", newMessage.sender_id)
              .single();

            if (senderError) {
              console.error("Error fetching sender profile:", senderError);
              return; // Skip this message if we can't get sender info
            }

            const messageWithSender = {
              ...newMessage,
              sender: sender
            };

            // ✅ ENHANCED: Add message only if viewing the correct conversation
            const currentConv = currentConversationRef.current;
            const currentConvId = currentConversationIdRef.current;
            const isCurrentConversation = currentConv && newMessage.conversation_id === currentConv.id;
            const isCorrectConversationId = currentConvId === newMessage.conversation_id;
            
            if (isCurrentConversation && isCorrectConversationId) {
              console.log("📨 Adding message to current conversation:", {
                conversation_id: newMessage.conversation_id,
                current_conversation_id: currentConvId,
                message_preview: newMessage.content?.substring(0, 30) + "..."
              });
              
              setMessages((prev) => {
                // Check if message already exists to avoid duplicates
                if (prev.some((m) => m.id === newMessage.id)) {
                  console.log("⚠️ Message already exists, skipping");
                  return prev;
                }
                return [...prev, messageWithSender as MessageWithSender];
              });
            } else {
              console.log("📨 Message not for current conversation:", {
                message_conv_id: newMessage.conversation_id,
                current_conv_id: currentConv?.id,
                current_conversation_id: currentConvId,
                will_add: false
              });
            }

            // ✅ UPDATE CONVERSATIONS LIST AND UNREAD COUNTS
            setConversations((prev) => {
              let conversationFound = false;
              const updated = prev.map((conv) => {
                if (conv.id === newMessage.conversation_id) {
                  conversationFound = true;
                  // ✅ ENHANCED: Smart unread count logic with ref-based current state
                  const isFromOther = newMessage.sender_id !== user.id;
                  const isNotCurrentlyViewing = !currentConv || currentConv.id !== newMessage.conversation_id;
                  const isNotCurrentConversationId = !currentConvId || currentConvId !== newMessage.conversation_id;
                  const shouldIncrementUnread = isFromOther && isNotCurrentlyViewing && isNotCurrentConversationId;

                  return {
                    ...conv,
                    unread_count: shouldIncrementUnread ? conv.unread_count + 1 : conv.unread_count,
                    last_message_at: newMessage.created_at,
                    updated_at: newMessage.created_at,
                    last_message_id: newMessage.id,
                    last_message: {
                      id: newMessage.id,
                      content: newMessage.content,
                      sender_id: newMessage.sender_id,
                      created_at: newMessage.created_at,
                      conversation_id: newMessage.conversation_id,
                      edited_at: null,
                      message_type: 'text',
                      read_at: null,
                      read_by_recipient: null
                    }
                  };
                }
                return conv;
              });
              
              // If conversation not found in current list, reload conversations
              // This handles cases where a new conversation was created
              if (!conversationFound) {
                console.log("📝 New conversation detected, reloading conversations");
                setTimeout(() => loadConversations(), 1000);
                return prev; // Return unchanged for now
              }
              
              // Sort conversations by most recent message
              return updated.sort((a, b) => {
                const aTime = new Date(a.last_message_at || a.updated_at).getTime();
                const bTime = new Date(b.last_message_at || b.updated_at).getTime();
                return bTime - aTime;
              });
            });

            // ✅ ENHANCED: Global unread count with double-checking
            const isFromOther = newMessage.sender_id !== user.id;
            const isNotCurrentlyViewing = !currentConv || currentConv.id !== newMessage.conversation_id;
            const isNotCurrentConversationId = !currentConvId || currentConvId !== newMessage.conversation_id;
            
            if (isFromOther && isNotCurrentlyViewing && isNotCurrentConversationId) {
              setUnreadCount((prev) => prev + 1);
            }

          } catch (error) {
            console.error("Error processing real-time message:", error);
          }
        }
      )
      .subscribe();

    return () => {
      console.log("🧹 Cleaning up real-time subscriptions");
      unsubscribeConversations();
      supabase.removeChannel(newMessageChannel);
    };
  }, [user]); // Remove currentConversation dependency to prevent subscription restarts

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
    clearMessagesForNewConversation,
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
