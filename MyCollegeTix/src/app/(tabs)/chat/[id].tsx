// src/app/(tabs)/chat/[id].tsx - FIXED with proper conversation isolation
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
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useChat } from "@/src/providers/ChatProvider";
import { useAuth } from "@/src/providers/AuthProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { MessageWithSender } from "@/src/types/database.types";
import { ReportModal } from "@/src/components/ReportModal";
import { reportingService } from "@/src/services/reportingService";

const { width, height } = Dimensions.get("window");

export default function ChatConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const {
    currentConversation,
    messages, // ✅ NOW: Using isolated messages from provider
    messagesLoading,
    loadMessages,
    sendMessage,
    markAsRead,
    setCurrentConversation,
    clearMessagesForNewConversation,
    conversations,
  } = useChat();

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);

  // ✅ REMOVED: hasLoadedMessages and isConversationSwitching - provider handles this
  const flatListRef = useRef<FlatList>(null);

  // ✅ NEW: Track current conversation ID to detect switches
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);

  // ✅ ENHANCED: Smarter conversation loading with proper isolation
  const loadConversationData = useCallback(
    async (conversationId: string) => {
      console.log(
        "🔄 [id].tsx: Loading conversation data for:",
        conversationId
      );

      // ✅ ISOLATION: Clear messages when switching conversations
      if (currentConversationId && currentConversationId !== conversationId) {
        console.log(
          "🔄 [id].tsx: Conversation switch detected, clearing messages"
        );
        clearMessagesForNewConversation();
      }

      setCurrentConversationId(conversationId);

      // Find conversation from loaded conversations
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        console.log("✅ [id].tsx: Found conversation, setting as current");
        setCurrentConversation(conversation);

        // ✅ SMART MARK AS READ: Only mark as read if there are unread messages
        if (conversation.unread_count > 0) {
          console.log(
            "📖 [id].tsx: Marking messages as read (has unread messages)"
          );
          await markAsRead(conversationId);
        } else {
          console.log("✅ [id].tsx: No unread messages, skipping mark as read");
        }

        // ✅ ISOLATION: Always load messages for the specific conversation
        console.log("📨 [id].tsx: Loading messages for conversation");
        await loadMessages(conversationId);
      } else {
        console.log(
          "❌ [id].tsx: Conversation not found in loaded conversations"
        );
      }
    },
    [
      conversations,
      loadMessages,
      markAsRead,
      setCurrentConversation,
      clearMessagesForNewConversation,
      currentConversationId,
    ]
  );

  // Enhanced keyboard handling for both platforms
  useEffect(() => {
    const keyboardDidShow = () => {
      // Auto-scroll to bottom when keyboard shows - longer delay for Android
      setTimeout(
        () => {
          flatListRef.current?.scrollToEnd({ animated: true });
        },
        Platform.OS === "android" ? 150 : 100
      );
    };

    const keyboardDidHide = () => {
      // On Android, ensure proper positioning when keyboard hides
      if (Platform.OS === "android") {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      keyboardDidShow
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      keyboardDidHide
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Check if user is blocked
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (currentConversation) {
        const otherParticipant = getOtherParticipant();
        if (otherParticipant) {
          const blocked = await reportingService.isUserBlocked(
            otherParticipant.id
          );
          setIsUserBlocked(blocked);
        }
      }
    };

    checkBlockStatus();
  }, [currentConversation]);

  // ✅ ENHANCED: Effect for loading conversation data with proper isolation
  useEffect(() => {
    if (id) {
      console.log("🔄 [id].tsx: Conversation ID changed to:", id);
      loadConversationData(id);
    }

    // ✅ ENHANCED: Cleanup with proper state isolation
    return () => {
      console.log("🧹 [id].tsx: Cleaning up conversation screen for:", id);
      // Don't clear current conversation here - let the provider handle isolation
    };
  }, [id, conversations.length]);

  // ✅ REMOVED: Auto mark as read effect - provider handles this better

  // ✅ ENHANCED: Auto-scroll with better message tracking
  useEffect(() => {
    if (messages.length > 0 && currentConversation?.id === id) {
      // Only auto-scroll if we're viewing the current conversation
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, currentConversation?.id, id]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !id || sending) return;

    const content = messageText.trim();
    setMessageText("");
    setSending(true);

    // Auto-scroll immediately for better UX
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const success = await sendMessage(id, content);
      if (!success) {
        Alert.alert("Error", "Failed to send message. Please try again.");
        setMessageText(content); // Restore message text on failure
      } else {
        console.log("✅ [id].tsx: Message sent successfully");
        // Provider's real-time subscription will handle adding the message
      }
    } catch (error) {
      console.error("❌ [id].tsx: Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
      setMessageText(content); // Restore message text on error
    } finally {
      setSending(false);
    }
  };

  // ✅ SIMPLIFIED: Always go back to chat list
  const handleBackPress = () => {
    // Clear current conversation when going back for proper isolation
    setCurrentConversation(null);
    setCurrentConversationId(null);
    router.push("/(tabs)/chat/" as any);
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
    const isSystemMessage = item.message_type === "system";
    const showTime =
      index === 0 ||
      new Date(item.created_at).getTime() -
        new Date(messages[index - 1].created_at).getTime() >
        300000; // 5 minutes

    // Special rendering for system messages
    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          {showTime && (
            <Text style={styles.messageTime}>
              {formatMessageTime(item.created_at)}
            </Text>
          )}
          <View style={styles.systemMessageBubble}>
            <View style={styles.systemMessageHeader}>
              <Ionicons
                name="information-circle"
                size={16}
                color={theme.primary}
              />
              <Text
                style={[styles.systemMessageTitle, { color: theme.primary }]}
              >
                MyCollegeTix Info
              </Text>
            </View>
            <Text style={styles.systemMessageText}>{item.content}</Text>
          </View>
        </View>
      );
    }

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
            isMyMessage
              ? [styles.myMessage, { backgroundColor: theme.primary }]
              : styles.otherMessage,
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

  // ✅ ENHANCED: Better loading state with conversation isolation check
  if (
    !currentConversation ||
    !otherParticipant ||
    currentConversation.id !== id
  ) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
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
        colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View
            style={[
              styles.participantAvatar,
              { backgroundColor: theme.secondary },
            ]}
          >
            <Text
              style={[styles.participantAvatarText, { color: theme.primary }]}
            >
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
                text: "Report User",
                onPress: () => setShowReportModal(true),
              },
              {
                text: isUserBlocked ? "Unblock User" : "Block User",
                onPress: async () => {
                  if (isUserBlocked) {
                    const result = await reportingService.unblockUser(
                      otherParticipant.id
                    );
                    if (result.success) {
                      setIsUserBlocked(false);
                      Alert.alert("Success", "User has been unblocked");
                    } else {
                      Alert.alert(
                        "Error",
                        result.error || "Failed to unblock user"
                      );
                    }
                  } else {
                    Alert.alert(
                      "Block User",
                      `Are you sure you want to block ${otherParticipant.full_name}? They won't be able to message you.`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Block",
                          style: "destructive",
                          onPress: async () => {
                            const result = await reportingService.blockUser(
                              otherParticipant.id,
                              "Blocked from chat"
                            );
                            if (result.success) {
                              setIsUserBlocked(true);
                              Alert.alert("Success", "User has been blocked");
                            } else {
                              Alert.alert(
                                "Error",
                                result.error || "Failed to block user"
                              );
                            }
                          },
                        },
                      ]
                    );
                  }
                },
              },
              {
                text: "View Profile",
                onPress: () => {
                  // TODO: Navigate to user profile
                  Alert.alert("Profile", "User profile feature coming soon!");
                },
              },
              {
                text: "Chat List",
                onPress: () => {
                  handleBackPress();
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
        <TouchableOpacity
          style={styles.ticketReference}
          onPress={() =>
            router.push(
              `/ticket-details/${currentConversation.ticket!.id}` as any
            )
          }
        >
          <BlurView intensity={20} style={styles.ticketReferenceBlur}>
            <View style={styles.ticketReferenceContent}>
              <Ionicons
                name="ticket-outline"
                size={16}
                color={theme.secondary}
              />
              <Text
                style={[styles.ticketReferenceText, { color: theme.secondary }]}
                numberOfLines={1}
              >
                About: {currentConversation.ticket.title}
              </Text>
              <Ionicons name="open-outline" size={16} color={theme.secondary} />
            </View>
          </BlurView>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Messages */}
        <View style={styles.messagesContainer}>
          {messagesLoading && messages.length === 0 ? (
            <View style={styles.loadingMessages}>
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "android" ? "on-drag" : "interactive"
              }
              removeClippedSubviews={Platform.OS === "android"}
              nestedScrollEnabled={Platform.OS === "android"}
              initialNumToRender={Platform.OS === "android" ? 15 : 10}
              maxToRenderPerBatch={Platform.OS === "android" ? 8 : 10}
              updateCellsBatchingPeriod={Platform.OS === "android" ? 100 : 50}
              windowSize={Platform.OS === "android" ? 8 : 10}
              contentContainerStyle={styles.messagesList}
              ListEmptyComponent={
                !messagesLoading ? (
                  <View style={styles.emptyMessages}>
                    {currentConversation?.ticket && (
                      <View style={styles.sellingProcessContainer}>
                        <View style={styles.sellingProcessBubble}>
                          <View style={styles.sellingProcessHeader}>
                            <Ionicons
                              name="information-circle"
                              size={16}
                              color={theme.primary}
                            />
                            <Text
                              style={[
                                styles.sellingProcessTitle,
                                { color: theme.primary },
                              ]}
                            >
                              How MyCollegeTix Works
                            </Text>
                          </View>
                          <Text style={styles.sellingProcessText}>
                            Welcome to MyCollegeTix! 🎫{"\n\n"}
                            Here's how ticket selling works:{"\n"}• Chat about
                            ticket details and price{"\n"}• Negotiate terms
                            privately{"\n"}• When you agree on a sale, the
                            seller marks it as sold in their Orders tab{"\n"}•
                            Tickets stay available until the seller manually
                            marks them as sold{"\n\n"}
                            Happy ticket trading! 🏈
                          </Text>
                        </View>
                      </View>
                    )}

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
                      Send a message to {otherParticipant?.full_name}
                    </Text>
                  </View>
                ) : null
              }
              onContentSizeChange={() => {
                // Always scroll to end when content changes and we have messages
                if (messages.length > 0) {
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: false });
                  }, 100);
                }
              }}
              onLayout={() => {
                // Scroll to end when FlatList is first laid out with messages
                if (messages.length > 0) {
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: false });
                  }, 100);
                }
              }}
            />
          )}
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
                onFocus={() => {
                  // Platform-specific scroll timing when focusing input
                  setTimeout(
                    () => {
                      flatListRef.current?.scrollToEnd({ animated: true });
                    },
                    Platform.OS === "android" ? 400 : 300
                  );
                }}
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  messageText.trim() && !sending
                    ? [
                        styles.sendButtonActive,
                        { backgroundColor: theme.primary },
                      ]
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

      {/* Report Modal */}
      {otherParticipant && (
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportedUserId={otherParticipant.id}
          reportedUserName={otherParticipant.full_name}
          contentId={id || ""}
          contentType="message"
          onReportSubmitted={() => {
            // Optionally refresh block status or show success message
            Alert.alert(
              "Thank you",
              "Your report has been submitted and will be reviewed within 24 hours."
            );
          }}
        />
      )}
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  participantAvatarText: {
    fontSize: 16,
    fontWeight: "700",
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
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
    fontWeight: "500",
    color: "black",
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
    color: "black",
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
    color: "black",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: "black",
  },
  myMessageText: {
    color: "white",
  },
  otherMessageText: {
    color: "#1e293b",
  },
  systemMessageContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  systemMessageBubble: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    maxWidth: "90%",
  },
  systemMessageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  systemMessageTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  systemMessageText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    textAlign: "left",
  },
  sellingProcessContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  sellingProcessBubble: {
    backgroundColor: "#f0f9ff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "#bae6fd",
    maxWidth: "90%",
  },
  sellingProcessHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  sellingProcessTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  sellingProcessText: {
    fontSize: 14,
    color: "#0369a1",
    lineHeight: 20,
    textAlign: "left",
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
    backgroundColor: Platform.OS === "android" ? "#f8fafc" : "transparent",
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    maxHeight: 100,
    paddingTop: Platform.OS === "ios" ? 8 : 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonActive: {
    // backgroundColor set dynamically with theme.primary
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
