// src/components/LegalDocumentStatus.tsx - Legal Documents Display (No Agreement Tracking)
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/providers/ThemeProvider";
import { documentService } from "@/src/services/documentService";

export function LegalDocumentStatus() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [documentsAvailable, setDocumentsAvailable] = useState(false);
  const [termsVersion, setTermsVersion] = useState<string>("N/A");
  const [privacyVersion, setPrivacyVersion] = useState<string>("N/A");

  useEffect(() => {
    checkDocumentAvailability();
  }, []);

  const checkDocumentAvailability = async () => {
    try {
      setLoading(true);
      
      const [termsDoc, privacyDoc] = await Promise.all([
        documentService.getLegalDocument("terms_of_service"),
        documentService.getLegalDocument("privacy_policy"),
      ]);

      // Check if we have valid documents
      const hasTerms = termsDoc.source === "database" && termsDoc.content.length > 50;
      const hasPrivacy = privacyDoc.source === "database" && privacyDoc.content.length > 50;
      
      setDocumentsAvailable(hasTerms && hasPrivacy);
      setTermsVersion(hasTerms ? termsDoc.version : "N/A");
      setPrivacyVersion(hasPrivacy ? privacyDoc.version : "N/A");

      console.log("📄 Document availability check:", {
        hasTerms,
        hasPrivacy,
        termsVersion: termsDoc.version,
        privacyVersion: privacyDoc.version,
      });
    } catch (error) {
      console.error("Error checking document availability:", error);
      setDocumentsAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.header}>
          <Ionicons name="document-text-outline" size={20} color={theme.text} />
          <Text style={[styles.title, { color: theme.text }]}>Legal Documents</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading documents...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.header}>
        <Ionicons name="document-text-outline" size={20} color={theme.text} />
        <Text style={[styles.title, { color: theme.text }]}>Legal Documents</Text>
        <View style={[
          styles.statusBadge,
          { 
            backgroundColor: documentsAvailable ? '#10b981' : '#f59e0b',
          }
        ]}>
          <Text style={styles.statusText}>
            {documentsAvailable ? 'Available' : 'Limited'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {documentsAvailable 
            ? "View our current terms of service and privacy policy."
            : "Some legal documents may not be available."}
        </Text>

        <View style={styles.documentsContainer}>
          <TouchableOpacity
            style={[styles.documentButton, { borderColor: theme.border }]}
            onPress={() => router.push("/legal/terms")}
          >
            <View style={styles.documentInfo}>
              <Ionicons name="document-outline" size={16} color={theme.primary} />
              <Text style={[styles.documentTitle, { color: theme.text }]}>
                Terms of Service
              </Text>
            </View>
            <View style={styles.documentMeta}>
              <Text style={[styles.versionText, { color: theme.textSecondary }]}>
                v{termsVersion}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.documentButton, { borderColor: theme.border }]}
            onPress={() => router.push("/legal/privacy")}
          >
            <View style={styles.documentInfo}>
              <Ionicons name="shield-outline" size={16} color={theme.primary} />
              <Text style={[styles.documentTitle, { color: theme.text }]}>
                Privacy Policy
              </Text>
            </View>
            <View style={styles.documentMeta}>
              <Text style={[styles.versionText, { color: theme.textSecondary }]}>
                v{privacyVersion}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {!documentsAvailable && (
          <View style={[styles.warningContainer, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
            <Ionicons name="warning-outline" size={16} color="#92400e" />
            <Text style={[styles.warningText, { color: '#92400e' }]}>
              Some legal documents may be unavailable or outdated.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    gap: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  documentsContainer: {
    gap: 8,
  },
  documentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  documentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  documentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  versionText: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    flex: 1,
  },
});