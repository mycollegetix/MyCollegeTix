// src/app/(tabs)/chat/index.tsx - Enhanced with event sectioning
import React, { useEffect, useMemo, useState, useRef } from "react";
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
  Animated,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useChat } from "@/src/providers/ChatProvider";
import { useAuth } from "@/src/providers/AuthProvider";
import { ConversationWithDetails } from "@/src/types/database.types";
import { NotificationBadge } from "@/src/components/NotificationBadge";
import { TrustService } from "@/src/services/trustService";
import TrustedBadge from "@/src/components/TrustedBadge";

interface ConversationSection {
  title: string;
  data: ConversationWithDetails[];
  key: string;
  eventId?: string | null;
  eventTitle?: string | null;
  eventDate?: string | null;
  isEventSection?: boolean;
}

type ConversationFilter = "all" | "seller" | "buyer";
type SectioningMode = "events"; // Always use event-based grouping

interface FilterOption {
  value: ConversationFilter;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
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

  // Enhanced state management
  const [currentFilter, setCurrentFilter] = useState<ConversationFilter>("all");
  const [sectioningMode, setSectioningMode] =
    useState<SectioningMode>("events");
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(1)).current;
  const [trustedUsers, setTrustedUsers] = useState<Set<string>>(new Set());

  // Initialize animations
  useEffect(() => {
    const index = filterOptions.findIndex(
      (option) => option.value === currentFilter
    );
    slideAnimation.setValue(index);
  }, []);

  const filterOptions: FilterOption[] = [
    {
      value: "all",
      label: "All",
      description: "",
      icon: "chatbubbles-outline",
    },
    {
      value: "seller",
      label: "Selling",
      description: "Conversations where I'm selling tickets",
      icon: "storefront-outline",
    },
    {
      value: "buyer",
      label: "Buying",
      description: "Conversations where I'm inquiring about tickets",
      icon: "person-outline",
    },
  ];

  // Helper function to determine user role in conversation
  const getUserRoleInConversation = (
    conversation: ConversationWithDetails
  ): "buyer" | "seller" | "unknown" => {
    if (!user?.id || !conversation.ticket) return "unknown";

    if (conversation.ticket.seller_id === user.id) {
      return "seller";
    } else if (
      conversation.participant_1_id === user.id ||
      conversation.participant_2_id === user.id
    ) {
      return "buyer";
    }

    return "unknown";
  };

  // Enhanced animation functions
  const selectFilter = (filter: ConversationFilter, index: number) => {
    if (filter === currentFilter) return;

    Animated.sequence([
      Animated.timing(fadeAnimation, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.spring(slideAnimation, {
      toValue: index,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();

    setCurrentFilter(filter);
  };

  // Since we only have status mode now, this function is no longer needed
  // Keeping the function stub in case we want to add other grouping options in the future

  useEffect(() => {
    loadConversations();
  }, []);

  // Load trust status for all conversation participants
  useEffect(() => {
    const loadTrustStatuses = async () => {
      if (conversations.length > 0) {
        const participantIds = conversations.map(conv => {
          const otherParticipant = conv.participant_1_id === user?.id
            ? conv.participant_2
            : conv.participant_1;
          return otherParticipant.id;
        });

        // Get unique participant IDs
        const uniqueIds = [...new Set(participantIds)];
        
        // Check trust status for each participant
        const trustPromises = uniqueIds.map(async (userId) => {
          const isTrusted = await TrustService.isUserTrusted(userId);
          return { userId, isTrusted };
        });

        const trustResults = await Promise.all(trustPromises);
        const newTrustedUsers = new Set<string>();
        
        trustResults.forEach(({ userId, isTrusted }) => {
          if (isTrusted) {
            newTrustedUsers.add(userId);
          }
        });

        setTrustedUsers(newTrustedUsers);
      }
    };

    loadTrustStatuses();
  }, [conversations, user?.id]);

  // Calculate counts for each filter option
  const filterCounts = useMemo(() => {
    const counts = {
      all: conversations.length,
      seller: 0,
      buyer: 0,
    };

    conversations.forEach((conversation) => {
      const userRole = getUserRoleInConversation(conversation);
      if (userRole === "buyer") counts.buyer++;
      if (userRole === "seller") counts.seller++;
    });

    return counts;
  }, [conversations, user?.id]);

  // Filter conversations based on current filter
  const filteredConversations = useMemo(() => {
    if (currentFilter === "all") {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const userRole = getUserRoleInConversation(conversation);
      return userRole === currentFilter;
    });
  }, [conversations, currentFilter, user?.id]);

  // Event-based grouping - organizes conversations by individual events
  const conversationSections = useMemo((): ConversationSection[] => {
    // Group by events
    const eventGroups = new Map<string, ConversationWithDetails[]>();
    const noEventConversations: ConversationWithDetails[] = [];

    filteredConversations.forEach((conv) => {
      if (conv.ticket?.event_id && conv.ticket?.title) {
        const eventKey = `${conv.ticket.event_id}-${conv.ticket.title}`;
        if (!eventGroups.has(eventKey)) {
          eventGroups.set(eventKey, []);
        }
        eventGroups.get(eventKey)!.push(conv);
      } else {
        noEventConversations.push(conv);
      }
    });

    const sections: ConversationSection[] = [];

    // Sort event groups by most recent conversation
    const sortedEventGroups = Array.from(eventGroups.entries()).sort((a, b) => {
      const aLatest = Math.max(
        ...a[1].map((conv) =>
          conv.last_message_at ? new Date(conv.last_message_at).getTime() : 0
        )
      );
      const bLatest = Math.max(
        ...b[1].map((conv) =>
          conv.last_message_at ? new Date(conv.last_message_at).getTime() : 0
        )
      );
      return bLatest - aLatest;
    });

    // Separate active and expired events for proper sorting
    const activeEventSections: ConversationSection[] = [];
    const expiredEventSections: ConversationSection[] = [];

    // Create sections for each event
    sortedEventGroups.forEach(([eventKey, conversations]) => {
      const firstConv = conversations[0];
      const ticket = firstConv.ticket;

      // Separate active and expired within each event
      const activeConvs = conversations.filter(
        (conv) => !conv.archived && !conv.is_expired
      );
      const expiredConvs = conversations.filter(
        (conv) => conv.archived || conv.is_expired
      );

      // Sort conversations within event by most recent
      const sortConversations = (convs: ConversationWithDetails[]) =>
        convs.sort((a, b) => {
          const aTime = a.last_message_at
            ? new Date(a.last_message_at).getTime()
            : 0;
          const bTime = b.last_message_at
            ? new Date(b.last_message_at).getTime()
            : 0;
          return bTime - aTime;
        });

      if (activeConvs.length > 0) {
        activeEventSections.push({
          title: ticket?.title || "Unknown Event",
          data: sortConversations(activeConvs),
          key: `event-active-${eventKey}`,
          eventId: ticket?.event_id,
          eventTitle: ticket?.title,
          eventDate: ticket?.event_date,
          isEventSection: true,
        });
      }

      if (expiredConvs.length > 0) {
        expiredEventSections.push({
          title: `${ticket?.title || "Unknown Event"} (Expired)`,
          data: sortConversations(expiredConvs),
          key: `event-expired-${eventKey}`,
          eventId: ticket?.event_id,
          eventTitle: ticket?.title,
          eventDate: ticket?.event_date,
          isEventSection: true,
        });
      }
    });

    // Add active sections first
    sections.push(...activeEventSections);

    // Add conversations without events (active only first)
    if (noEventConversations.length > 0) {
      const activeNoEvent = noEventConversations.filter(
        (conv) => !conv.archived && !conv.is_expired
      );

      if (activeNoEvent.length > 0) {
        sections.push({
          title: "Other Conversations",
          data: activeNoEvent.sort((a, b) => {
            const aTime = a.last_message_at
              ? new Date(a.last_message_at).getTime()
              : 0;
            const bTime = b.last_message_at
              ? new Date(b.last_message_at).getTime()
              : 0;
            return bTime - aTime;
          }),
          key: "no-event-active",
          isEventSection: false,
        });
      }
    }

    // Combine all expired conversations into a single section at the bottom
    const allExpiredConversations: ConversationWithDetails[] = [];

    // Add all expired conversations from events
    expiredEventSections.forEach((section) => {
      allExpiredConversations.push(...section.data);
    });

    // Add expired conversations without events
    if (noEventConversations.length > 0) {
      const expiredNoEvent = noEventConversations.filter(
        (conv) => conv.archived || conv.is_expired
      );
      allExpiredConversations.push(...expiredNoEvent);
    }

    // Create single expired section if we have any expired conversations
    if (allExpiredConversations.length > 0) {
      sections.push({
        title: "Expired Events",
        data: allExpiredConversations.sort((a, b) => {
          const aTime = a.last_message_at
            ? new Date(a.last_message_at).getTime()
            : 0;
          const bTime = b.last_message_at
            ? new Date(b.last_message_at).getTime()
            : 0;
          return bTime - aTime;
        }),
        key: "all-expired",
        isEventSection: false,
      });
    }

    return sections;
  }, [filteredConversations]);

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

  const formatEventDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleConversationPress = (conversation: ConversationWithDetails) => {
    setCurrentConversation(conversation);
    (router.push as any)(`/(tabs)/chat/${conversation.id}`);
  };

  // Removed sectioning toggle since we only use status-based grouping now

  // Compact filter component (matches Browse/Tickets pattern)
  const renderCompactFilter = () => {
    const screenWidth = Dimensions.get("window").width;
    const containerPadding = 40;
    const availableWidth = screenWidth - containerPadding;
    const segmentWidth = availableWidth / filterOptions.length;

    return (
      <View style={styles.compactFilterContainer}>
        <View style={styles.compactSegmentedControl}>
          <Animated.View
            style={[
              styles.compactSegmentIndicator,
              {
                width: segmentWidth - 4,
                backgroundColor: theme.primary,
                transform: [
                  {
                    translateX: slideAnimation.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [2, segmentWidth + 2, segmentWidth * 2 + 2],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          />

          {filterOptions.map((option, index) => {
            const isActive = currentFilter === option.value;
            const count =
              filterCounts[option.value as keyof typeof filterCounts];

            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.segmentButton, { width: segmentWidth }]}
                onPress={() => selectFilter(option.value, index)}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={[styles.segmentContent, { opacity: fadeAnimation }]}
                >
                  <Animated.View
                    style={[
                      styles.segmentIconContainer,
                      {
                        backgroundColor: isActive
                          ? "rgba(255, 255, 255, 0.35)"
                          : "rgba(30, 41, 59, 0.08)",
                      },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={14}
                      color={isActive ? "white" : "#1e293b"}
                    />
                  </Animated.View>

                  <Text
                    style={[
                      styles.segmentLabel,
                      {
                        color: isActive ? "white" : "#1e293b",
                        fontWeight: isActive ? "800" : "700",
                      },
                    ]}
                  >
                    {option.label}
                  </Text>

                  {count > 0 && (
                    <Animated.View
                      style={[
                        styles.segmentBadge,
                        {
                          backgroundColor: isActive
                            ? "rgba(255, 255, 255, 0.3)"
                            : theme.secondary,
                          borderColor: isActive
                            ? "rgba(255, 255, 255, 0.5)"
                            : "rgba(30, 41, 59, 0.1)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentBadgeText,
                          {
                            color: isActive ? "white" : "#1e293b",
                          },
                        ]}
                      >
                        {count > 99 ? "99+" : count}
                      </Text>
                    </Animated.View>
                  )}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Enhanced section header with event information
  const renderSectionHeader = ({
    section,
  }: {
    section: ConversationSection;
  }) => {
    const isExpired = section.key.includes("expired");
    const isEventSection = section.isEventSection;

    return (
      <View
        style={[
          styles.sectionHeader,
          isEventSection && styles.eventSectionHeader,
        ]}
      >
        <View style={styles.sectionHeaderContent}>
          <Ionicons
            name={
              isEventSection
                ? isExpired
                  ? "calendar-outline"
                  : "calendar"
                : section.key === "active"
                ? "chatbubbles"
                : "time-outline"
            }
            size={16}
            color={
              isEventSection
                ? isExpired
                  ? "#94a3b8"
                  : theme.primary
                : section.key === "active"
                ? theme.primary
                : "#94a3b8"
            }
          />
          <View style={styles.sectionTitleContainer}>
            <Text
              style={[
                styles.sectionHeaderText,
                isExpired && styles.expiredSectionText,
                isEventSection && styles.eventSectionTitle,
              ]}
            >
              {section.title}
            </Text>
            {isEventSection && section.eventDate && !isExpired && (
              <Text style={[styles.eventDate, { color: theme.primary }]}>
                {formatEventDate(section.eventDate)}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.sectionCount,
              {
                backgroundColor: isEventSection
                  ? isExpired
                    ? "#94a3b8"
                    : theme.primary
                  : section.key === "active"
                  ? theme.primary
                  : "#94a3b8",
              },
            ]}
          >
            <Text style={styles.sectionCountText}>{section.data.length}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderConversation = ({ item }: { item: ConversationWithDetails }) => {
    const otherParticipant = getOtherParticipant(item);
    const hasUnread = item.unread_count > 0;
    const lastMessageTime = formatLastMessageTime(item.last_message_at);
    const isExpired = item.archived || item.is_expired;
    const isParticipantTrusted = trustedUsers.has(otherParticipant.id);

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
                numberOfLines={2}
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

            {/* Trusted Badge Line */}
            {isParticipantTrusted && (
              <View style={styles.trustedBadgeContainer}>
                <TrustedBadge size="small" />
              </View>
            )}

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

            {/* Ticket reference - only show when not in event sectioning mode */}
            {item.ticket && sectioningMode !== "events" && (
              <View style={styles.ticketReference}>
                <Ionicons
                  name="ticket-outline"
                  size={12}
                  color={isExpired ? "#94a3b8" : theme.primary}
                />
                <Text
                  style={[
                    styles.ticketText,
                    { color: isExpired ? "#94a3b8" : theme.primary },
                    isExpired && styles.expiredTicketText,
                  ]}
                  numberOfLines={2}
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Linear Gradient Background */}
      <LinearGradient
        colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
        style={styles.background}
      />

      {/* Floating elements for premium feel */}
      <View
        style={[
          styles.floatingElement1,
          { backgroundColor: `${theme.secondary}08` },
        ]}
      />
      <View
        style={[
          styles.floatingElement2,
          { backgroundColor: "rgba(255, 255, 255, 0.05)" },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardDismissMode={
          Platform.OS === "android" ? "on-drag" : "interactive"
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadConversations}
            tintColor={theme.secondary}
            colors={[theme.secondary]}
          />
        }
      >
        {/* Premium Header Section */}
        <View style={styles.headerSection}>
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

          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[theme.secondary, `${theme.secondary}DD`]}
              style={styles.logo}
            >
              <Ionicons name="chatbubbles" size={32} color={theme.primary} />
            </LinearGradient>
          </View>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>
            Connect with buyers and sellers for ticket exchanges
          </Text>
        </View>

        {/* Premium Content Section */}
        <View style={styles.contentSection}>
          {/* Compact Stats Row */}
          <LinearGradient
            colors={[theme.primary, `${theme.primary}E6`]}
            style={styles.compactStatsContainer}
          >
            <View style={styles.compactStatItem}>
              <Ionicons name="chatbubbles" size={18} color={theme.secondary} />
              <Text
                style={[styles.compactStatNumber, { color: "white" }]}
              >
                {conversationSections
                  .filter((s) => !s.key.includes("expired"))
                  .reduce((sum, s) => sum + s.data.length, 0)}
              </Text>
              <Text style={styles.compactStatLabel}>Active</Text>
            </View>

            <View style={styles.compactStatDivider} />

            <View style={styles.compactStatItem}>
              <Ionicons name="mail-unread" size={18} color={theme.secondary} />
              <Text style={[styles.compactStatNumber, { color: "white" }]}>
                {conversations
                  .filter((conv) => !conv.archived && !conv.is_expired)
                  .reduce((sum, conv) => sum + conv.unread_count, 0)}
              </Text>
              <Text style={styles.compactStatLabel}>Unread</Text>
            </View>

            <View style={styles.compactStatDivider} />

            <View style={styles.compactStatItem}>
              <Ionicons name="calendar-outline" size={18} color={theme.secondary} />
              <Text style={[styles.compactStatNumber, { color: "white" }]}>
                {
                  new Set(
                    conversations
                      .filter((c) => c.ticket?.event_id)
                      .map((c) => c.ticket?.event_id)
                  ).size
                }
              </Text>
              <Text style={styles.compactStatLabel}>Events</Text>
            </View>
          </LinearGradient>

          {/* Enhanced Filter Controls */}
          {renderCompactFilter()}

          {/* Conversations List */}
          <View style={styles.conversationsListContainer}>
            {loading ? (
              <BlurView intensity={20} style={styles.loadingState}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>Loading conversations...</Text>
              </BlurView>
            ) : conversations.length > 0 ? (
              <SectionList
                sections={conversationSections}
                renderItem={renderConversation}
                renderSectionHeader={renderSectionHeader}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                removeClippedSubviews={Platform.OS === "android"}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={Platform.OS === "android" ? 8 : 10}
                maxToRenderPerBatch={Platform.OS === "android" ? 6 : 10}
                updateCellsBatchingPeriod={Platform.OS === "android" ? 100 : 50}
                windowSize={Platform.OS === "android" ? 6 : 10}
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
                    <Ionicons
                      name="chatbubbles-outline"
                      size={32}
                      color="white"
                    />
                  </View>
                </View>
                <Text style={styles.emptyStateTitle}>No conversations yet</Text>
                <Text style={styles.emptyStateText}>
                  Start a conversation by contacting a seller from a ticket
                  listing
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
      </ScrollView>
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
  // Floating elements for visual depth
  floatingElement1: {
    position: "absolute",
    top: "15%",
    left: "10%",
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  floatingElement2: {
    position: "absolute",
    bottom: "30%",
    right: "15%",
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  // ScrollView structure like other tabs
  scrollView: {
    flex: 1,
  },
  // Header Section (Gradient)
  headerSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    position: "relative",
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  notificationButton: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 1000,
    elevation: 5,
  },
  // Content Section (White)
  contentSection: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    flex: 1,
  },
  // Compact Stats
  compactStatsContainer: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  compactStatItem: {
    flex: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  compactStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  compactStatNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  compactStatLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  compactStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 8,
  },
  // Compact Filter Styles
  compactFilterContainer: {
    marginBottom: 20,
  },
  compactSegmentedControl: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    padding: 4,
    height: 44,
    position: "relative",
  },
  compactSegmentIndicator: {
    position: "absolute",
    top: 4,
    height: 36,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  compactSegmentButton: {
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    zIndex: 2,
  },
  compactSegmentContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactSegmentLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  compactSegmentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  compactSegmentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 13,
  },
  // Conversations List
  conversationsListContainer: {
    flex: 1,
  },
  // Legacy styles for compatibility
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  // Section header styles
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  eventSectionHeader: {
    paddingVertical: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  sectionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  eventSectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.8,
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
  sectionCountText: {
    fontSize: 12,
    fontWeight: "600",
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
  trustedBadgeContainer: {
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  unreadText: {
    fontWeight: "700",
    color: "#0f172a",
  },
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
  // Enhanced Segmented Control Filter Styles - Compact Version
  enhancedFilterContainer: {
    marginBottom: 20,
    zIndex: 100,
  },
  segmentedControlBlur: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  segmentedControl: {
    flexDirection: "row",
    position: "relative",
    padding: 4,
    height: 44,
    backgroundColor: "#f8fafc",
  },
  segmentIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentButton: {
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    zIndex: 2,
  },
  segmentContent: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 2,
    paddingHorizontal: 2,
  },
  segmentIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
    textAlign: "center",
    flexShrink: 1,
  },
  segmentBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  segmentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
  filterDescription: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748b",
    textAlign: "center",
    fontStyle: "italic",
  },
});
