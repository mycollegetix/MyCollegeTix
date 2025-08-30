// src/app/(tabs)/chat/index.tsx - FIXED with proper theme usage and no linear gradients
import React, { useEffect, useMemo } from "react";
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  View,
  Text,
  Dimensions,
  RefreshControl,
  StatusBar,
  SectionList,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useChat } from "@/src/providers/ChatProvider";
import { useAuth } from "@/src/providers/AuthProvider";
import { ConversationWithDetails } from "@/src/types/database.types";
import { NotificationBadge } from "@/src/components/NotificationBadge";

interface ConversationSection {
  title: string;
  data: ConversationWithDetails[];
  key: string;
}

export default function ChatListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const {
    conversations,
    loading,
    loadConversations,
    setCurrentConversation,
    markAsRead,
  } = useChat();

  // ✅ OPTIMIZED: Load conversations only once on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // ✅ REMOVED: useFocusEffect that was causing infinite loops
  // Real-time subscriptions will handle updates automatically

  // ✅ ORGANIZE: Separate conversations into sections
  const conversationSections = useMemo((): ConversationSection[] => {
    const activeConversations: ConversationWithDetails[] = [];
    const expiredConversations: ConversationWithDetails[] = [];

    conversations.forEach((conv) => {
      if (conv.archived || conv.is_expired) {
        expiredConversations.push(conv);
      } else {
        activeConversations.push(conv);
      }
    });

    const sections: ConversationSection[] = [];

    if (activeConversations.length > 0) {
      sections.push({
        title: "Active Conversations",
        data: activeConversations,
        key: "active",
      });
    }

    if (expiredConversations.length > 0) {
      sections.push({
        title: "Expired Events",
        data: expiredConversations,
        key: "expired",
      });
    }

    return sections;
  }, [conversations]);

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
    (router.push as any)(`/(tabs)/chat/${conversation.id}`);
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: ConversationSection;
  }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderContent}>
        <Ionicons
          name={section.key === "active" ? "chatbubbles" : "time-outline"}
          size={16}
          color={section.key === "active" ? theme.primary : "#94a3b8"}
        />
        <Text
          style={[
            styles.sectionHeaderText,
            section.key === "expired" && styles.expiredSectionText,
          ]}
        >
          {section.title}
        </Text>
        <View
          style={[
            styles.sectionCount,
            {
              backgroundColor:
                section.key === "active" ? theme.primary : "#94a3b8",
            },
            section.key === "expired" && styles.expiredSectionCount,
          ]}
        >
          <Text
            style={[
              styles.sectionCountText,
              section.key === "expired" && styles.expiredSectionCountText,
            ]}
          >
            {section.data.length}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderConversation = ({ item }: { item: ConversationWithDetails }) => {
    const otherParticipant = getOtherParticipant(item);
    const hasUnread = item.unread_count > 0;
    const lastMessageTime = formatLastMessageTime(item.last_message_at);
    const isExpired = item.archived || item.is_expired;

    return (
      <TouchableOpacity
        style={[
          styles.conversationCard,
          hasUnread &&
            !isExpired && [
              styles.unreadConversation,
              { borderColor: theme.primary },
            ],
          isExpired && styles.expiredConversation,
        ]}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.conversationContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: isExpired ? "#94a3b8" : theme.primary },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  isExpired && styles.expiredAvatarText,
                ]}
              >
                {otherParticipant.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            {hasUnread && !isExpired && <View style={styles.onlineIndicator} />}
            {isExpired && (
              <View style={styles.expiredIndicator}>
                <Ionicons name="time-outline" size={8} color="#94a3b8" />
              </View>
            )}
          </View>

          {/* Conversation Info */}
          <View style={styles.conversationInfo}>
            <View style={styles.conversationHeader}>
              <Text
                style={[
                  styles.participantName,
                  hasUnread && !isExpired && styles.unreadText,
                  isExpired && styles.expiredText,
                ]}
                numberOfLines={1}
              >
                {otherParticipant.full_name}
              </Text>
              {lastMessageTime && (
                <Text
                  style={[styles.timeText, isExpired && styles.expiredTimeText]}
                >
                  {lastMessageTime}
                </Text>
              )}
            </View>

            <View style={styles.messagePreview}>
              <Text
                style={[
                  styles.lastMessage,
                  hasUnread && !isExpired && styles.unreadText,
                  isExpired && styles.expiredText,
                ]}
                numberOfLines={1}
              >
                {item.last_message?.content || "No messages yet"}
              </Text>
              {hasUnread && !isExpired && (
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
                <Ionicons
                  name="ticket-outline"
                  size={12}
                  color={isExpired ? "#94a3b8" : theme.primary}
                />
                <Text
                  style={[
                    [
                      styles.ticketText,
                      { color: isExpired ? "#94a3b8" : theme.primary },
                    ],
                    isExpired && styles.expiredTicketText,
                  ]}
                  numberOfLines={1}
                >
                  {item.ticket.title}
                  {isExpired && " (Expired)"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={isExpired ? "#cbd5e1" : "#9ca3af"}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.background, { backgroundColor: theme.primary }]} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[styles.logoContainer, { backgroundColor: theme.secondary }]}
          >
            <View style={styles.logo}>
              <Ionicons name="chatbubbles" size={20} color={theme.primary} />
            </View>
          </View>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => (router.push as any)("/notifications/")}
        >
          <NotificationBadge
            iconName="notifications-outline"
            iconSize={24}
            iconColor={theme.secondary}
          />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <BlurView intensity={30} style={styles.statsCard}>
          <View
            style={[
              styles.statsGradient,
              { backgroundColor: `${theme.primary}20` },
            ]}
          >
            <View style={styles.statItem}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: `${theme.secondary}20` },
                ]}
              >
                <Ionicons
                  name="chatbubbles"
                  size={20}
                  color={theme.secondary}
                />
              </View>
              <Text style={styles.statNumber}>
                {conversationSections.find((s) => s.key === "active")?.data
                  .length || 0}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "rgba(239, 68, 68, 0.2)" },
                ]}
              >
                <Ionicons name="mail-unread" size={20} color="#ef4444" />
              </View>
              <Text style={[styles.statNumber, { color: "#ef4444" }]}>
                {conversations
                  .filter((conv) => !conv.archived && !conv.is_expired)
                  .reduce((sum, conv) => sum + conv.unread_count, 0)}
              </Text>
              <Text style={styles.statLabel}>Unread</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "rgba(148, 163, 184, 0.2)" },
                ]}
              >
                <Ionicons name="time-outline" size={20} color="#94a3b8" />
              </View>
              <Text style={[styles.statNumber, { color: "#94a3b8" }]}>
                {conversationSections.find((s) => s.key === "expired")?.data
                  .length || 0}
              </Text>
              <Text style={styles.statLabel}>Expired</Text>
            </View>
          </View>
        </BlurView>
      </View>

      {/* Conversations List */}
      <View style={styles.conversationsContainer}>
        {loading ? (
          <BlurView intensity={20} style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </BlurView>
        ) : conversations.length > 0 ? (
          <SectionList
            sections={conversationSections}
            renderItem={renderConversation}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "android" ? "on-drag" : "interactive"}
            removeClippedSubviews={Platform.OS === 'android'}
            nestedScrollEnabled={Platform.OS === 'android'}
            initialNumToRender={Platform.OS === 'android' ? 8 : 10}
            maxToRenderPerBatch={Platform.OS === 'android' ? 6 : 10}
            updateCellsBatchingPeriod={Platform.OS === 'android' ? 100 : 50}
            windowSize={Platform.OS === 'android' ? 6 : 10}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadConversations}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
          />
        ) : (
          <BlurView intensity={20} style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <View
                style={[
                  styles.emptyIconGradient,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Ionicons name="chatbubbles-outline" size={32} color="white" />
              </View>
            </View>
            <Text style={styles.emptyStateTitle}>No conversations yet</Text>
            <Text style={styles.emptyStateText}>
              Start a conversation by contacting a seller from a ticket listing
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => (router.push as any)("/(tabs)/")}
            >
              <View
                style={[
                  styles.browseButtonGradient,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Ionicons name="search-outline" size={16} color="white" />
                <Text style={styles.browseButtonText}>Browse Tickets</Text>
              </View>
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    marginRight: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
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
  // ✅ Section header styles
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
  },
  expiredSectionText: {
    color: "#64748b",
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  expiredSectionCount: {
    backgroundColor: "#94a3b8",
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  expiredSectionCountText: {
    color: "white",
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
    backgroundColor: "#fefffe",
    shadowOpacity: 0.1,
  },
  // ✅ Expired conversation styles
  expiredConversation: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    opacity: 0.8,
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
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  expiredAvatarText: {
    color: "#f1f5f9",
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
  // ✅ Expired indicator
  expiredIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 2,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
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
  // ✅ Expired text styles
  expiredText: {
    color: "#64748b",
    fontWeight: "500",
  },
  timeText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  expiredTimeText: {
    color: "#cbd5e1",
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
    fontWeight: "500",
    flex: 1,
  },
  // ✅ Expired ticket text
  expiredTicketText: {
    fontStyle: "italic",
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
