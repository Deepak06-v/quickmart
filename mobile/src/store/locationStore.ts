import { create } from 'zustand';
import * as Location from 'expo-location';
import { api } from '../api/client';
import { IDeliveryConfig } from '../types';

interface LocationState {
  locationName: string;
  coordinates: { latitude: number; longitude: number } | null;
  isDeliverable: boolean;
  distanceKm: number | null;
  estimatedMinutes: number | null;
  serviceMessage: string;
  permissionGranted: boolean;
  isChecking: boolean;
  deliveryConfig: IDeliveryConfig | null;

  initLocation: () => Promise<void>;
  checkCoordinates: (lat: number, lon: number, name?: string) => Promise<boolean>;
  setManualLocation: (name: string, lat?: number, lon?: number) => Promise<void>;
  fetchDeliveryConfig: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  locationName: 'Detecting location...',
  coordinates: null,
  isDeliverable: true, // Default to true so guest can browse products immediately
  distanceKm: null,
  estimatedMinutes: null,
  serviceMessage: '',
  permissionGranted: false,
  isChecking: false,
  deliveryConfig: null,

  fetchDeliveryConfig: async () => {
    try {
      const res = await api.get<{ success: boolean; config: IDeliveryConfig }>('/config/delivery');
      if (res.success && res.config) {
        set({ deliveryConfig: res.config });
      }
    } catch {
      // Handled quietly
    }
  },

  checkCoordinates: async (latitude: number, longitude: number, customName?: string) => {
    set({ isChecking: true });
    try {
      const res = await api.post<{
        success: boolean;
        isDeliverable: boolean;
        distanceKm: number;
        estimatedMinutes: number | null;
        storeName: string;
        message: string;
      }>('/config/validate-location', { latitude, longitude });

      let derivedName = customName;
      if (!derivedName) {
        try {
          const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (reverse && reverse.length > 0) {
            const place = reverse[0];
            derivedName = [place.name || place.street, place.subregion || place.city || place.district]
              .filter(Boolean)
              .join(', ');
          }
        } catch {
          derivedName = 'Current Location';
        }
      }

      set({
        locationName: derivedName || 'Selected Location',
        coordinates: { latitude, longitude },
        isDeliverable: res.isDeliverable,
        distanceKm: res.distanceKm,
        estimatedMinutes: res.estimatedMinutes,
        serviceMessage: res.message,
        isChecking: false,
      });

      return res.isDeliverable;
    } catch {
      // In case network/server isn't reachable yet, keep browsing enabled
      set({
        locationName: customName || 'Current Location',
        coordinates: { latitude, longitude },
        isDeliverable: true,
        isChecking: false,
      });
      return true;
    }
  },

  initLocation: async () => {
    await get().fetchDeliveryConfig();

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        set({
          permissionGranted: false,
          locationName: 'Tap to set delivery location',
          serviceMessage: 'Location permission denied. You can manually enter your village/area.',
        });
        return;
      }

      set({ permissionGranted: true, isChecking: true });
      const currentPos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await get().checkCoordinates(
        currentPos.coords.latitude,
        currentPos.coords.longitude
      );
    } catch {
      set({
        permissionGranted: false,
        locationName: 'Enter Delivery Location',
        isChecking: false,
      });
    }
  },

  setManualLocation: async (name: string, lat?: number, lon?: number) => {
    const config = get().deliveryConfig;
    const fallbackLat = lat ?? config?.storeLocation.latitude ?? 22.5645;
    const fallbackLon = lon ?? config?.storeLocation.longitude ?? 72.9289;

    await get().checkCoordinates(fallbackLat, fallbackLon, name);
  },
}));
