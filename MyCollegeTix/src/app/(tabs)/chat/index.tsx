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
  eventId?: string | null;
  eventTitle?: string | null;
  eventDate?: string | null;
  isEventSection?: boolean;
}

type ConversationFilter = "all" | "seller" | "buyer";
type SectioningMode = "status" | "events"; // New sectioning mode

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
    useState<SectioningMode>("status");
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(1)).current;
  const sectionToggleAnimation = useRef(new Animated.Value(0)).current;

  // Initialize animations
  useEffect(() => {
    const index = filterOptions.findIndex(
      (option) => option.value === currentFilter
    );
    slideAnimation.setValue(index);
    sectionToggleAnimation.setValue(sectioningMode === "status" ? 0 : 1);
  }, []);

  const filterOptions: FilterOption[] = [
    {
      value: "all",
      label: "All",
      description: "Show all conversations",
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

  // New function to toggle sectioning mode
  const toggleSectioningMode = () => {
    const newMode = sectioningMode === "status" ? "events" : "status";

    Animated.timing(sectionToggleAnimation, {
      toValue: newMode === "status" ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();

    setSectioningMode(newMode);
  };

  useEffect(() => {
    loadConversations();
  }, []);

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

  // Enhanced sectioning logic - now supports both status and event grouping
  const conversationSections = useMemo((): ConversationSection[] => {
    if (sectioningMode === "events") {
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
      const sortedEventGroups = Array.from(eventGroups.entries()).sort(
        (a, b) => {
          const aLatest = Math.max(
            ...a[1].map((conv) =>
              conv.last_message_at
                ? new Date(conv.last_message_at).getTime()
                : 0
            )
          );
          const bLatest = Math.max(
            ...b[1].map((conv) =>
              conv.last_message_at
                ? new Date(conv.last_message_at).getTime()
                : 0
            )
          );
          return bLatest - aLatest;
        }
      );

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
          sections.push({
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
          sections.push({
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

      // Add conversations without events
      if (noEventConversations.length > 0) {
        const activeNoEvent = noEventConversations.filter(
          (conv) => !conv.archived && !conv.is_expired
        );
        const expiredNoEvent = noEventConversations.filter(
          (conv) => conv.archived || conv.is_expired
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

        if (expiredNoEvent.length > 0) {
          sections.push({
            title: "Other Expired Conversations",
            data: expiredNoEvent.sort((a, b) => {
              const aTime = a.last_message_at
                ? new Date(a.last_message_at).getTime()
                : 0;
              const bTime = b.last_message_at
                ? new Date(b.last_message_at).getTime()
                : 0;
              return bTime - aTime;
            }),
            key: "no-event-expired",
            isEventSection: false,
          });
        }
      }

      return sections;
    } else {
      // Original status-based grouping
      const activeConversations: ConversationWithDetails[] = [];
      const expiredConversations: ConversationWithDetails[] = [];

      filteredConversations.forEach((conv) => {
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
          data: activeConversations.sort((a, b) => {
            const aTime = a.last_message_at
              ? new Date(a.last_message_at).getTime()
              : 0;
            const bTime = b.last_message_at
              ? new Date(b.last_message_at).getTime()
              : 0;
            return bTime - aTime;
          }),
          key: "active",
          isEventSection: false,
        });
      }

      if (expiredConversations.length > 0) {
        sections.push({
          title: "Expired Events",
          data: expiredConversations.sort((a, b) => {
            const aTime = a.last_message_at
              ? new Date(a.last_message_at).getTime()
              : 0;
            const bTime = b.last_message_at
              ? new Date(b.last_message_at).getTime()
              : 0;
            return bTime - aTime;
          }),
          key: "expired",
          isEventSection: false,
        });
      }

      return sections;
    }
  }, [filteredConversations, sectioningMode]);

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

  // Enhanced sectioning mode toggle component
  const renderSectioningToggle = () => (
    <View style={styles.sectioningToggleContainer}>
      <Text style={[styles.sectioningLabel, { color: theme.secondary }]}>
        Group by:
      </Text>
      <TouchableOpacity
        style={styles.sectioningToggle}
        onPress={toggleSectioningMode}
        activeOpacity={0.8}
      >
        <BlurView intensity={20} style={styles.toggleBlur}>
          <View style={styles.toggleContent}>
            <Animated.View
              style={[
                styles.toggleIndicator,
                {
                  backgroundColor: theme.primary,
                  transform: [
                    {
                      translateX: sectionToggleAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [2, 70],
                      }),
                    },
                  ],
                },
              ]}
            />
            <View style={styles.toggleOption}>
              <Ionicons
                name="list-outline"
                size={14}
                color={sectioningMode === "status" ? "white" : "#64748b"}
              />
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: sectioningMode === "status" ? "white" : "#64748b",
                    fontWeight: sectioningMode === "status" ? "700" : "600",
                  },
                ]}
              >
                Status
              </Text>
            </View>
            <View style={styles.toggleOption}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={sectioningMode === "events" ? "white" : "#64748b"}
              />
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: sectioningMode === "events" ? "white" : "#64748b",
                    fontWeight: sectioningMode === "events" ? "700" : "600",
                  },
                ]}
              >
                Events
              </Text>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    </View>
  );

  // Enhanced filter component
  const renderEnhancedFilter = () => {
    const screenWidth = Dimensions.get("window").width;
    const containerPadding = 40;
    const controlPadding = 12;
    const availableWidth = screenWidth - containerPadding - controlPadding;
    const segmentWidth = availableWidth / filterOptions.length;

    return (
      <View style={styles.enhancedFilterContainer}>
        <BlurView intensity={25} style={styles.segmentedControlBlur}>
          <View style={styles.segmentedControl}>
            <Animated.View
              style={[
                styles.segmentIndicator,
                {
                  width: segmentWidth,
                  backgroundColor: theme.primary,
                  transform: [
                    {
                      translateX: slideAnimation.interpolate({
                        inputRange: [0, 1, 2],
                        outputRange: [0, segmentWidth, segmentWidth * 2],
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
                        size={16}
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
        </BlurView>

        <View style={styles.filterBottomRow}>
          <Text
            style={[
              styles.filterDescription,
              { color: "rgba(255, 255, 255, 0.8)" },
            ]}
          >
            {
              filterOptions.find((opt) => opt.value === currentFilter)
                ?.description
            }
          </Text>
          {renderSectioningToggle()}
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
                  .length ||
                  conversationSections
                    .filter((s) => !s.key.includes("expired"))
                    .reduce((sum, s) => sum + s.data.length, 0)}
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
                <Ionicons
                  name={
                    sectioningMode === "events"
                      ? "calendar-outline"
                      : "time-outline"
                  }
                  size={20}
                  color="#94a3b8"
                />
              </View>
              <Text style={[styles.statNumber, { color: "#94a3b8" }]}>
                {sectioningMode === "events"
                  ? new Set(
                      conversations
                        .filter((c) => c.ticket?.event_id)
                        .map((c) => c.ticket?.event_id)
                    ).size
                  : conversationSections
                      .filter((s) => s.key.includes("expired"))
                      .reduce((sum, s) => sum + s.data.length, 0)}
              </Text>
              <Text style={styles.statLabel}>
                {sectioningMode === "events" ? "Events" : "Expired"}
              </Text>
            </View>
          </View>
        </BlurView>
      </View>

      {/* Enhanced Filter with Sectioning Toggle */}
      {renderEnhancedFilter()}

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
            keyboardDismissMode={
              Platform.OS === "android" ? "on-drag" : "interactive"
            }
            removeClippedSubviews={Platform.OS === "android"}
            nestedScrollEnabled={Platform.OS === "android"}
            initialNumToRender={Platform.OS === "android" ? 8 : 10}
            maxToRenderPerBatch={Platform.OS === "android" ? 6 : 10}
            updateCellsBatchingPeriod={Platform.OS === "android" ? 100 : 50}
            windowSize={Platform.OS === "android" ? 6 : 10}
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
  // Enhanced Segmented Control Filter Styles
  enhancedFilterContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    zIndex: 100,
  },
  segmentedControlBlur: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  segmentedControl: {
    flexDirection: "row",
    position: "relative",
    padding: 6,
    height: 64,
    backgroundColor: "rgba(248, 250, 252, 0.8)",
  },
  segmentIndicator: {
    position: "absolute",
    top: 6,
    left: 6,
    bottom: 6,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  segmentButton: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    zIndex: 2,
  },
  segmentContent: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: 2,
  },
  segmentIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
    textAlign: "center",
    flexShrink: 1,
  },
  segmentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  segmentBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 13,
  },
  filterBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterDescription: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.1,
    flex: 1,
  },
  // Sectioning Toggle Styles
  sectioningToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectioningLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.9,
  },
  sectioningToggle: {
    borderRadius: 16,
    overflow: "hidden",
  },
  toggleBlur: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  toggleContent: {
    flexDirection: "row",
    position: "relative",
    padding: 2,
    width: 140,
    height: 32,
  },
  toggleIndicator: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 66,
    height: 28,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    zIndex: 2,
    paddingHorizontal: 4,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});
