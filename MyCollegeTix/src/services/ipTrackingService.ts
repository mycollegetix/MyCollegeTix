// src/services/ipTrackingService.ts - IP Address and Device Tracking Service
import { supabase } from "../lib/supabase";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

interface DeviceInfo {
  platform: string;
  osName: string | null;
  osVersion: string | null;
  deviceType: Device.DeviceType | null;
  deviceName: string | null;
  brand: string | null;
  modelName: string | null;
  appVersion: string;
  buildVersion: string;
  isDevice: boolean;
}

interface LocationData {
  ip: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query?: string;
}

interface IPTrackingData {
  ip_address: string;
  device_info: DeviceInfo;
  location_data?: LocationData;
  user_agent: string;
}

interface TrackingContext {
  trigger: "login" | "app_resume" | "action_based" | "periodic";
  action?: string; // For action_based tracking
  force?: boolean; // Skip throttling
}

class IPTrackingService {
  private static instance: IPTrackingService;
  // Enhanced user tracking state with timing information
  private userTrackingState: Map<
    string,
    {
      inProgress: boolean;
      lastIP: string | null;
      lastTrackedAt: Date | null;
    }
  > = new Map();

  // Throttling constants (in milliseconds)
  private static readonly THROTTLE_APP_RESUME = 60 * 60 * 1000; // 1 hour
  private static readonly THROTTLE_PERIODIC = 4 * 60 * 60 * 1000; // 4 hours
  private static readonly THROTTLE_SAME_IP = 30 * 60 * 1000; // 30 minutes

  private constructor() {}

  static getInstance(): IPTrackingService {
    if (!IPTrackingService.instance) {
      IPTrackingService.instance = new IPTrackingService();
    }
    return IPTrackingService.instance;
  }

  // Get device information
  private getDeviceInfo(): DeviceInfo {
    const deviceInfo: DeviceInfo = {
      platform: Platform.OS,
      osName: Device.osName,
      osVersion: Device.osVersion,
      deviceType: Device.deviceType,
      deviceName: Device.deviceName,
      brand: Device.brand,
      modelName: Device.modelName,
      appVersion: Constants.expoConfig?.version || "unknown",
      buildVersion:
        Constants.expoConfig?.android?.versionCode?.toString() ||
        Constants.expoConfig?.ios?.buildNumber ||
        "unknown",
      isDevice: Device.isDevice,
    };

    return deviceInfo;
  }

  // Generate user agent string
  private getUserAgent(): string {
    const deviceInfo = this.getDeviceInfo();
    return `MyCollegeTix/${deviceInfo.appVersion} (${deviceInfo.platform}; ${deviceInfo.osName} ${deviceInfo.osVersion}; ${deviceInfo.modelName})`;
  }

