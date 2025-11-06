// src/providers/ChatProvider.tsx - ENHANCED ISOLATION FIX
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
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
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>(
    []
  );
  const [currentConversation, setCurrentConversationState] =
    useState<ConversationWithDetails | null>(null);

  // ✅ NEW: Conversation-scoped messages with conversation ID tracking
  const [messagesMap, setMessagesMap] = useState<
    Record<string, MessageWithSender[]>
  >({});
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Use ref to avoid stale closures in subscriptions
  const currentConversationRef = useRef<ConversationWithDetails | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // ✅ DERIVED STATE: Get messages for current conversation
  const messages = currentConversationId
    ? messagesMap[currentConversationId] || []
    : [];

  // Update refs whenever currentConversation changes
  useEffect(() => {
    currentConversationRef.current = currentConversation;
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversation, currentConversationId]);

  // ✅ ENHANCED: Conversation setter with strict isolation
  const setCurrentConversation = useCallback(
    (conversation: ConversationWithDetails | null) => {
      const previousConversationId = currentConversation?.id;
      const newConversationId = conversation?.id;

      console.log("🔄 ChatProvider: Setting current conversation:", {
        from: previousConversationId,
        to: newConversationId,
      });

      // Always update conversation state
      setCurrentConversationState(conversation);

      // Update current conversation ID for message isolation
      setCurrentConversationId(newConversationId || null);

      // Log the switch
      if (previousConversationId !== newConversationId) {
        console.log("🔄 Conversation switched - messages will be isolated");
      }
    },
    [currentConversation?.id]
  );

  // ✅ ENHANCED: Clear messages for new conversation
  const clearMessagesForNewConversation = useCallback(() => {
    console.log("🧹 ChatProvider: Clearing for new conversation");
    setCurrentConversationId(null);
    // Note: We don't clear messagesMap to preserve loaded messages for other conversations
  }, []);

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

  // ✅ ENHANCED: Conversation-scoped message loading
  const loadMessages = async (conversationId: string) => {
    console.log(
      "📨 ChatProvider: Loading messages for conversation:",
      conversationId
    );
    setMessagesLoading(true);

    // Set the current conversation ID for proper isolation
    setCurrentConversationId(conversationId);

    try {
      const { data, error } = await ChatService.getConversationMessages(
        conversationId
      );

      if (error) {
        console.error("❌ Error fetching messages:", error);
        throw error;
      }

      if (data) {
        console.log("✅ Found messages:", data.length);
        // ✅ FIXED: Store messages in conversation-scoped map
        setMessagesMap((prev) => ({
          ...prev,
          [conversationId]: data,
        }));
        console.log(
          "✅ Messages loaded and isolated:",
          data.length,
          "messages"
        );
      } else {
        console.log("📭 No messages found for conversation");
        setMessagesMap((prev) => ({
          ...prev,
          [conversationId]: [],
        }));
      }
    } catch (error) {
      console.error("❌ Error loading messages:", error);
      // Set empty array for this conversation on error
      setMessagesMap((prev) => ({
        ...prev,
        [conversationId]: [],
      }));
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async (
    conversationId: string,
    content: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // ✅ OPTIMISTIC UPDATE: Create a temporary message immediately
      const optimisticMessage: MessageWithSender = {
        id: `temp-${Date.now()}`, // Temporary ID
        conversation_id: conversationId,
        sender_id: user.id,
        content: content,
        message_type: "text",
        created_at: new Date().toISOString(),
        read_at: null,
        read_by_recipient: null,
        edited_at: null,
        sender: {
          id: user.id,
          username: profile?.username || "",
          full_name: profile?.full_name || "",
          email: user.email || "",
          avatar_url: profile?.avatar_url || null,
          created_at: profile?.created_at || new Date().toISOString(),
          is_admin: profile?.is_admin || false,
          college_id: profile?.college_id || null,
          expo_push_token: null,
          current_ip_address: null,
          last_ip_address: null,
          ip_updated_at: null,
          device_info: null,
          location_data: null,
          user_agent: null,
          is_trusted: false,
          trust_earned_at: null,
        },
      };

      console.log("📤 Optimistically adding message:", {
        conversation_id: conversationId,
        content: content.substring(0, 30) + "...",
        temp_id: optimisticMessage.id,
      });

      // ✅ INSTANT UPDATE: Add optimistic message to local state immediately
      setMessagesMap((prev) => {
        const conversationMessages = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: [...conversationMessages, optimisticMessage],
        };
      });

      // ✅ Send to server in background
      const { data, error } = await ChatService.sendMessage(
        conversationId,
        content
      );

      if (error || !data) {
        console.error("❌ Failed to send message, removing optimistic update");

        // ✅ ROLLBACK: Remove optimistic message on failure
        setMessagesMap((prev) => {
          const conversationMessages = prev[conversationId] || [];
          return {
            ...prev,
            [conversationId]: conversationMessages.filter(
              (msg) => msg.id !== optimisticMessage.id
            ),
          };
        });

        throw error;
      }

      console.log("✅ Message sent successfully, replacing optimistic message");

      // ✅ REPLACE: Update optimistic message with real server data
      setMessagesMap((prev) => {
        const conversationMessages = prev[conversationId] || [];
        const updatedMessages = conversationMessages.map((msg) =>
          msg.id === optimisticMessage.id
            ? { ...data, sender: optimisticMessage.sender } // Keep sender data
            : msg
        );
        return {
          ...prev,
          [conversationId]: updatedMessages,
        };
      });

      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      console.log(
        `📖 ChatProvider: Marking conversation ${conversationId} as read`
      );

      // Update local state immediately for instant UX
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      );

      // Update unread count immediately
      setUnreadCount((prev) => {
        const conversation = conversations.find((c) => c.id === conversationId);
        const unreadToSubtract = conversation?.unread_count || 0;
        return Math.max(0, prev - unreadToSubtract);
      });

      // Update database in background
      await ChatService.markMessagesAsRead(conversationId);

      console.log("✅ ChatProvider: Successfully marked as read");
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

      // Always refresh to get the latest conversation data
      console.log(
        "🔄 ChatProvider: Refreshing conversations for conversation:",
        result.data.id
      );
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
      setMessagesMap({});
      setCurrentConversationId(null);
      setUnreadCount(0);
      processedMessageIds.current.clear();
    }
  }, [user]);

  // ✅ ENHANCED: Real-time subscriptions with proper isolation
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

    // ✅ ENHANCED: Subscribe to NEW messages with strict isolation
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
              console.log(
                "🔄 Skipping already processed message:",
                newMessage.id
              );
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
              is_from_me: newMessage.sender_id === user.id,
            });

            // Get sender information for the message with error handling
            const { data: sender, error: senderError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", newMessage.sender_id)
              .single();

            if (senderError) {
              console.error("Error fetching sender profile:", senderError);
              return;
            }

            const messageWithSender = {
              ...newMessage,
              sender: sender,
            };

            // ✅ STRICT ISOLATION: Only add message if viewing the exact conversation
            const currentConv = currentConversationRef.current;
            const currentConvId = currentConversationIdRef.current;

            const isExactMatch = currentConvId === newMessage.conversation_id;
            const isCurrentConversationMatch =
              currentConv && currentConv.id === newMessage.conversation_id;

            if (isExactMatch && isCurrentConversationMatch) {
              console.log(
                "📨 Adding message to current conversation (strict match):",
                {
                  conversation_id: newMessage.conversation_id,
                  current_conversation_id: currentConvId,
                  message_preview: newMessage.content?.substring(0, 30) + "...",
                }
              );

              // ✅ ENHANCED: Add to conversation-scoped messages with optimistic update handling
              setMessagesMap((prev) => {
                const conversationMessages =
                  prev[newMessage.conversation_id] || [];

                // Check if message already exists to avoid duplicates
                if (conversationMessages.some((m) => m.id === newMessage.id)) {
                  console.log(
                    "⚠️ Message already exists in conversation, skipping"
                  );
                  return prev;
                }

                // ✅ OPTIMISTIC UPDATE HANDLING: Check if this is replacing a temp message
                const isFromCurrentUser = newMessage.sender_id === user.id;
                if (isFromCurrentUser) {
                  // Look for recent temporary message with same content and sender
                  const recentTempMessage = conversationMessages
                    .filter(
                      (m) => m.id.startsWith("temp-") && m.sender_id === user.id
                    )
                    .find((m) => {
                      const timeDiff = Math.abs(
                        new Date(newMessage.created_at).getTime() -
                          new Date(m.created_at).getTime()
                      );
                      return (
                        m.content === newMessage.content && timeDiff < 10000
                      ); // Within 10 seconds
                    });

                  if (recentTempMessage) {
                    console.log(
                      "🔄 Replacing optimistic message with real message:",
                      {
                        temp_id: recentTempMessage.id,
                        real_id: newMessage.id,
                      }
                    );

                    // Replace the temporary message with the real one
                    return {
                      ...prev,
                      [newMessage.conversation_id]: conversationMessages.map(
                        (m) =>
                          m.id === recentTempMessage.id
                            ? (messageWithSender as MessageWithSender)
                            : m
                      ),
                    };
                  }
                }

                // Regular message addition (not replacing optimistic update)
                return {
                  ...prev,
                  [newMessage.conversation_id]: [
                    ...conversationMessages,
                    messageWithSender as MessageWithSender,
                  ],
                };
              });
            } else {
              console.log(
                "📨 Message not for current conversation (isolated):",
                {
                  message_conv_id: newMessage.conversation_id,
                  current_conv_id: currentConv?.id,
                  current_conversation_id: currentConvId,
                  exact_match: isExactMatch,
                  conversation_match: isCurrentConversationMatch,
                }
              );
            }

            // ✅ ENHANCED: Update conversations list with better isolation checks
            setConversations((prev) => {
              let conversationFound = false;
              const updated = prev.map((conv) => {
                if (conv.id === newMessage.conversation_id) {
                  conversationFound = true;

                  // Smart unread count logic with strict current state checking
                  const isFromOther = newMessage.sender_id !== user.id;
                  const isNotCurrentlyViewing =
                    !isExactMatch || !isCurrentConversationMatch;
                  const shouldIncrementUnread =
                    isFromOther && isNotCurrentlyViewing;

                  return {
                    ...conv,
                    unread_count: shouldIncrementUnread
                      ? conv.unread_count + 1
                      : conv.unread_count,
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
                      message_type: "text",
                      read_at: null,
                      read_by_recipient: null,
                    },
                  };
                }
                return conv;
              });

              // If conversation not found in current list, reload conversations
              if (!conversationFound) {
                console.log(
                  "📝 New conversation detected, reloading conversations"
                );
                setTimeout(() => loadConversations(), 1000);
                return prev;
              }

              // Sort conversations by most recent message
              return updated.sort((a, b) => {
                const aTime = new Date(
                  a.last_message_at || a.updated_at
                ).getTime();
                const bTime = new Date(
                  b.last_message_at || b.updated_at
                ).getTime();
                return bTime - aTime;
              });
            });

            // Global unread count with enhanced isolation checks
            const isFromOther = newMessage.sender_id !== user.id;
            const isNotCurrentlyViewing =
              !isExactMatch || !isCurrentConversationMatch;

            if (isFromOther && isNotCurrentlyViewing) {
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
  }, [user]);

  const value = {
    conversations,
    currentConversation,
    messages, // ✅ Now returns isolated messages for current conversation
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
