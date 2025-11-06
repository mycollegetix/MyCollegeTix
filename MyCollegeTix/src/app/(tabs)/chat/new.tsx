// src/app/(tabs)/chat/new.tsx - New conversation screen (creates conversation only on first message)
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  Dimensions,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useChat } from "@/src/providers/ChatProvider";
import { useAuth } from "@/src/providers/AuthProvider";
import { useTheme } from "@/src/providers/ThemeProvider";

const { width, height } = Dimensions.get("window");

export default function NewConversationScreen() {
  const { sellerId, ticketId, sellerName, ticketTitle } = useLocalSearchParams<{
    sellerId: string;
    ticketId: string;
    sellerName: string;
    ticketTitle: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const { getOrCreateConversation, conversations } = useChat();

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [hasCheckedExisting, setHasCheckedExisting] = useState(false);
  const [lastSendAttempt, setLastSendAttempt] = useState(0);
  const [userNavigatedAway, setUserNavigatedAway] = useState(false);

  // Check for existing conversation when screen is focused
  const checkForExistingConversation = useCallback(() => {
    if (!sellerId || !ticketId || !user || hasCheckedExisting || userNavigatedAway) return;

    console.log("🔍 Checking for existing conversation on new screen focus");
    
    const existingConversation = conversations.find(conv => {
      const otherParticipant = conv.participant_1_id === user.id 
        ? conv.participant_2 
        : conv.participant_1;
      
      const isWithCorrectSeller = otherParticipant?.id === sellerId;
      const isForCorrectTicket = conv.ticket_id === ticketId;
      
      return isWithCorrectSeller && isForCorrectTicket;
    });

    if (existingConversation) {
      console.log("✅ Found existing conversation, redirecting:", existingConversation.id);
      // Replace current screen to avoid navigation issues
      (router.replace as any)(`/(tabs)/chat/${existingConversation.id}`);
      return;
    }

    setHasCheckedExisting(true);
  }, [sellerId, ticketId, user, conversations, hasCheckedExisting, userNavigatedAway, router]);

  // Check for existing conversation only on first load
  useEffect(() => {
    checkForExistingConversation();
  }, [checkForExistingConversation]);

  // Validate required parameters
  useEffect(() => {
    if (!sellerId || !ticketId || !sellerName || !ticketTitle) {
      console.error("❌ Missing required parameters for new conversation");
      Alert.alert("Error", "Missing conversation details", [
        { 
          text: "OK", 
          onPress: () => router.back() 
        }
      ]);
    }
  }, [sellerId, ticketId, sellerName, ticketTitle, router]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up new conversation screen");
      setMessageText("");
      setSending(false);
      setHasCheckedExisting(false);
      setLastSendAttempt(0);
      setUserNavigatedAway(false);
    };
  }, []);

  const handleSendFirstMessage = async () => {
    if (!messageText.trim() || !sellerId || !ticketId || sending) return;

    // Prevent rapid double-taps (debounce for 2 seconds)
    const now = Date.now();
    if (now - lastSendAttempt < 2000) {
      console.log("⚠️ Preventing rapid double-tap on send button");
      return;
    }
    setLastSendAttempt(now);

    const content = messageText.trim();
    setSending(true);

    try {
      console.log("🔄 Creating conversation and sending first message...");
      
      // Final check for existing conversation to prevent race conditions
      const existingConversation = conversations.find(conv => {
        const otherParticipant = conv.participant_1_id === user?.id 
          ? conv.participant_2 
          : conv.participant_1;
        
        const isWithCorrectSeller = otherParticipant?.id === sellerId;
        const isForCorrectTicket = conv.ticket_id === ticketId;
        
        return isWithCorrectSeller && isForCorrectTicket;
      });

      if (existingConversation) {
        console.log("✅ Found existing conversation during send, navigating:", existingConversation.id);
        (router.replace as any)(`/(tabs)/chat/${existingConversation.id}?firstMessage=${encodeURIComponent(content)}`);
        return;
      }
      
      // Validate that user is not trying to message themselves (extra safety check)
      if (sellerId === user?.id) {
        Alert.alert("Error", "You cannot message yourself.");
        setSending(false);
        return;
      }

      // Create new conversation since the user is actually sending a message
      const conversationId = await getOrCreateConversation(sellerId, ticketId);

      if (!conversationId) {
        throw new Error("Failed to create conversation - this could be due to account restrictions or the ticket being unavailable");
      }

      console.log("✅ Conversation created:", conversationId);
      console.log("🚀 Navigating to chat with first message...");

      // Navigate to the actual chat screen with the created conversation
      // Pass the first message as a parameter so it can be sent immediately
      (router.replace as any)(`/(tabs)/chat/${conversationId}?firstMessage=${encodeURIComponent(content)}`);
      
    } catch (error) {
      console.error("❌ Error creating conversation:", error);
      Alert.alert("Error", "Failed to send message. Please try again.", [
        { 
          text: "OK", 
          onPress: () => setSending(false) 
        }
      ]);
    }
  };

  const handleBackPress = () => {
    console.log("🔙 Navigating back from new conversation screen");
    // Mark that user intentionally navigated away
    setUserNavigatedAway(true);
    
    // Reset state when going back to prevent issues
    setMessageText("");
    setSending(false);
    setHasCheckedExisting(false);
    setLastSendAttempt(0);
    
    // Navigate specifically to chat list instead of using router.back()
    // This ensures we go to the right place and don't get stuck in navigation loops
    (router.replace as any)("/(tabs)/chat/");
  };

  const decodedSellerName = decodeURIComponent(sellerName || "");
  const decodedTicketTitle = decodeURIComponent(ticketTitle || "");

  // Don't render if missing required params
  if (!sellerId || !ticketId || !sellerName || !ticketTitle) {
    console.log("❌ Missing required parameters, redirecting to chat list");
    // Redirect to chat list if parameters are missing
    setTimeout(() => {
      (router.replace as any)("/(tabs)/chat/");
    }, 100);
    return null;
  }

  // Show loading state while checking for existing conversations
  if (!hasCheckedExisting && conversations.length > 0 && !userNavigatedAway) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
          style={styles.background}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Checking existing conversations...</Text>
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
              {decodedSellerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.participantInfo}>
            <Text style={styles.participantName}>
              {decodedSellerName}
            </Text>
            <Text style={styles.participantSubtext}>
              New Conversation
            </Text>
          </View>
        </View>

        <View style={styles.headerButton} />
      </View>

      {/* Ticket Reference */}
      <TouchableOpacity
        style={styles.ticketReference}
        onPress={() => (router.push as any)(`/ticket-details/${ticketId}`)}
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
              numberOfLines={2}
            >
              About: {decodedTicketTitle}
            </Text>
            <Ionicons name="open-outline" size={16} color={theme.secondary} />
          </View>
        </BlurView>
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Main Content */}
        <View style={styles.messagesContainer}>
          <View style={styles.welcomeContainer}>
            <View style={styles.welcomeIcon}>
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={theme.primary}
              />
            </View>
            <Text style={styles.welcomeTitle}>
              Start a conversation with {decodedSellerName}
            </Text>
            <Text style={styles.welcomeText}>
              Send your first message to begin discussing this ticket. The conversation will be created when you send your message.
            </Text>
            
            {sending && (
              <View style={styles.sendingProgress}>
                <View style={styles.sendingIndicator} />
                <Text style={styles.sendingText}>Creating conversation...</Text>
              </View>
            )}
            
            <View style={styles.ticketInfoCard}>
              <View style={styles.ticketInfoHeader}>
                <Ionicons
                  name="ticket-outline"
                  size={20}
                  color={theme.primary}
                />
                <Text style={[styles.ticketInfoTitle, { color: theme.primary }]}>
                  Ticket Details
                </Text>
              </View>
              <Text style={styles.ticketInfoText} numberOfLines={3}>
                {decodedTicketTitle}
              </Text>
            </View>
          </View>
        </View>

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <BlurView intensity={90} style={styles.inputBlur}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.messageInput}
                placeholder={`Send your first message to ${decodedSellerName}...`}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={1000}
                placeholderTextColor="#9ca3af"
                autoFocus={true}
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
                onPress={handleSendFirstMessage}
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
  participantSubtext: {
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
  welcomeContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    backgroundColor: "#f1f5f9",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
    textAlign: "center",
  },
  welcomeText: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  ticketInfoCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#bae6fd",
    width: "100%",
    maxWidth: 300,
  },
  ticketInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  ticketInfoTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  ticketInfoText: {
    fontSize: 14,
    color: "#0369a1",
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "white",
    fontStyle: "italic",
    textAlign: "center",
  },
  sendingProgress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
    gap: 8,
  },
  sendingText: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
  },
});