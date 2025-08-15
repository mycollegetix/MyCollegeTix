// src/services/ipTrackingService.ts - IP Address and Device Tracking Service
import { supabase } from "@/src/lib/supabase";
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

class IPTrackingService {
  private static instance: IPTrackingService;
  private lastTrackedIP: string | null = null;
  private trackingInProgress = false;

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
      buildVersion: Constants.expoConfig?.android?.versionCode?.toString() || 
                   Constants.expoConfig?.ios?.buildNumber || "unknown",
      isDevice: Device.isDevice,
    };

    return deviceInfo;
  }

  // Generate user agent string
  private getUserAgent(): string {
    const deviceInfo = this.getDeviceInfo();
    return `MyCollegeTix/${deviceInfo.appVersion} (${deviceInfo.platform}; ${deviceInfo.osName} ${deviceInfo.osVersion}; ${deviceInfo.modelName})`;
  }

  // Get public IP address (router IP, not device IP)
  private async getPublicIP(): Promise<string | null> {
    try {
      console.log("🌐 Fetching public IP address...");
      
      // Try multiple IP services for reliability
      const ipServices = [
        "https://api.ipify.org?format=json",
        "https://ipapi.co/json/",
        "https://ip-api.com/json/",
      ];

      for (const service of ipServices) {
        try {
          const response = await fetch(service, {
            timeout: 5000, // 5 second timeout
            headers: {
              'User-Agent': this.getUserAgent(),
            },
          });

          if (response.ok) {
            const data = await response.json();
            
            // Different services return IP in different fields
            const ip = data.ip || data.query || data.ipAddress;
            
            if (ip && this.isValidIP(ip)) {
              console.log(`✅ Got IP from ${service}: ${ip}`);
              return ip;
            }
          }
        } catch (error) {
          console.log(`⚠️ Service ${service} failed:`, error);
          continue; // Try next service
        }
      }

      console.error("❌ All IP services failed");
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
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': this.getUserAgent(),
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'success') {
          console.log(`✅ Got location data: ${data.city}, ${data.regionName}, ${data.country}`);
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
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    // Simple IPv6 validation
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  // Track user IP and device info
  async trackUserIP(userId: string): Promise<{ success: boolean; ip?: string; error?: string }> {
    if (this.trackingInProgress) {
      console.log("🔄 IP tracking already in progress, skipping...");
      return { success: false, error: "Tracking in progress" };
    }

    this.trackingInProgress = true;

    try {
      console.log(`🕵️ Starting IP tracking for user: ${userId}`);

      // Get public IP address
      const ip = await this.getPublicIP();
      if (!ip) {
        console.log("⚠️ Could not determine IP address");
        return { success: false, error: "Could not determine IP address" };
      }

      // Check if IP has changed since last tracking
      if (this.lastTrackedIP === ip) {
        console.log("🔄 IP hasn't changed, skipping update");
        return { success: true, ip };
      }

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

      // Update cached IP
      this.lastTrackedIP = ip;

      console.log(`✅ IP tracking successful for user ${userId}:`, {
        ip,
        location: locationData ? `${locationData.city}, ${locationData.country}` : "unknown",
        device: `${deviceInfo.platform} ${deviceInfo.osVersion}`,
      });

      return { success: true, ip };

    } catch (error) {
      console.error("❌ Error in IP tracking:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    } finally {
      this.trackingInProgress = false;
    }
  }

  // Get user's current tracked IP info
  async getUserIPInfo(userId: string): Promise<{
    current_ip?: string;
    last_ip?: string;
    location?: any;
    device?: any;
    updated_at?: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("current_ip_address, last_ip_address, location_data, device_info, ip_updated_at")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user IP info:", error);
        return null;
      }

      return {
        current_ip: data.current_ip_address,
        last_ip: data.last_ip_address,
        location: data.location_data,
        device: data.device_info,
        updated_at: data.ip_updated_at,
      };
    } catch (error) {
      console.error("Error in getUserIPInfo:", error);
      return null;
    }
  }

  // Admin function: Get all users by IP
  async getUsersByIP(ipAddress: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, email, current_ip_address, ip_updated_at")
        .or(`current_ip_address.eq.${ipAddress},last_ip_address.eq.${ipAddress}`);

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