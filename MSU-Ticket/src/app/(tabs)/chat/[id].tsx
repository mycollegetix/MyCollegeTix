// src/app/(tabs)/chat/[id].tsx - UPDATED with better navigation
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useChat } from "@/src/providers/ChatProvider";
import { useAuth } from "@/src/providers/AuthProvider";
import { MessageWithSender } from "@/src/types/database.types";

const { width, height } = Dimensions.get("window");

export default function ChatConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const {
    currentConversation,
    messages,
    messagesLoading,
    loadMessages,
    sendMessage,
    markAsRead,
    setCurrentConversation,
    conversations,
  } = useChat();

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [hasLoadedMessages, setHasLoadedMessages] = useState(false);
  const [localMessages, setMessages] = useState<MessageWithSender[]>([]); // ✅ LOCAL STATE
  const flatListRef = useRef<FlatList>(null);

  // Memoized conversation loading
  const loadConversationData = useCallback(
    async (conversationId: string) => {
      console.log("🔄 Loading conversation data for:", conversationId);

      // Find conversation from loaded conversations
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        console.log("✅ Found conversation, setting as current");
        setCurrentConversation(conversation);

        // Only load messages if we haven't loaded them yet
        if (!hasLoadedMessages) {
          console.log("📨 Loading messages for conversation");
          await loadMessages(conversationId);
          setHasLoadedMessages(true);
          await markAsRead(conversationId);
        }
      } else {
        console.log("❌ Conversation not found in loaded conversations");
      }
    },
    [
      conversations,
      loadMessages,
      markAsRead,
      setCurrentConversation,
      hasLoadedMessages,
    ]
  );

  // ✅ SYNC: Update local messages when global messages change
  useEffect(() => {
    setMessages(messages);
  }, [messages]);

  // Effect for loading conversation data
  useEffect(() => {
    if (id && conversations.length > 0) {
      loadConversationData(id);
    }

    // ✅ REAL-TIME: Set up message subscription for immediate updates
    let messageSubscription: (() => void) | null = null;

    if (id) {
      // Import ChatService for direct subscription
      const { ChatService } = require("@/src/services/chatService");

      messageSubscription = ChatService.subscribeToConversationMessages(
        id,
        (newMessage: any) => {
          // Only add if it's not from the current user (to avoid duplicates when sending)
          if (newMessage.sender_id !== user?.id) {
            console.log("📨 New message received:", newMessage.content);
            // Reload messages to get the complete message with sender info
            loadMessages(id);
          }
        }
      );
    }

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up conversation screen");
      setCurrentConversation(null);
      setHasLoadedMessages(false);
      if (messageSubscription) {
        messageSubscription();
      }
    };
  }, [id, conversations.length, user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (localMessages.length > 0 && hasLoadedMessages) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [localMessages.length, hasLoadedMessages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !id || sending) return;

    const content = messageText.trim();
    const tempId = `temp-${Date.now()}`; // Temporary ID for optimistic update

    // ✅ OPTIMISTIC UPDATE: Add message immediately to UI
    const optimisticMessage = {
      id: tempId,
      content: content,
      sender_id: user?.id || "",
      conversation_id: id,
      created_at: new Date().toISOString(),
      message_type: "text",
      read_by_recipient: false,
      read_at: null,
      edited_at: null,
      sender: {
        id: user?.id || "",
        full_name: user?.user_metadata?.full_name || "You",
        username: user?.email?.split("@")[0] || "you",
        email: user?.email || "",
        avatar_url: null,
        created_at: new Date().toISOString(),
      },
    };

    // Add optimistic message to the messages array
    setMessages((prevMessages) => [...prevMessages, optimisticMessage as any]);

    setMessageText("");
    setSending(true);

    // Auto-scroll immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const success = await sendMessage(id, content);
      if (!success) {
        // Remove optimistic message on failure
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== tempId)
        );
        Alert.alert("Error", "Failed to send message. Please try again.");
        setMessageText(content);
      } else {
        // ✅ REPLACE OPTIMISTIC: Remove temp message and reload to get real message
        setTimeout(async () => {
          setMessages((prevMessages) =>
            prevMessages.filter((msg) => msg.id !== tempId)
          );
          await loadMessages(id);
          // Auto-scroll after loading real messages
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }, 200);
      }
    } catch (error) {
      // Remove optimistic message on error
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== tempId)
      );
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
      setMessageText(content);
    } finally {
      setSending(false);
    }
  };

  // ✅ SIMPLIFIED: Always go back to chat list
  const handleBackPress = () => {
    // Always go back to chat list when pressing back from a conversation
    (router.push as any)("/(tabs)/chat/");
  };

  const getOtherParticipant = () => {
    if (!currentConversation || !user) return null;

    return currentConversation.participant_1_id === user.id
      ? currentConversation.participant_2
      : currentConversation.participant_1;
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday =
      new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() ===
      date.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (isYesterday) {
      return (
        "Yesterday " +
        date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      );
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  };

  const renderMessage = ({
    item,
    index,
  }: {
    item: MessageWithSender;
    index: number;
  }) => {
    const isMyMessage = item.sender_id === user?.id;
    const showTime =
      index === 0 ||
      new Date(item.created_at).getTime() -
        new Date(localMessages[index - 1].created_at).getTime() >
        300000; // 5 minutes

    return (
      <View style={styles.messageContainer}>
        {showTime && (
          <Text style={styles.messageTime}>
            {formatMessageTime(item.created_at)}
          </Text>
        )}

        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessage : styles.otherMessage,
          ]}
        >
          {!isMyMessage && (
            <View style={styles.senderInfo}>
              <Text style={styles.senderName}>{item.sender.full_name}</Text>
            </View>
          )}

          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.content}
          </Text>

          {item.message_type === "system" && (
            <View style={styles.systemMessageIndicator}>
              <Ionicons
                name="information-circle-outline"
                size={12}
                color="#6b7280"
              />
            </View>
          )}
        </View>

        {isMyMessage && (
          <View style={styles.messageStatus}>
            {item.read_by_recipient ? (
              <Ionicons name="checkmark-done" size={14} color="#10b981" />
            ) : (
              <Ionicons name="checkmark" size={14} color="#9ca3af" />
            )}
          </View>
        )}
      </View>
    );
  };

  const otherParticipant = getOtherParticipant();

  if (!currentConversation || !otherParticipant) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#18453b", "#2a6b5a", "#0f2f28"]}
          style={styles.background}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#18453b", "#2a6b5a", "#0f2f28"]}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBackPress} // ✅ IMPROVED: Smart back navigation
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.participantAvatar}>
            <Text style={styles.participantAvatarText}>
              {otherParticipant.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.participantInfo}>
            <Text style={styles.participantName}>
              {otherParticipant.full_name}
            </Text>
            <Text style={styles.participantUsername}>
              @{otherParticipant.username}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            Alert.alert("Chat Options", "Choose an action", [
              {
                text: "View Profile",
                onPress: () => {
                  // TODO: Navigate to user profile
                  Alert.alert("Profile", "User profile feature coming soon!");
                },
              },
              {
                text: "View Ticket",
                onPress: () => {
                  if (currentConversation.ticket) {
                    (router.push as any)(
                      `/ticket-details/${currentConversation.ticket.id}`
                    );
                  } else {
                    Alert.alert(
                      "No Ticket",
                      "This conversation is not related to a specific ticket."
                    );
                  }
                },
              },
              {
                text: "Chat List",
                onPress: () => {
                  (router.push as any)("/(tabs)/chat/");
                },
              },
              { text: "Cancel", style: "cancel" },
            ]);
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Ticket Reference (if applicable) */}
      {currentConversation.ticket && (
        <View style={styles.ticketReference}>
          <BlurView intensity={20} style={styles.ticketReferenceBlur}>
            <View style={styles.ticketReferenceContent}>
              <Ionicons name="ticket-outline" size={16} color="#18453b" />
              <Text style={styles.ticketReferenceText} numberOfLines={1}>
                About: {currentConversation.ticket.title}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  (router.push as any)(
                    `/ticket-details/${currentConversation.ticket!.id}`
                  )
                }
              >
                <Ionicons name="open-outline" size={16} color="#18453b" />
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Messages */}
        <View style={styles.messagesContainer}>
          {messagesLoading && !hasLoadedMessages ? (
            <View style={styles.loadingMessages}>
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : localMessages.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={localMessages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => {
                if (hasLoadedMessages) {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }
              }}
            />
          ) : hasLoadedMessages ? (
            <View style={styles.emptyMessages}>
              <View style={styles.emptyMessagesIcon}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={32}
                  color="#9ca3af"
                />
              </View>
              <Text style={styles.emptyMessagesTitle}>
                Start the conversation
              </Text>
              <Text style={styles.emptyMessagesText}>
                Send a message to {otherParticipant.full_name}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <BlurView intensity={90} style={styles.inputBlur}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.messageInput}
                placeholder={`Message ${otherParticipant.full_name}...`}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={1000}
                placeholderTextColor="#9ca3af"
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  messageText.trim() && !sending
                    ? styles.sendButtonActive
                    : styles.sendButtonInactive,
                ]}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || sending}
              >
                {sending ? (
                  <View style={styles.sendingIndicator} />
                ) : (
                  <Ionicons
                    name="send"
                    size={20}
                    color={messageText.trim() && !sending ? "white" : "#9ca3af"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginHorizontal: 16,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffd700",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  participantAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#18453b",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  participantUsername: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  ticketReference: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  ticketReferenceBlur: {
    borderRadius: 12,
    overflow: "hidden",
  },
  ticketReferenceContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  ticketReferenceText: {
    flex: 1,
    fontSize: 12,
    color: "#18453b",
    fontWeight: "500",
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingMessages: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    fontStyle: "italic",
  },
  messagesList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageTime: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "500",
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#18453b",
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  senderInfo: {
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: "white",
  },
  otherMessageText: {
    color: "#1e293b",
  },
  systemMessageIndicator: {
    marginTop: 4,
    alignSelf: "flex-end",
  },
  messageStatus: {
    alignSelf: "flex-end",
    marginTop: 4,
    marginRight: 4,
  },
  emptyMessages: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyMessagesIcon: {
    width: 64,
    height: 64,
    backgroundColor: "#f1f5f9",
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyMessagesTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyMessagesText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  inputBlur: {
    borderRadius: 20,
    overflow: "hidden",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
    maxHeight: 100,
    paddingTop: Platform.OS === "ios" ? 8 : 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonActive: {
    backgroundColor: "#18453b",
  },
  sendButtonInactive: {
    backgroundColor: "#f1f5f9",
  },
  sendingIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderTopColor: "white",
  },
});
