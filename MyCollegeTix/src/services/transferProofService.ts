// src/services/transferProofService.ts
// Service for handling transfer proof image uploads

import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/src/lib/supabase";

const BUCKET_NAME = "transfer-proofs";
const MAX_IMAGE_DIMENSION = 1200; // Max width/height for compressed images
const COMPRESSION_QUALITY = 0.7; // 70% quality for good balance of size/quality

// Dynamically import ImageManipulator to handle Expo Go
let ImageManipulator: typeof import("expo-image-manipulator") | null = null;
let imageManipulatorAvailable = false;

try {
  ImageManipulator = require("expo-image-manipulator");
  imageManipulatorAvailable = true;
} catch (e) {
  console.warn("⚠️ expo-image-manipulator not available, using fallback");
}

// Helper to decode base64 to ArrayBuffer (no external dependency)
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Compress and resize an image for optimal upload
 * Reduces file size significantly while maintaining readability
 * Falls back to original image if compression not available
 */
async function compressImage(
  uri: string,
  fallbackBase64?: string
): Promise<{ uri: string; base64: string } | null> {
  // If ImageManipulator not available, use fallback
  if (!imageManipulatorAvailable || !ImageManipulator) {
    console.log("⚠️ Using uncompressed image (ImageManipulator not available)");
    if (fallbackBase64) {
      return { uri, base64: fallbackBase64 };
    }
    return null;
  }

  try {
    console.log("🗜️ Compressing image...");

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_IMAGE_DIMENSION } }], // Resize to max width, height scales proportionally
      {
        compress: COMPRESSION_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (!result.base64) {
      console.warn("⚠️ Compression failed to produce base64");
      // Fall back to original if compression failed
      if (fallbackBase64) {
        return { uri, base64: fallbackBase64 };
      }
      return null;
    }

    console.log("✅ Image compressed successfully");
    return {
      uri: result.uri,
      base64: result.base64,
    };
  } catch (error) {
    console.error("❌ Error compressing image:", error);
    // Fall back to original on error
    if (fallbackBase64) {
      console.log("⚠️ Using uncompressed image as fallback");
      return { uri, base64: fallbackBase64 };
    }
    return null;
  }
}

export interface TransferProofResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class TransferProofService {
  /**
   * Request camera/media library permissions
   */
  static async requestPermissions(): Promise<boolean> {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === "granted";
  }

  /**
   * Open image picker to select a transfer proof
   * Returns compressed base64 data for optimized upload
   */
  static async pickImage(): Promise<{ uri: string; base64: string } | null> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, // Reduced quality as fallback
      base64: true, // Get base64 as fallback if compression unavailable
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return null;
    }

    const asset = result.assets[0];
    // Compress the image for optimal upload size (with fallback)
    return compressImage(asset.uri, asset.base64 || undefined);
  }

  /**
   * Open camera to take a photo of transfer proof
   * Returns compressed base64 data for optimized upload
   */
  static async takePhoto(): Promise<{ uri: string; base64: string } | null> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, // Reduced quality as fallback
      base64: true, // Get base64 as fallback if compression unavailable
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return null;
    }

    const asset = result.assets[0];
    // Compress the image for optimal upload size (with fallback)
    return compressImage(asset.uri, asset.base64 || undefined);
  }

  /**
   * Get user info for folder naming
   */
  static async getUserInfo(): Promise<{ id: string; name: string; email: string } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      // Create a safe folder name from email or name
      const name = profile?.full_name || profile?.email || user.email || "unknown";
      const safeName = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .substring(0, 50);

      return {
        id: user.id,
        name: safeName,
        email: profile?.email || user.email || "",
      };
    } catch (error) {
      console.error("Error getting user info:", error);
      return null;
    }
  }

  /**
   * Upload transfer proof to Supabase Storage
   */
  static async uploadProof(
    orderId: string,
    base64Data: string
  ): Promise<TransferProofResult> {
    try {
      console.log("📤 Starting proof upload...");

      // Get user info for folder naming
      const userInfo = await this.getUserInfo();
      if (!userInfo) {
        return { success: false, error: "Not authenticated" };
      }

      // Create file path: {user_name}/{order_id}/{timestamp}.jpg
      const timestamp = Date.now();
      const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const filePath = `${userInfo.name}/${orderId.substring(0, 8)}_${dateStr}/${timestamp}.jpg`;

      console.log("📤 Uploading to path:", filePath);

      // Convert base64 to ArrayBuffer
      const arrayBuffer = base64ToArrayBuffer(base64Data);

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("❌ Upload error:", uploadError);
        return { success: false, error: uploadError.message };
      }

      console.log("✅ Upload successful:", data?.path);

      // Get signed URL (valid for 1 year for admin/dispute purposes)
      const { data: urlData } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

      if (!urlData?.signedUrl) {
        return { success: false, error: "Failed to generate URL" };
      }

      return { success: true, url: urlData.signedUrl };
    } catch (error) {
      console.error("❌ Error uploading transfer proof:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get the transfer proof URL for an order
   */
  static async getProofUrl(orderId: string): Promise<string | null> {
    try {
      const userInfo = await this.getUserInfo();
      if (!userInfo) return null;

      // List files in the order folder
      const { data: files, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(`${userInfo.name}/${orderId.substring(0, 8)}`);

      if (error || !files?.length) {
        return null;
      }

      // Get the most recent file
      const latestFile = files.sort((a, b) =>
        (b.created_at || "").localeCompare(a.created_at || "")
      )[0];

      const filePath = `${userInfo.name}/${orderId.substring(0, 8)}/${latestFile.name}`;

      const { data: urlData } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 60 * 60); // 1 hour

      return urlData?.signedUrl || null;
    } catch (error) {
      console.error("Error getting proof URL:", error);
      return null;
    }
  }

  /**
   * Get proof URL by direct path (for admins viewing disputes)
   */
  static async getProofByPath(proofUrl: string): Promise<string | null> {
    // If it's already a signed URL, return it
    if (proofUrl.includes("token=")) {
      return proofUrl;
    }

    try {
      const { data } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(proofUrl, 60 * 60);

      return data?.signedUrl || null;
    } catch (error) {
      console.error("Error getting proof by path:", error);
      return null;
    }
  }
}
