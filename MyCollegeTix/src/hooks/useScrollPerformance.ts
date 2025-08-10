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
      removeClippedSubviews: isAndroid,
      showsVerticalScrollIndicator: false,
      nestedScrollEnabled: true,
      // Performance optimizations
      getItemLayout: undefined, // Only use if you know exact item heights
      maxToRenderPerBatch: isAndroid ? 5 : 10,
      updateCellsBatchingPeriod: isAndroid ? 100 : 50,
      windowSize: isAndroid ? 5 : 10,
    },
    
    // KeyboardAvoidingView optimizations
    keyboardAvoidingViewProps: {
      behavior: Platform.select({ 
        ios: 'padding' as const, 
        android: undefined 
      }),
      keyboardVerticalOffset: Platform.select({ 
        ios: 90, 
        android: 0 
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