  // Get public IP address with retry logic and more services
  private async getPublicIP(): Promise<string | null> {
    try {
      console.log("🌐 Fetching public IP address...");

      // Expanded list of IP services for better reliability
      const ipServices = [
        "https://api.ipify.org?format=json",
        "https://ipapi.co/json/",
        "https://ip-api.com/json/",
        "https://httpbin.org/ip",
        "https://api.my-ip.io/ip.json",
        "https://ipinfo.io/json",
        "https://api64.ipify.org?format=json", // IPv6 support
      ];

      // Try each service with retry logic
      for (const service of ipServices) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          // 2 attempts per service
          try {
            console.log(`🔄 Trying ${service} (attempt ${attempt})`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(service, {
              signal: controller.signal,
              headers: {
                "User-Agent": this.getUserAgent(),
              },
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const data: any = await response.json();

              // Different services return IP in different fields
              const ip = data.ip || data.query || data.ipAddress;

              if (ip && this.isValidIP(ip)) {
                console.log(`✅ Got IP from ${service}: ${ip}`);
                return ip;
              }
            }
          } catch (error) {
            console.log(
              `⚠️ Service ${service} attempt ${attempt} failed:`,
              error
            );

            // Wait 1 second before retry (only if not last attempt)
            if (attempt === 1) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }
      }

      console.error("❌ All IP services failed after retries");
      return null;
    } catch (error) {
      console.error("❌ Error getting public IP:", error);
      return null;
    }
  }

  // Get location data from IP
  private async getLocationFromIP(ip: string): Promise<LocationData | null> {
    try {
      console.log(`🌍 Getting location data for IP: ${ip}`);

      // Use ip-api.com for free geolocation (100 requests/minute limit)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
        {
          signal: controller.signal,
          headers: {
            "User-Agent": this.getUserAgent(),
          },
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json();

        if (data.status === "success") {
          console.log(
            `✅ Got location data: ${data.city || "Unknown"}, ${
              data.regionName || "Unknown"
            }, ${data.country || "Unknown"}`
          );
          return {
            ip: data.query || ip,
            country: data.country,
            countryCode: data.countryCode,
            region: data.region,
            regionName: data.regionName,
            city: data.city,
            zip: data.zip,
            lat: data.lat,
            lon: data.lon,
            timezone: data.timezone,
            isp: data.isp,
            org: data.org,
            as: data.as,
            query: data.query,
          };
        } else {
          console.log(`⚠️ Location API returned error: ${data.message}`);
        }
      }

      return null;
    } catch (error) {
      console.error("❌ Error getting location data:", error);
      return null;
    }
  }

  // Validate IP address format
  private isValidIP(ip: string): boolean {
    // Simple IPv4 validation
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    // Simple IPv6 validation
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  // Check if IP tracking should proceed based on context and timing
  private shouldTrackIP(
    userId: string,
    context: TrackingContext,
    currentIP?: string
  ): { shouldTrack: boolean; reason: string } {
    // Always track if forced
    if (context.force) {
      return { shouldTrack: true, reason: "forced" };
    }

    // Always track important actions
    if (context.trigger === "action_based") {
      return { shouldTrack: true, reason: "important_action" };
    }

    // Get user tracking state
    const userState = this.userTrackingState.get(userId);
    if (!userState || !userState.lastTrackedAt) {
      return { shouldTrack: true, reason: "first_time" };
    }

    const timeSinceLastTrack = Date.now() - userState.lastTrackedAt.getTime();

    // Check throttling based on trigger type
    switch (context.trigger) {
      case "login":
        // Always track on login (profile load)
        return { shouldTrack: true, reason: "login" };

      case "app_resume":
        if (timeSinceLastTrack < IPTrackingService.THROTTLE_APP_RESUME) {
          return {
            shouldTrack: false,
            reason: `app_resume_throttled (${Math.round(
              timeSinceLastTrack / 60000
            )}min ago)`,
          };
        }
        return { shouldTrack: true, reason: "app_resume_allowed" };

      case "periodic":
        if (timeSinceLastTrack < IPTrackingService.THROTTLE_PERIODIC) {
          return {
            shouldTrack: false,
            reason: `periodic_throttled (${Math.round(
              timeSinceLastTrack / 3600000
            )}h ago)`,
          };
        }
        return { shouldTrack: true, reason: "periodic_allowed" };

      default:
        return { shouldTrack: true, reason: "default" };
    }
  }

  // Get last tracking time for a user
  getLastTrackingTime(userId: string): Date | null {
    const userState = this.userTrackingState.get(userId);
    return userState?.lastTrackedAt || null;
  }

  // Check if user should be tracked (public method for external use)
  shouldTrackUser(userId: string, context: TrackingContext): boolean {
    return this.shouldTrackIP(userId, context).shouldTrack;
  }

  // Track user IP and device info with smart throttling
  async trackUserIP(
    userId: string,
    context: TrackingContext = { trigger: "login" }
  ): Promise<{
    success: boolean;
    ip?: string;
    error?: string;
    reason?: string;
  }> {
    // Get or create user-specific tracking state
    let userState = this.userTrackingState.get(userId);
    if (!userState) {
      userState = { inProgress: false, lastIP: null, lastTrackedAt: null };
      this.userTrackingState.set(userId, userState);
    }

    // Check if tracking is in progress for THIS specific user
    if (userState.inProgress) {
      console.log(
        `🔄 IP tracking already in progress for user ${userId}, skipping...`
      );
      return {
        success: false,
        error: "Tracking in progress for this user",
        reason: "in_progress",
      };
    }

    // Check smart throttling logic
    const shouldTrackResult = this.shouldTrackIP(userId, context);
    if (!shouldTrackResult.shouldTrack) {
      console.log(
        `⏰ IP tracking throttled for user ${userId}: ${shouldTrackResult.reason}`
      );
      return {
        success: false,
        error: `Tracking throttled: ${shouldTrackResult.reason}`,
        reason: shouldTrackResult.reason,
      };
    }

    console.log(
      `✅ IP tracking approved for user ${userId}: ${shouldTrackResult.reason} (trigger: ${context.trigger})`
    );
    userState.inProgress = true;

    try {
      console.log(`🕵️ Starting IP tracking for user: ${userId}`);

      // Get public IP address
      const ip = await this.getPublicIP();
      if (!ip) {
        console.log("⚠️ Could not determine IP address");
        return { success: false, error: "Could not determine IP address" };
      }

      // REMOVED: Duplicate IP optimization - now every user gets tracked regardless of IP
      // This allows multiple users on same network to all be tracked
      console.log(
        `📍 Tracking IP ${ip} for user ${userId} (no duplicate check)`
      );

      // Get device info
      const deviceInfo = this.getDeviceInfo();

      // Get location data (disabled for privacy)
      const locationData = null; // await this.getLocationFromIP(ip);

      // Get current profile to preserve last IP
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("current_ip_address")
        .eq("id", userId)
        .single();

      // Update user profile with IP and device info
      const updateData: any = {
        current_ip_address: ip,
        last_ip_address: currentProfile?.current_ip_address || null,
        ip_updated_at: new Date().toISOString(),
        device_info: deviceInfo,
        user_agent: this.getUserAgent(),
      };

      // Add location data if available
      if (locationData) {
        updateData.location_data = locationData;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (error) {
        console.error("❌ Error updating user IP:", error);
        return { success: false, error: error.message };
      }

      // Update user-specific cached IP and timestamp
      userState.lastIP = ip;
      userState.lastTrackedAt = new Date();

      console.log(`✅ IP tracking successful for user ${userId}:`, {
        ip,
        trigger: context.trigger,
        action: context.action,
        reason: shouldTrackResult.reason,
        location: locationData
          ? `${(locationData as any).city || "Unknown"}, ${
              (locationData as any).country || "Unknown"
            }`
          : "unknown",
        device: `${deviceInfo.platform} ${deviceInfo.osVersion}`,
      });

      return { success: true, ip, reason: shouldTrackResult.reason };
    } catch (error) {
      console.error("❌ Error in IP tracking:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      // Reset tracking state for this specific user
      if (userState) {
        userState.inProgress = false;
      }
    }
  }

  // Get user's current tracked IP info
  async getUserIPInfo(userId: string): Promise<{
    current_ip?: string | null;
    last_ip?: string | null;
    location?: any;
    device?: any;
    updated_at?: string | null;
  } | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "current_ip_address, last_ip_address, location_data, device_info, ip_updated_at"
        )
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user IP info:", error);
        return null;
      }

      return {
        current_ip: data.current_ip_address || null,
        last_ip: data.last_ip_address || null,
        location: data.location_data,
        device: data.device_info,
        updated_at: data.ip_updated_at || null,
      };
    } catch (error) {
      console.error("Error in getUserIPInfo:", error);
      return null;
    }
  }

