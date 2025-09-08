// src/components/TicketTransferButton.tsx
import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../providers/ThemeProvider';
import { TicketTransferService, TicketTransferInfo } from '../services/ticketTransferService';

interface TicketTransferButtonProps {
  collegeId: string;
  ticketInfo?: {
    title: string;
    eventDate: string;
    section?: string;
    row?: string;
    seat?: string;
  };
  style?: any;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

export const TicketTransferButton: React.FC<TicketTransferButtonProps> = ({
  collegeId,
  ticketInfo,
  style,
  variant = 'primary',
  size = 'medium',
  showIcon = true,
}) => {
  const theme = useTheme();
  const [transferInfo, setTransferInfo] = useState<TicketTransferInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    loadTransferInfo();
  }, [collegeId]);

  const loadTransferInfo = async () => {
    setLoading(true);
    try {
      const { data, error } = await TicketTransferService.getTransferPortalInfo(collegeId);
      if (!error && data) {
        setTransferInfo(data);
      }
    } catch (error) {
      console.error('Error loading transfer info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async () => {
    if (!transferInfo?.hasTransferPortal) {
      Alert.alert(
        'Transfer Portal Not Available',
        `${transferInfo?.collegeName || 'This college'} doesn't have a ticket transfer portal configured.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setOpening(true);
    try {
      await TicketTransferService.openTransferPortal(collegeId, ticketInfo);
    } finally {
      setOpening(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.button, styles[size], styles.loading]}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.text, styles[`${size}Text`], { color: theme.primary }]}>
          Loading...
        </Text>
      </View>
    );
  }

  if (!transferInfo?.hasTransferPortal) {
    return (
      <TouchableOpacity 
        style={[styles.button, styles[size], styles.disabled]} 
        onPress={handlePress}
        disabled={false} // Still clickable to show the "not available" message
      >
        {showIcon && (
          <Ionicons name="information-circle-outline" size={16} color="#9ca3af" />
        )}
        <Text style={[styles.text, styles[`${size}Text`], styles.disabledText]}>
          Transfer Not Available
        </Text>
      </TouchableOpacity>
    );
  }

  const ButtonContent = () => (
    <>
      {showIcon && !opening && (
        <Ionicons name="open-outline" size={16} color="white" />
      )}
      {opening && <ActivityIndicator size="small" color="white" />}
      <Text style={[styles.text, styles[`${size}Text`], styles.primaryText]}>
        {opening ? 'Opening...' : 'Open Transfer Portal'}
      </Text>
    </>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity 
        style={[styles.button, styles[size], style]} 
        onPress={handlePress}
        disabled={opening}
      >
        <LinearGradient
          colors={[theme.primary, theme.primary + 'DD']}
          style={styles.gradient}
        >
          <ButtonContent />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity 
        style={[
          styles.button, 
          styles[size], 
          styles.secondary,
          { backgroundColor: theme.secondary + '20', borderColor: theme.secondary },
          style
        ]} 
        onPress={handlePress}
        disabled={opening}
      >
        {showIcon && !opening && (
          <Ionicons name="open-outline" size={16} color={theme.secondary} />
        )}
        {opening && <ActivityIndicator size="small" color={theme.secondary} />}
        <Text style={[styles.text, styles[`${size}Text`], { color: theme.secondary }]}>
          {opening ? 'Opening...' : 'Transfer Portal'}
        </Text>
      </TouchableOpacity>
    );
  }

  // Outline variant
  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        styles[size], 
        styles.outline,
        { borderColor: theme.primary },
        style
      ]} 
      onPress={handlePress}
      disabled={opening}
    >
      {showIcon && !opening && (
        <Ionicons name="open-outline" size={16} color={theme.primary} />
      )}
      {opening && <ActivityIndicator size="small" color={theme.primary} />}
      <Text style={[styles.text, styles[`${size}Text`], { color: theme.primary }]}>
        {opening ? 'Opening...' : 'Transfer Portal'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  secondary: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loading: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Sizes
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52,
  },
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  primaryText: {
    color: 'white',
  },
  disabledText: {
    color: '#9ca3af',
  },
});