import React from 'react';
import { Keyboard, View, ViewProps, Platform, ScrollView } from 'react-native';

interface KeyboardDismissProps extends ViewProps {
  children: React.ReactNode;
  enableScrollViewDismiss?: boolean;
}

export const KeyboardDismiss: React.FC<KeyboardDismissProps> = ({ 
  children, 
  style, 
  enableScrollViewDismiss = true,
  ...props 
}) => {
  // On Android, avoid TouchableWithoutFeedback as it interferes with scrolling
  // Instead, let ScrollViews handle keyboard dismissal naturally
  if (Platform.OS === 'android' && enableScrollViewDismiss) {
    return (
      <View style={[{ flex: 1 }, style]} {...props}>
        {children}
      </View>
    );
  }

  // For iOS or when explicitly disabled, use the tap-to-dismiss behavior
  // But use onTouchStart instead of TouchableWithoutFeedback for better scroll compatibility
  const handleTouchStart = () => {
    Keyboard.dismiss();
  };

  return (
    <View 
      style={[{ flex: 1 }, style]} 
      onTouchStart={Platform.OS === 'ios' ? handleTouchStart : undefined}
      {...props}
    >
      {children}
    </View>
  );
};