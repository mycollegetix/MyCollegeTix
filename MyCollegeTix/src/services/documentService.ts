// src/services/documentService.ts - Legal Documents Service (No Agreements)
import { supabase } from "@/src/lib/supabase";
import { Tables } from "@/src/types/database.types";

export type DocumentType = "terms_of_service" | "privacy_policy";
export type LegalDocument = Tables<"legal_document_versions">;

interface DocumentVersion {
  document_type: DocumentType;
  version: string;
  title: string;
  content: string;
  effective_date: string;
  is_active: boolean;
}

class DocumentService {
  private static instance: DocumentService;
  private cachedVersions: Map<DocumentType, DocumentVersion> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  // Get current active versions from database
  private async getCurrentVersions(): Promise<
    Map<DocumentType, DocumentVersion>
  > {
    const now = Date.now();

    // Return cached versions if still valid
    if (
      this.cachedVersions.size > 0 &&
      now - this.lastCacheUpdate < this.CACHE_DURATION
    ) {
      return this.cachedVersions;
    }

    try {
      const { data: documents, error } = await supabase
        .from("legal_document_versions")
        .select(
          "document_type, version, title, content, effective_date, is_active"
        )
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching current document versions:", error);
        return this.cachedVersions; // Return old cache if available
      }

      // Update cache
      this.cachedVersions.clear();
      documents?.forEach((doc) => {
        this.cachedVersions.set(doc.document_type, doc);
      });
      this.lastCacheUpdate = now;

      console.log("Updated document versions cache:", {
        versions: Array.from(this.cachedVersions.entries()).map(
          ([type, doc]) => ({ type, version: doc.version })
        ),
      });

      return this.cachedVersions;
    } catch (error) {
      console.error("Error in getCurrentVersions:", error);
      return this.cachedVersions; // Return old cache if available
    }
  }

  // Get specific document version info
  async getDocumentVersion(
    documentType: DocumentType
  ): Promise<DocumentVersion | null> {
    const versions = await this.getCurrentVersions();
    return versions.get(documentType) || null;
  }

  // Get legal document from database
  async getLegalDocument(type: DocumentType): Promise<{
    content: string;
    title: string;
    version: string;
    source: "database" | "error";
    error?: string;
  }> {
    try {
      console.log(`Fetching ${type} from database...`);

      const documentVersion = await this.getDocumentVersion(type);

      if (!documentVersion) {
        console.error(`No active ${type} document found in database`);
        return {
          content: `No ${type.replace("_", " ")} document available`,
          title: `${type.replace("_", " ")} - Not Available`,
          version: "0.0",
          source: "error",
          error: "No active document found",
        };
      }

      console.log(
        `✅ Successfully fetched ${type} from database (v${documentVersion.version})`
      );
      return {
        content: documentVersion.content,
        title: documentVersion.title,
        version: documentVersion.version,
        source: "database",
      };
    } catch (error) {
      console.error(`❌ Error fetching ${type} from database:`, error);

      return {
        content: `Error loading ${type.replace("_", " ")}`,
        title: `${type.replace("_", " ")} - Error`,
        version: "0.0",
        source: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get both documents (convenience method)
  async getAllLegalDocuments(): Promise<{
    termsOfService: {
      content: string;
      title: string;
      version: string;
      source: "database" | "error";
      error?: string;
    };
    privacyPolicy: {
      content: string;
      title: string;
      version: string;
      source: "database" | "error";
      error?: string;
    };
  }> {
    const [termsOfService, privacyPolicy] = await Promise.all([
      this.getLegalDocument("terms_of_service"),
      this.getLegalDocument("privacy_policy"),
    ]);

    return {
      termsOfService,
      privacyPolicy,
    };
  }

  // Admin: Create new document version
  async createDocumentVersion(
    documentType: DocumentType,
    version: string,
    title: string,
    content: string,
    effectiveDate: string,
    activate: boolean = false
  ): Promise<{ success: boolean; error?: string; documentId?: string }> {
    try {
      const { data: newDoc, error } = await supabase
        .from("legal_document_versions")
        .insert({
          document_type: documentType,
          version,
          title,
          content,
          effective_date: effectiveDate,
          is_active: false, // Always create as inactive first
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating document version:", error);
        return { success: false, error: error.message };
      }

      // If requested, activate the new version
      if (activate) {
        const activateResult = await this.activateDocumentVersion(
          documentType,
          version
        );
        if (!activateResult.success) {
          return {
            success: false,
            error: `Document created but activation failed: ${activateResult.error}`,
          };
        }
      }

      console.log(`Document version created: ${documentType} v${version}`, {
        documentId: newDoc.id,
        activated: activate,
      });

      return { success: true, documentId: newDoc.id };
    } catch (error) {
      console.error("Error in createDocumentVersion:", error);
      return { success: false, error: "Failed to create document version" };
    }
  }

  // Admin: Activate a specific document version
  async activateDocumentVersion(
    documentType: DocumentType,
    version: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First deactivate all versions of this document type
      const { error: deactivateError } = await supabase
        .from("legal_document_versions")
        .update({ is_active: false })
        .eq("document_type", documentType);

      if (deactivateError) {
        console.error("Error deactivating existing versions:", deactivateError);
        return { success: false, error: deactivateError.message };
      }

      // Then activate the specific version
      const { error: activateError } = await supabase
        .from("legal_document_versions")
        .update({ is_active: true })
        .eq("document_type", documentType)
        .eq("version", version);

      if (activateError) {
        console.error("Error activating document version:", activateError);
        return { success: false, error: activateError.message };
      }

      // Clear cache to force refresh
      this.cachedVersions.clear();

      console.log(`Document version activated: ${documentType} v${version}`);
      return { success: true };
    } catch (error) {
      console.error("Error in activateDocumentVersion:", error);
      return { success: false, error: "Failed to activate document version" };
    }
  }

  // Admin: Get all versions of a document type
  async getDocumentVersionHistory(
    documentType: DocumentType
  ): Promise<LegalDocument[]> {
    try {
      const { data, error } = await supabase
        .from("legal_document_versions")
        .select("*")
        .eq("document_type", documentType)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching document version history:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getDocumentVersionHistory:", error);
      return [];
    }
  }
}

export const documentService = DocumentService.getInstance();
