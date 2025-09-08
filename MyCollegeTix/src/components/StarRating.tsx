import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  onRatingPress?: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';
  editable?: boolean;
  showCount?: boolean;
  maxStars?: number;
  color?: string;
}

export default function StarRating({
  rating,
  onRatingPress,
  size = 'medium',
  editable = false,
  showCount = true,
  maxStars = 5,
  color = '#fbbf24'
}: StarRatingProps) {
  // Ensure rating is always a valid number
  const safeRating = typeof rating === 'number' && !isNaN(rating) ? rating : 0;
  const starSize = {
    small: 16,
    medium: 20,
    large: 24
  }[size];

  const renderStar = (index: number) => {
    const starNumber = index + 1;
    const filled = starNumber <= safeRating;
    
    const StarComponent = editable ? TouchableOpacity : View;
    
    return (
      <StarComponent
        key={index}
        style={styles.starButton}
        onPress={editable ? () => onRatingPress?.(starNumber) : undefined}
        activeOpacity={editable ? 0.7 : 1}
      >
        <Ionicons
          name={filled ? 'star' : 'star-outline'}
          size={starSize}
          color={filled ? color : '#d1d5db'}
        />
      </StarComponent>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.stars}>
        {Array.from({ length: maxStars }, (_, index) => renderStar(index))}
      </View>
      {showCount && (
        <Text style={[styles.ratingText, { fontSize: starSize * 0.7 }]}>
          {safeRating.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  starButton: {
    padding: 2,
  },
  ratingText: {
    color: '#6b7280',
    fontWeight: '500',
  },
});