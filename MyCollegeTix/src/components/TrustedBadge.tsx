import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrustedBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  style?: any;
}

export default function TrustedBadge({ 
  size = 'medium', 
  showText = true,
  style 
}: TrustedBadgeProps) {
  const iconSize = {
    small: 14,
    medium: 16,
    large: 20
  }[size];

  const textSize = {
    small: 10,
    medium: 12,
    large: 14
  }[size];

  const paddingSize = {
    small: { paddingHorizontal: 6, paddingVertical: 2 },
    medium: { paddingHorizontal: 8, paddingVertical: 3 },
    large: { paddingHorizontal: 10, paddingVertical: 4 }
  }[size];

  return (
    <View style={[styles.container, paddingSize, style]}>
      <Ionicons name="shield-checkmark" size={iconSize} color="#10b981" />
      {showText && (
        <Text style={[styles.text, { fontSize: textSize }]}>
          Trusted
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    gap: 4,
  },
  text: {
    color: '#10b981',
    fontWeight: '600',
  },
});