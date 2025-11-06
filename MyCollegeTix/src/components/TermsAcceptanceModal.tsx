import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supabase } from '@/src/lib/supabase';

interface TermsAcceptanceModalProps {
  visible: boolean;
  userId: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsAcceptanceModal({
  visible,
  userId,
  onAccept,
  onDecline,
}: TermsAcceptanceModalProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      // Update user's profile to mark terms as accepted
      const { error } = await supabase
        .from('profiles')
        .update({
          accepted_terms: true,
          accepted_terms_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Error updating terms acceptance:', error);
        Alert.alert(
          'Error',
          'Failed to save your acceptance. Please try again.'
        );
        return;
      }

      console.log('✅ Terms accepted for user:', userId);
      onAccept();
    } catch (error) {
      console.error('💥 Unexpected error accepting terms:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      'Terms Required',
      'You must accept the Terms of Service and Privacy Policy to use MyCollegeTix.',
      [
        {
          text: 'Review Again',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: onDecline,
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDecline}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={50} style={styles.modalBlur}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="shield-checkmark" size={40} color="#18453b" />
              </View>
              <Text style={styles.modalTitle}>Welcome to MyCollegeTix!</Text>
              <Text style={styles.modalSubtitle}>
                Before you get started, please review and accept our terms
              </Text>
            </View>

            {/* Terms Content */}
            <ScrollView
              style={styles.termsScroll}
              onScroll={(e) => {
                const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                const isScrolledToBottom =
                  layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
                if (isScrolledToBottom && !hasScrolled) {
                  setHasScrolled(true);
                }
              }}
              scrollEventThrottle={400}
            >
              <View style={styles.termsContent}>
                <Text style={styles.sectionTitle}>Terms of Service</Text>
                <Text style={styles.termsText}>
                  By using MyCollegeTix, you agree to:{'\n\n'}
                  • Use the platform responsibly and honestly{'\n'}
                  • Only list tickets you legally own{'\n'}
                  • Comply with your college's ticket policies{'\n'}
                  • Provide accurate information{'\n'}
                  • Not engage in fraudulent activities{'\n\n'}
                  We reserve the right to suspend accounts that violate these terms.
                </Text>

                <Text style={styles.sectionTitle}>Privacy Policy</Text>
                <Text style={styles.termsText}>
                  We collect and use your information to:{'\n\n'}
                  • Provide and improve our services{'\n'}
                  • Verify your college affiliation{'\n'}
                  • Facilitate ticket transactions{'\n'}
                  • Send important notifications{'\n\n'}
                  We will never sell your personal information to third parties.
                  Your data is encrypted and securely stored.
                </Text>

                <View style={styles.disclaimer}>
                  <Ionicons name="information-circle" size={20} color="#6b7280" />
                  <Text style={styles.disclaimerText}>
                    These are simplified terms. Full legal documents are available
                    in the app settings.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Scroll indicator */}
            {!hasScrolled && (
              <View style={styles.scrollIndicator}>
                <Ionicons name="chevron-down" size={20} color="#18453b" />
                <Text style={styles.scrollIndicatorText}>
                  Scroll to read all terms
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={handleDecline}
                disabled={isAccepting}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.acceptButton,
                  (!hasScrolled || isAccepting) && styles.acceptButtonDisabled,
                ]}
                onPress={handleAccept}
                disabled={!hasScrolled || isAccepting}
              >
                <LinearGradient
                  colors={hasScrolled && !isAccepting ? ['#18453b', '#2a6b5a'] : ['#9ca3af', '#9ca3af']}
                  style={styles.buttonGradient}
                >
                  {isAccepting ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.buttonText}>Accepting...</Text>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>
                      I Accept
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {!hasScrolled && (
              <Text style={styles.scrollHint}>
                Please scroll through all terms to continue
              </Text>
            )}
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f9ff',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#18453b',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  termsScroll: {
    maxHeight: 300,
    marginBottom: 16,
  },
  termsContent: {
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#18453b',
    marginTop: 16,
    marginBottom: 12,
  },
  termsText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  scrollIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    marginBottom: 16,
  },
  scrollIndicatorText: {
    fontSize: 12,
    color: '#18453b',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  acceptButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
