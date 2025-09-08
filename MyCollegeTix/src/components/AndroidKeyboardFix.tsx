import React, { useEffect } from 'react';
import { Platform, Keyboard } from 'react-native';

interface AndroidKeyboardFixProps {
  onKeyboardShow?: () => void;
  onKeyboardHide?: () => void;
  children: React.ReactNode;
}

/**
 * Android-specific keyboard management component
 * Handles keyboard events and provides callbacks for better UX
 */
export const AndroidKeyboardFix: React.FC<AndroidKeyboardFixProps> = ({
  onKeyboardShow,
  onKeyboardHide,
  children,
}) => {
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      onKeyboardShow?.();
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      onKeyboardHide?.();
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [onKeyboardShow, onKeyboardHide]);

  return <>{children}</>;
};

/**
 * Android-optimized scroll-to-bottom utility
 */
export const useAndroidScrollFix = (scrollRef: React.RefObject<any>) => {
  const scrollToBottom = (animated = true, delay = 150) => {
    if (Platform.OS === 'android' && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated });
      }, delay);
    } else if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated });
      }, 100);
    }
  };

  return { scrollToBottom };
};