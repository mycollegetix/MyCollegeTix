// src/components/ReportModal.tsx - Report Content Modal
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { reportingService, ReportType, ContentType } from '@/src/services/reportingService';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName: string;
  contentId: string;
  contentType: ContentType;
  onReportSubmitted?: () => void;
}

const REPORT_TYPES: Array<{ type: ReportType; label: string; description: string; icon: string }> = [
  {
    type: 'harassment',
    label: 'Harassment or Bullying',
    description: 'Threatening, intimidating, or abusive behavior',
    icon: 'warning'
  },
  {
    type: 'spam',
    label: 'Spam',
    description: 'Repetitive, unwanted, or promotional content',
    icon: 'mail'
  },
  {
    type: 'inappropriate_content',
    label: 'Inappropriate Content',
    description: 'Offensive, explicit, or inappropriate material',
    icon: 'eye-off'
  },
  {
    type: 'fraud',
    label: 'Fraud or Scam',
    description: 'Fraudulent listings or payment scams',
    icon: 'alert-circle'
  },
  {
    type: 'other',
    label: 'Other',
    description: 'Other violations of community guidelines',
    icon: 'ellipsis-horizontal'
  }
];

export function ReportModal({
  visible,
  onClose,
  reportedUserId,
  reportedUserName,
  contentId,
  contentType,
  onReportSubmitted
}: ReportModalProps) {
  const theme = useTheme();
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select a report type');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await reportingService.createReport({
        reportedUserId,
        contentId,
        contentType,
        reportType: selectedType,
        description: description.trim() || undefined,
      });

      if (result.success) {
        Alert.alert(
          'Report Submitted',
          'Thank you for your report. Our team will review it within 24 hours.',
          [
            {
              text: 'OK',
              onPress: () => {
                onClose();
                onReportSubmitted?.();
              }
            }
          ]
        );
        
        // Reset form
        setSelectedType(null);
        setDescription('');
      } else {
        Alert.alert('Error', result.error || 'Failed to submit report');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Content</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={[styles.userAvatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.userAvatarText}>
                {reportedUserName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{reportedUserName}</Text>
              <Text style={styles.reportText}>
                Report content or behavior from this user
              </Text>
            </View>
          </View>

          {/* Report Types */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's happening?</Text>
            <Text style={styles.sectionDescription}>
              Select the option that best describes the issue:
            </Text>
          </View>

          {REPORT_TYPES.map((reportType) => (
            <TouchableOpacity
              key={reportType.type}
              style={[
                styles.reportTypeCard,
                selectedType === reportType.type && [
                  styles.selectedCard,
                  { borderColor: theme.primary }
                ]
              ]}
              onPress={() => setSelectedType(reportType.type)}
              disabled={isSubmitting}
            >
              <View style={styles.reportTypeContent}>
                <View style={[
                  styles.reportTypeIcon,
                  selectedType === reportType.type && { backgroundColor: theme.primary }
                ]}>
                  <Ionicons
                    name={reportType.icon as any}
                    size={20}
                    color={selectedType === reportType.type ? 'white' : '#6b7280'}
                  />
                </View>
                <View style={styles.reportTypeText}>
                  <Text style={[
                    styles.reportTypeLabel,
                    selectedType === reportType.type && styles.selectedLabel
                  ]}>
                    {reportType.label}
                  </Text>
                  <Text style={styles.reportTypeDescription}>
                    {reportType.description}
                  </Text>
                </View>
              </View>
              {selectedType === reportType.type && (
                <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}

          {/* Additional Details */}
          {selectedType && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
              <Text style={styles.sectionDescription}>
                Provide any additional context that might help our review:
              </Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                placeholder="Describe what happened..."
                value={description}
                onChangeText={setDescription}
                maxLength={500}
                editable={!isSubmitting}
              />
              <Text style={styles.characterCount}>
                {description.length}/500 characters
              </Text>
            </View>
          )}

          {/* Warning */}
          <View style={styles.warningContainer}>
            <View style={styles.warningIcon}>
              <Ionicons name="information-circle" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.warningText}>
              False reports may result in restrictions on your account. 
              Our team reviews all reports within 24 hours.
            </Text>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: selectedType ? theme.primary : '#d1d5db' }
            ]}
            onPress={handleSubmit}
            disabled={!selectedType || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="flag" size={20} color="white" />
                <Text style={styles.submitButtonText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  reportText: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  reportTypeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCard: {
    borderWidth: 2,
  },
  reportTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reportTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportTypeText: {
    flex: 1,
  },
  reportTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  selectedLabel: {
    color: '#1f2937',
  },
  reportTypeDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  textArea: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 20,
  },
  warningIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});