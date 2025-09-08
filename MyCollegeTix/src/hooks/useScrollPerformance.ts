import { Platform } from 'react-native';

/**
 * Hook that provides optimized scroll configuration for Android performance
 * This helps resolve gesture conflicts and scrolling "lock ups"
 */
export const useScrollPerformance = () => {
  const isAndroid = Platform.OS === 'android';
  
  return {
    // ScrollView optimizations
    scrollViewProps: {
      scrollEventThrottle: 16,
      keyboardDismissMode: isAndroid ? 'on-drag' as const : 'interactive' as const,
      keyboardShouldPersistTaps: 'handled' as const,
      removeClippedSubviews: isAndroid,
      showsVerticalScrollIndicator: false,
    },
    
    // FlatList optimizations
    flatListProps: {
      scrollEventThrottle: 16,
      keyboardShouldPersistTaps: 'handled' as const,
      keyboardDismissMode: isAndroid ? 'on-drag' as const : 'interactive' as const,
      removeClippedSubviews: isAndroid,
      showsVerticalScrollIndicator: false,
      nestedScrollEnabled: isAndroid,
      // Performance optimizations for Android
      initialNumToRender: isAndroid ? 12 : 10,
      maxToRenderPerBatch: isAndroid ? 8 : 10,
      updateCellsBatchingPeriod: isAndroid ? 100 : 50,
      windowSize: isAndroid ? 8 : 10,
      // Don't use getItemLayout unless you have fixed item heights
      getItemLayout: undefined,
    },
    
    // KeyboardAvoidingView optimizations
    keyboardAvoidingViewProps: {
      behavior: Platform.select({ 
        ios: 'padding' as const, 
        android: undefined // Android uses adjustPan in manifest
      }),
      keyboardVerticalOffset: Platform.select({ 
        ios: 0, // Reduced for better iOS behavior
        android: 0 // Not needed with adjustPan
      }),
    },
    
    // Platform checks
    isAndroid,
    isIOS: Platform.OS === 'ios',
  };
};

/**
 * Returns optimized configuration for nested scroll containers
 * Use this when you have ScrollView containing FlatList
 */
export const useNestedScrollConfig = () => {
  const isAndroid = Platform.OS === 'android';
  
  return {
    parentScrollView: {
      scrollEventThrottle: 16,
      keyboardShouldPersistTaps: 'handled' as const,
      keyboardDismissMode: isAndroid ? 'on-drag' as const : 'interactive' as const,
      showsVerticalScrollIndicator: false,
    },
    
    nestedFlatList: {
      scrollEnabled: false, // Let parent ScrollView handle scrolling
      nestedScrollEnabled: true,
      keyboardShouldPersistTaps: 'handled' as const,
      removeClippedSubviews: isAndroid,
      showsVerticalScrollIndicator: false,
    }
  };
};