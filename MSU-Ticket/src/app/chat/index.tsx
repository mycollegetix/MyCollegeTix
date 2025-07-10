// src/app/chat/index.tsx
import React, { useEffect } from "react";
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  View,
  Text,
  Dimensions,
  RefreshControl,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useChat } from "@/src/providers/ChatProvider";
import { useAuth } from "@/src/providers/AuthProvider";
import { ConversationWithDetails } from "@/src/types/database.types";

const { width, height } = Dimensions.get("window");

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { conversations, loading, loadConversations, setCurrentConversation } =
    useChat();

  useEffect(() => {
    loadConversations();
  }, []);

  const getOtherParticipant = (conversation: ConversationWithDetails) => {
    return conversation.participant_1_id === user?.id
      ? conversation.participant_2
      : conversation.participant_1;
  };

  const formatLastMessageTime = (dateString: string | null) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;

    return date.toLocaleDateString();
  };

  const handleConversationPress = (conversation: ConversationWithDetails) => {
    setCurrentConversation(conversation);
    (router.push as any)(`/chat/${conversation.id}`);
  };

  const renderConversation = ({ item }: { item: ConversationWithDetails }) => {
    const otherParticipant = getOtherParticipant(item);
    const hasUnread = item.unread_count > 0;
    const lastMessageTime = formatLastMessageTime(item.last_message_at);

    return (
      <TouchableOpacity
        style={[
          styles.conversationCard,
          hasUnread && styles.unreadConversation,
        ]}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.conversationContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {otherParticipant.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            {hasUnread && <View style={styles.onlineIndicator} />}
          </View>

          {/* Conversation Info */}
          <View style={styles.conversationInfo}>
            <View style={styles.conversationHeader}>
              <Text
                style={[styles.participantName, hasUnread && styles.unreadText]}
                numberOfLines={1}
              >
                {otherParticipant.full_name}
              </Text>
              {lastMessageTime && (
                <Text style={styles.timeText}>{lastMessageTime}</Text>
              )}
            </View>

            <View style={styles.messagePreview}>
              <Text
                style={[styles.lastMessage, hasUnread && styles.unreadText]}
                numberOfLines={1}
              >
                {item.last_message?.content || "No messages yet"}
              </Text>
              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>
                    {item.unread_count > 99 ? "99+" : item.unread_count}
                  </Text>
                </View>
              )}
            </View>

            {/* Ticket reference if applicable */}
            {item.ticket && (
              <View style={styles.ticketReference}>
                <Ionicons name="ticket-outline" size={12} color="#18453b" />
                <Text style={styles.ticketText} numberOfLines={1}>
                  {item.ticket.title}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>
    );
  };

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
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            // TODO: Add new conversation functionality
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <BlurView intensity={30} style={styles.statsCard}>
          <LinearGradient
            colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
            style={styles.statsGradient}
          >
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="chatbubbles" size={20} color="#18453b" />
              </View>
              <Text style={styles.statNumber}>{conversations.length}</Text>
              <Text style={styles.statLabel}>Conversations</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="mail-unread" size={20} color="#ef4444" />
              </View>
              <Text style={[styles.statNumber, { color: "#ef4444" }]}>
                {conversations.reduce(
                  (sum, conv) => sum + conv.unread_count,
                  0
                )}
              </Text>
              <Text style={styles.statLabel}>Unread</Text>
            </View>
          </LinearGradient>
        </BlurView>
      </View>

      {/* Conversations List */}
      <View style={styles.conversationsContainer}>
        {loading ? (
          <BlurView intensity={20} style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </BlurView>
        ) : conversations.length > 0 ? (
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadConversations}
                tintColor="#18453b"
                colors={["#18453b"]}
              />
            }
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <BlurView intensity={20} style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <LinearGradient
                colors={["#18453b", "#2d7a6b"]}
                style={styles.emptyIconGradient}
              >
                <Ionicons name="chatbubbles-outline" size={32} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.emptyStateTitle}>No conversations yet</Text>
            <Text style={styles.emptyStateText}>
              Start a conversation by contacting a seller from a ticket listing
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => (router.push as any)("/(tabs)/")}
            >
              <LinearGradient
                colors={["#18453b", "#2a6b5a"]}
                style={styles.browseButtonGradient}
              >
                <Ionicons name="search-outline" size={16} color="white" />
                <Text style={styles.browseButtonText}>Browse Tickets</Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        )}
      </View>
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
    paddingBottom: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
  },
  statsGradient: {
    flexDirection: "row",
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "white",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 16,
  },
  conversationsContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  conversationCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  unreadConversation: {
    borderColor: "#18453b",
    backgroundColor: "#fefffe",
    shadowColor: "#18453b",
    shadowOpacity: 0.1,
  },
  conversationContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#18453b",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  onlineIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "white",
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  unreadText: {
    fontWeight: "700",
    color: "#0f172a",
  },
  timeText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  messagePreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMessage: {
    fontSize: 14,
    color: "#64748b",
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "white",
  },
  ticketReference: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  ticketText: {
    fontSize: 12,
    color: "#18453b",
    fontWeight: "500",
    flex: 1,
  },
  loadingState: {
    alignItems: "center",
    padding: 40,
    margin: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(24, 69, 59, 0.2)",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    fontStyle: "italic",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    margin: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(24, 69, 59, 0.2)",
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: 24,
  },
  browseButton: {
    borderRadius: 12,
  },
  browseButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  browseButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
