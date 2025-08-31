import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/src/lib/supabase';

const { width } = Dimensions.get('window');

interface TicketSaleModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSale: (saleData: TicketSaleData) => Promise<void>;
  ticket: {
    id: string;
    title: string;
    price: number;
  };
  isLoading?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface TicketSaleData {
  buyerId?: string;
  buyerName: string;
  salePrice: string;
  paymentMethod?: string;
  additionalNotes?: string;
}

interface ConversationParticipant {
  id: string;
  username: string;
  full_name: string;
}

const PAYMENT_METHODS = [
  'Cash',
  'Venmo',
  'PayPal',
  'Zelle',
  'Apple Pay',
  'Bank Transfer',
  'Other'
];


export default function TicketSaleModal({
  visible,
  onClose,
  onConfirmSale,
  ticket,
  isLoading = false,
  primaryColor = '#18453b',
  secondaryColor = '#ffd700',
}: TicketSaleModalProps) {
  const [formData, setFormData] = useState<TicketSaleData>({
    buyerId: '',
    buyerName: '',
    salePrice: ticket.price.toString(),
    paymentMethod: '',
    additionalNotes: '',
  });

  const [conversationParticipants, setConversationParticipants] = useState<ConversationParticipant[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const [errors, setErrors] = useState<Partial<TicketSaleData>>({});

  // Load conversations when modal opens
  useEffect(() => {
    if (visible && ticket.id) {
      loadConversationParticipants();
    }
  }, [visible, ticket.id]);

  const loadConversationParticipants = async () => {
    setLoadingConversations(true);
    try {
      // Get current user first
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error('Error getting current user:', userError);
        return;
      }
      const currentUserId = userData.user.id;

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          participant_1_id,
          participant_2_id,
          participant_1:profiles!participant_1_id(id, username, full_name),
          participant_2:profiles!participant_2_id(id, username, full_name)
        `)
        .eq('ticket_id', ticket.id);

      if (error) {
        console.error('Error loading conversations:', error);
        return;
      }

      // Get unique participants (excluding current user)
      const participants = new Map<string, ConversationParticipant>();
      
      data?.forEach(conversation => {
        // Add participant 1 if not current user
        const p1 = conversation.participant_1;
        if (p1 && p1.id !== currentUserId) {
          participants.set(p1.id, {
            id: p1.id,
            username: p1.username,
            full_name: p1.full_name
          });
        }
        
        // Add participant 2 if not current user
        const p2 = conversation.participant_2;
        if (p2 && p2.id !== currentUserId) {
          participants.set(p2.id, {
            id: p2.id,
            username: p2.username,
            full_name: p2.full_name
          });
        }
      });

      setConversationParticipants(Array.from(participants.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        buyerId: '',
        buyerName: '',
        salePrice: ticket.price.toString(),
        paymentMethod: '',
        additionalNotes: '',
      });
      setErrors({});
      setConversationParticipants([]);
      onClose();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<TicketSaleData> = {};

    if (!formData.buyerName.trim()) {
      newErrors.buyerName = 'Buyer name is required';
    } else if (formData.buyerName.length > 100) {
      newErrors.buyerName = 'Buyer name must be less than 100 characters';
    }

    const salePrice = parseFloat(formData.salePrice);
    if (!formData.salePrice || isNaN(salePrice) || salePrice < 0) {
      newErrors.salePrice = 'Please enter a valid sale price';
    }

    if (formData.additionalNotes && formData.additionalNotes.length > 500) {
      newErrors.additionalNotes = 'Additional notes must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirmSale = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await onConfirmSale(formData);
      handleClose();
    } catch (error) {
      console.error('Error confirming sale:', error);
      Alert.alert('Error', 'Failed to record sale information. Please try again.');
    }
  };

  const renderDropdown = (
    label: string,
    value: string,
    options: string[],
    onSelect: (value: string) => void,
    placeholder: string
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.optionsScroll}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              value === option && {
                ...styles.optionButtonSelected,
                backgroundColor: primaryColor,
                borderColor: primaryColor,
              }
            ]}
            onPress={() => onSelect(option)}
          >
            <Text style={[
              styles.optionButtonText,
              value === option && styles.optionButtonTextSelected
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={[primaryColor, primaryColor + '88']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleClose}
              disabled={isLoading}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mark as Sold</Text>
            <View style={styles.placeholder} />
          </View>
          <Text style={styles.headerSubtitle}>{ticket.title}</Text>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Buyer Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Who did you sell this to? <Text style={styles.required}>*</Text>
              </Text>
              
              {loadingConversations ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading people you've chatted with...</Text>
                </View>
              ) : conversationParticipants.length > 0 ? (
                <>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.optionsScroll}
                  >
                    {conversationParticipants.map((participant) => (
                      <TouchableOpacity
                        key={participant.id}
                        style={[
                          styles.participantButton,
                          formData.buyerId === participant.id && {
                            ...styles.participantButtonSelected,
                            backgroundColor: primaryColor,
                            borderColor: primaryColor,
                          }
                        ]}
                        onPress={() => setFormData({
                          ...formData, 
                          buyerId: participant.id,
                          buyerName: participant.full_name || participant.username
                        })}
                      >
                        <Text style={[
                          styles.participantButtonText,
                          formData.buyerId === participant.id && styles.participantButtonTextSelected
                        ]}>
                          {participant.full_name || participant.username}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[
                        styles.participantButton,
                        !formData.buyerId && formData.buyerName === 'other' && {
                          ...styles.participantButtonSelected,
                          backgroundColor: primaryColor,
                          borderColor: primaryColor,
                        }
                      ]}
                      onPress={() => setFormData({
                        ...formData, 
                        buyerId: '',
                        buyerName: 'other'
                      })}
                    >
                      <Text style={[
                        styles.participantButtonText,
                        !formData.buyerId && formData.buyerName === 'other' && styles.participantButtonTextSelected
                      ]}>
                        Other
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </>
              ) : (
                <TouchableOpacity 
                  style={styles.otherPersonButton}
                  onPress={() => setFormData({...formData, buyerName: 'other'})}
                >
                  <Text style={styles.otherPersonButtonText}>+ Add buyer name</Text>
                </TouchableOpacity>
              )}

              {(!formData.buyerId && formData.buyerName === 'other') && (
                <TextInput
                  style={[styles.input, errors.buyerName && styles.inputError]}
                  placeholder="Enter buyer's name"
                  value={formData.buyerName === 'other' ? '' : formData.buyerName}
                  onChangeText={(text) => setFormData({...formData, buyerName: text})}
                  editable={!isLoading}
                  maxLength={100}
                  autoFocus
                />
              )}
              
              {errors.buyerName && (
                <Text style={styles.errorText}>{errors.buyerName}</Text>
              )}
            </View>

            {/* Sale Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Final sale price <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={[styles.priceInput, errors.salePrice && styles.inputError]}
                  placeholder="0.00"
                  value={formData.salePrice}
                  onChangeText={(text) => setFormData({...formData, salePrice: text})}
                  keyboardType="numeric"
                  editable={!isLoading}
                />
              </View>
              {ticket.price !== parseFloat(formData.salePrice) && (
                <Text style={styles.priceComparison}>
                  Original asking price: ${ticket.price.toFixed(2)}
                  {parseFloat(formData.salePrice) > ticket.price 
                    ? ` (+$${(parseFloat(formData.salePrice) - ticket.price).toFixed(2)})` 
                    : ` (-$${(ticket.price - parseFloat(formData.salePrice)).toFixed(2)})`
                  }
                </Text>
              )}
              {errors.salePrice && (
                <Text style={styles.errorText}>{errors.salePrice}</Text>
              )}
            </View>

            {/* Payment Method */}
            {renderDropdown(
              'How did they pay?',
              formData.paymentMethod || '',
              PAYMENT_METHODS,
              (value) => setFormData({...formData, paymentMethod: value}),
              'Select payment method'
            )}


            {/* Additional Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional notes (optional)</Text>
              <TextInput
                style={[styles.textArea, errors.additionalNotes && styles.inputError]}
                placeholder="Any additional details about the sale..."
                value={formData.additionalNotes}
                onChangeText={(text) => setFormData({...formData, additionalNotes: text})}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!isLoading}
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {formData.additionalNotes?.length || 0}/500
              </Text>
              {errors.additionalNotes && (
                <Text style={styles.errorText}>{errors.additionalNotes}</Text>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.cancelButton, isLoading && styles.buttonDisabled]} 
            onPress={handleClose}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.confirmButton, 
              { backgroundColor: primaryColor },
              isLoading && styles.buttonDisabled
            ]} 
            onPress={handleConfirmSale}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.confirmButtonText}>Saving...</Text>
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.confirmButtonText}>Confirm Sale</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    paddingLeft: 12,
  },
  priceInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    borderWidth: 0,
  },
  priceComparison: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 4,
  },
  optionsScroll: {
    marginVertical: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  optionButtonSelected: {
    // Dynamic colors applied inline
  },
  optionButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  optionButtonTextSelected: {
    color: 'white',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 34,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  confirmButton: {
    flex: 2,
    padding: 16,
    borderRadius: 8,
    // backgroundColor applied inline with primaryColor
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  participantButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    minWidth: 100,
  },
  participantButtonSelected: {
    // Dynamic colors applied inline
  },
  participantButtonText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  participantButtonTextSelected: {
    color: 'white',
  },
  otherPersonButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f9fafb',
  },
  otherPersonButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
});