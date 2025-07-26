// src/app/(admin)/moderation.tsx - Admin Content Moderation Dashboard
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { supabase } from '@/src/lib/supabase';

interface ContentReport {
  id: string;
  content_type: 'ticket' | 'message' | 'profile';
  content_id: string;
  reported_by: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  admin_notes: string | null;
  resolved_at: string | null;
  additional_context: any;
  reporter?: {
    full_name: string;
    email: string;
  };
  reported_user?: {
    full_name: string;
    email: string;
  };
}

interface UserViolation {
  id: string;
  user_id: string;
  violation_type: string;
  content: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export default function ModerationDashboard() {
  const theme = useTheme();
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [violations, setViolations] = useState<UserViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'reports' | 'violations'>('reports');
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolutionModal, setShowResolutionModal] = useState(false);

  useEffect(() => {
    loadModerationData();
  }, []);

  const loadModerationData = async () => {
    setLoading(true);
    try {
      // Load reports with basic data (table may not exist yet)
      try {
        const { data: reportsData, error: reportsError } = await supabase
          .from('content_reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (!reportsError && reportsData) {
          setReports(reportsData as ContentReport[]);
        } else if (reportsError) {
          console.log('Content reports table may not exist yet:', reportsError.message);
          setReports([]);
        }
      } catch (error) {
        console.log('Content reports not available:', error);
        setReports([]);
      }

      // Load violations from system logs
      try {
        const { data: violationsData, error: violationsError } = await supabase
          .from('system_logs')
          .select('*')
          .eq('operation', 'moderation_violation')
          .order('created_at', { ascending: false });

        if (!violationsError && violationsData) {
          // Transform system logs to violation format
          const transformedViolations = violationsData
            .filter(log => log.created_at !== null)
            .map(log => ({
              id: log.id,
              user_id: (log.details as any)?.user_id || '',
              violation_type: (log.details as any)?.violation_type || 'content_violation',
              content: (log.details as any)?.content || log.operation,
              reason: (log.details as any)?.reason || log.operation,
              status: 'pending' as const,
              created_at: log.created_at!,
              profiles: null
            }));
          setViolations(transformedViolations);
        } else {
          console.log('System logs not available for violations:', violationsError?.message);
          setViolations([]);
        }
      } catch (error) {
        console.log('Violations data not available:', error);
        setViolations([]);
      }
    } catch (error) {
      console.error('Error loading moderation data:', error);
      Alert.alert('Error', 'Failed to load moderation data');
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (
    reportId: string,
    status: 'approved' | 'rejected',
    notes?: string
  ) => {
    try {
      const { error } = await supabase
        .from('content_reports')
        .update({
          status,
          resolved_at: new Date().toISOString(),
          admin_notes: notes,
        })
        .eq('id', reportId);

      if (error) {
        throw error;
      }

      // Refresh data
      loadModerationData();
      Alert.alert('Success', `Report ${status} successfully`);
    } catch (error) {
      console.error('Error updating report:', error);
      Alert.alert('Error', 'Failed to update report status');
    }
  };

  const suspendUser = async (userId: string, reason: string, days?: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Log the suspension action in system_logs
      const { error } = await supabase
        .from('system_logs')
        .insert({
          operation: 'user_suspension',
          details: {
            user_id: userId,
            suspended_by: user?.id,
            reason,
            duration_days: days,
            is_permanent: !days,
            end_date: days 
              ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
              : null
          }
        });

      if (error) {
        throw error;
      }

      Alert.alert('Success', `User ${days ? 'suspended' : 'permanently banned'} successfully`);
    } catch (error) {
      console.error('Error suspending user:', error);
      Alert.alert('Error', 'Failed to suspend user');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'reviewed': return '#10b981';
      case 'dismissed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const handleReportAction = (report: ContentReport) => {
    Alert.alert(
      'Report Actions',
      `${report.content_type} report: ${report.reason}`,
      [
        {
          text: 'Approve Report',
          onPress: () => updateReportStatus(report.id, 'approved'),
        },
        {
          text: 'Approve with Notes',
          onPress: () => {
            setSelectedReport(report);
            setShowResolutionModal(true);
          },
        },
        {
          text: 'Reject Report',
          onPress: () => updateReportStatus(report.id, 'rejected'),
        },
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const renderReportCard = (report: ContentReport) => (
    <TouchableOpacity
      key={report.id}
      style={styles.card}
      onPress={() => handleReportAction(report)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.reportType}>{report.content_type.toUpperCase()} REPORT</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
            <Text style={styles.statusText}>{report.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.cardDate}>{formatDate(report.created_at)}</Text>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardLabel}>Reporter ID:</Text>
        <Text style={styles.cardValue}>{report.reported_by || 'Unknown'}</Text>
        
        <Text style={styles.cardLabel}>Content Type:</Text>
        <Text style={styles.cardValue}>{report.content_type}</Text>
        
        <Text style={styles.cardLabel}>Reason:</Text>
        <Text style={styles.cardValue}>{report.reason}</Text>
        
        {report.description && (
          <>
            <Text style={styles.cardLabel}>Description:</Text>
            <Text style={styles.cardValue}>{report.description}</Text>
          </>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Ionicons name="flag" size={16} color={theme.primary} />
        <Text style={[styles.actionText, { color: theme.primary }]}>
          Tap to take action
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderViolationCard = (violation: UserViolation) => (
    <View key={violation.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.reportType}>{violation.violation_type.replace('_', ' ').toUpperCase()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(violation.status) }]}>
            <Text style={styles.statusText}>{violation.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.cardDate}>{formatDate(violation.created_at)}</Text>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardLabel}>User:</Text>
        <Text style={styles.cardValue}>
          {violation.profiles ? `${violation.profiles.full_name} (${violation.profiles.email})` : 'Unknown User'}
        </Text>
        
        <Text style={styles.cardLabel}>Reason:</Text>
        <Text style={styles.cardValue}>{violation.reason}</Text>
        
        {violation.content && (
          <>
            <Text style={styles.cardLabel}>Content:</Text>
            <Text style={styles.cardValue} numberOfLines={3}>{violation.content}</Text>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Content Moderation</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadModerationData}
        >
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{reports.filter(r => r.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>Pending Reports</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{violations.filter(v => v.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>Auto Violations</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{reports.filter(r => r.status === 'approved').length}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'reports' && { backgroundColor: theme.primary }]}
          onPress={() => setSelectedTab('reports')}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'reports' && styles.activeTabText
          ]}>
            User Reports ({reports.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'violations' && { backgroundColor: theme.primary }]}
          onPress={() => setSelectedTab('violations')}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'violations' && styles.activeTabText
          ]}>
            Auto Violations ({violations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadModerationData}
            tintColor={theme.primary}
          />
        }
      >
        {selectedTab === 'reports' ? (
          reports.length > 0 ? (
            reports.map(renderReportCard)
          ) : (
            <Text style={styles.emptyText}>No reports found</Text>
          )
        ) : (
          violations.length > 0 ? (
            violations.map(renderViolationCard)
          ) : (
            <Text style={styles.emptyText}>No violations found</Text>
          )
        )}
      </ScrollView>

      {/* Resolution Modal */}
      <Modal
        visible={showResolutionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResolutionModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowResolutionModal(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Resolve Report</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>Resolution Notes:</Text>
            <TextInput
              style={styles.modalTextInput}
              multiline
              numberOfLines={4}
              placeholder="Describe the action taken and reasoning..."
              value={resolutionNotes}
              onChangeText={setResolutionNotes}
            />

            <TouchableOpacity
              style={[styles.resolveButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                if (selectedReport) {
                  updateReportStatus(selectedReport.id, 'approved', resolutionNotes);
                  setShowResolutionModal(false);
                  setResolutionNotes('');
                  setSelectedReport(null);
                }
              }}
            >
              <Text style={styles.resolveButtonText}>Approve Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  cardDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardContent: {
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6b7280',
    marginTop: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalTextInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 20,
  },
  resolveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resolveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});