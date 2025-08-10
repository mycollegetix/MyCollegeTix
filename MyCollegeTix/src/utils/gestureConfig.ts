import { Platform } from "react-native";

/**
 * Android-specific gesture and scroll configurations
 * These settings help prevent gesture conflicts and improve scrolling performance
 */
export const GestureConfig = {
  /**
   * Configuration for preventing scroll lock-ups on Android
   */
  androidScrollFixes: {
    // Disable nested scroll when not needed
    nestedScrollEnabled: true,

    // Optimize rendering for Android
    removeClippedSubviews: true,

    // Improve touch responsiveness
    scrollEventThrottle: 16,

    // Better keyboard handling
    keyboardShouldPersistTaps: "handled" as const,
    keyboardDismissMode: "on-drag" as const,
  },

  /**
   * FlatList performance optimizations for Android
   */
  androidFlatListConfig: {
    // Reduce initial render batch size
    initialNumToRender: 10,

    // Optimize batch rendering
    maxToRenderPerBatch: 5,

    // Update batching period
    updateCellsBatchingPeriod: 100,

    // Window size optimization
    windowSize: 5,

    // Memory optimizations
    removeClippedSubviews: true,

    // Gesture optimizations
    keyboardShouldPersistTaps: "handled" as const,
    scrollEventThrottle: 16,
  },

  /**
   * iOS-specific configurations (for comparison)
   */
  iOSScrollConfig: {
    keyboardDismissMode: "interactive" as const,
    keyboardShouldPersistTaps: "handled" as const,
    scrollEventThrottle: 16,
  },

  /**
   * Get platform-specific scroll configuration
   */
  getScrollConfig: () => {
    return Platform.select({
      android: GestureConfig.androidScrollFixes,
      ios: GestureConfig.iOSScrollConfig,
      default: GestureConfig.androidScrollFixes,
    });
  },

  /**
   * Get platform-specific FlatList configuration
   */
  getFlatListConfig: () => {
    return Platform.select({
      android: GestureConfig.androidFlatListConfig,
      ios: {
        keyboardShouldPersistTaps: "handled" as const,
        scrollEventThrottle: 16,
      },
      default: GestureConfig.androidFlatListConfig,
    });
  },

  /**
   * KeyboardAvoidingView configurations that don't interfere with scrolling
   */
  keyboardAvoidingConfig: {
    behavior: Platform.select({
      ios: "padding" as const,
      android: undefined, // Don't use height on Android as it causes issues
    }),
    keyboardVerticalOffset: Platform.select({
      ios: 90,
      android: 0,
    }),
  },
};

/**
 * Helper function to detect if we're on a platform with scroll issues
 */
export const hasScrollIssues = () => {
  return Platform.OS === "android";
};

/**
 * Helper to determine if we should use nested scrolling
 */
export const shouldUseNestedScroll = (hasNestedScrollables: boolean) => {
  if (Platform.OS === "android") {
    return hasNestedScrollables;
  }
  return true; // iOS handles nested scrolling better
};
