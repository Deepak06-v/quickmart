import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocationStore } from '../store/locationStore';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

const COMMON_AREAS = [
  { name: 'Anand Town Market', lat: 22.5645, lon: 72.9289 },
  { name: 'Vallabh Vidyanagar', lat: 22.553, lon: 72.9238 },
  { name: 'Mogar Rural Village', lat: 22.518, lon: 72.972 },
  { name: 'Karamsad Colony', lat: 22.548, lon: 72.898 },
  { name: 'Borsad Crossroads', lat: 22.41, lon: 72.901 },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onClose,
}) => {
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);

  const initLocation = useLocationStore((state) => state.initLocation);
  const setManualLocation = useLocationStore((state) => state.setManualLocation);
  const checkCoordinates = useLocationStore((state) => state.checkCoordinates);
  const deliveryConfig = useLocationStore((state) => state.deliveryConfig);

  const handleUseGps = async () => {
    setLoading(true);
    await initLocation();
    setLoading(false);
    onClose();
  };

  const handleSelectArea = async (area: { name: string; lat: number; lon: number }) => {
    setLoading(true);
    await checkCoordinates(area.lat, area.lon, area.name);
    setLoading(false);
    onClose();
  };

  const handleManualSubmit = async () => {
    if (!manualInput.trim()) return;
    setLoading(true);
    // Use store center coordinates for manual name entry within region
    await setManualLocation(manualInput.trim());
    setLoading(false);
    setManualInput('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Select Delivery Location</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* GPS Button */}
            <TouchableOpacity
              onPress={handleUseGps}
              disabled={loading}
              style={styles.gpsButton}
              activeOpacity={0.8}
            >
              <View style={styles.gpsIconCircle}>
                <Ionicons name="navigate" size={18} color={Colors.textInverse} />
              </View>
              <View style={styles.gpsTextWrapper}>
                <Text style={styles.gpsTitle}>Use Current GPS Location</Text>
                <Text style={styles.gpsSubtitle}>Auto-detects using device GPS</Text>
              </View>
              {loading && <ActivityIndicator size="small" color={Colors.primary} />}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Manual input */}
            <View style={styles.inputContainer}>
              <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Enter village, area or landmark..."
                placeholderTextColor={Colors.textMuted}
                value={manualInput}
                onChangeText={setManualInput}
                onSubmitEditing={handleManualSubmit}
                returnKeyType="done"
              />
              {manualInput.length > 0 && (
                <TouchableOpacity onPress={handleManualSubmit} style={styles.submitPill}>
                  <Text style={styles.submitText}>Set</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Common regional areas */}
            <Text style={styles.suggestedTitle}>Suggested Nearby Areas</Text>
            <View style={styles.areasList}>
              {COMMON_AREAS.map((area) => (
                <TouchableOpacity
                  key={area.name}
                  onPress={() => handleSelectArea(area)}
                  style={styles.areaChip}
                >
                  <Ionicons name="location-outline" size={14} color={Colors.primary} />
                  <Text style={styles.areaChipText}>{area.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {deliveryConfig && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.infoText}>
                  QuickMart delivers within {deliveryConfig.deliveryRadiusKm} km of our {deliveryConfig.storeLocation.name}.
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '80%',
    ...Shadows.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  gpsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  gpsTextWrapper: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
  gpsSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: Typography.sizes.xs - 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
    marginHorizontal: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  submitPill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  submitText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  suggestedTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  areasList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    gap: 5,
  },
  areaChipText: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 6,
    marginTop: Spacing.xs,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