  // Convenience methods for different tracking contexts
  async trackOnAppResume(userId: string): Promise<{
    success: boolean;
    ip?: string;
    error?: string;
    reason?: string;
  }> {
    return this.trackUserIP(userId, { trigger: "app_resume" });
  }

  async trackOnAction(
    userId: string,
    action: string
  ): Promise<{
    success: boolean;
    ip?: string;
    error?: string;
    reason?: string;
  }> {
    return this.trackUserIP(userId, { trigger: "action_based", action });
  }

  async trackPeriodic(userId: string): Promise<{
    success: boolean;
    ip?: string;
    error?: string;
    reason?: string;
  }> {
    return this.trackUserIP(userId, { trigger: "periodic" });
  }

  async trackForced(userId: string): Promise<{
    success: boolean;
    ip?: string;
    error?: string;
    reason?: string;
  }> {
    return this.trackUserIP(userId, { trigger: "login", force: true });
  }

  // Admin function: Get all users by IP
  async getUsersByIP(ipAddress: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, email, current_ip_address, ip_updated_at")
        .or(
          `current_ip_address.eq.${ipAddress},last_ip_address.eq.${ipAddress}`
        );

      if (error) {
        console.error("Error fetching users by IP:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getUsersByIP:", error);
      return [];
    }
  }
}

export const ipTrackingService = IPTrackingService.getInstance();
