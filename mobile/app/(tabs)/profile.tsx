import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { api, API_BASE_URL } from '../../src/api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const updateUser = useAuthStore((state) => state.updateUser);

  // Edit Name Modal state
  const [editNameModal, setEditNameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Delete Account Modal state
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'confirm' | 'otp'>('confirm');
  const [deleteOtp, setDeleteOtp] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Pick and upload profile image
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Photos permission is required to upload a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setIsUploadingPhoto(true);
        const res = await api.upload<{ success: boolean; profilePhoto: string }>(
          '/profile/photo',
          result.assets[0].uri,
          'photo'
        );
        if (res.success && res.profilePhoto) {
          await updateUser({ profilePhoto: res.profilePhoto });
        }
        setIsUploadingPhoto(false);
      }
    } catch (err: any) {
      setIsUploadingPhoto(false);
      Alert.alert('Upload Error', err.message || 'Could not upload photo');
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setIsUpdatingName(true);
    try {
      const res = await api.patch<{ success: boolean; user: any }>('/profile', {
        name: newName.trim(),
      });
      if (res.success && res.user) {
        await updateUser({ name: res.user.name });
        setEditNameModal(false);
      }
    } catch (err: any) {
      Alert.alert('Update Failed', err.message);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of QuickMart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  // Step 1: Request Delete Account OTP
  const handleRequestDeleteOtp = async () => {
    setIsDeleting(true);
    try {
      const res = await api.post<{ success: boolean; devOtp?: string }>(
        '/profile/delete-account/request-otp'
      );
      if (res.success) {
        setDeleteStep('otp');
        if (res.devOtp) {
          Alert.alert('Dev OTP', `Development verification code: ${res.devOtp}`);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Step 2: Confirm Delete Account OTP
  const handleConfirmDelete = async () => {
    if (deleteOtp.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code sent to your phone.');
      return;
    }
    setIsDeleting(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        '/profile/delete-account/confirm',
        { otp: deleteOtp }
      );
      if (res.success) {
        Alert.alert('Account Deleted', res.message);
        setDeleteModal(false);
        await logout();
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'QM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const photoFullUrl = user?.profilePhoto
    ? user.profilePhoto.startsWith('http')
      ? user.profilePhoto
      : `${API_BASE_URL.replace('/api', '')}${user.profilePhoto}`
    : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Account</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        {isAuthenticated && user ? (
          <View style={styles.userCard}>
            <TouchableOpacity
              onPress={handlePickImage}
              activeOpacity={0.8}
              style={styles.avatarWrapper}
            >
              {photoFullUrl ? (
                <Image source={{ uri: photoFullUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.initialsAvatar}>
                  <Text style={styles.initialsText}>{getInitials(user.name)}</Text>
                </View>
              )}
              <View style={styles.cameraPill}>
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Ionicons name="camera" size={12} color={Colors.textInverse} />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.userInfoCol}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{user.name || 'QuickMart Customer'}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setNewName(user.name || '');
                    setEditNameModal(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pencil" size={16} color={Colors.primaryDark} />
                </TouchableOpacity>
              </View>
              <Text style={styles.userMobile}>+91 {user.mobile}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.guestCard}>
            <View style={styles.guestIconCircle}>
              <Ionicons name="person" size={28} color={Colors.primaryDark} />
            </View>
            <View style={styles.guestTextCol}>
              <Text style={styles.guestTitle}>Welcome to QuickMart</Text>
              <Text style={styles.guestDesc}>
                Log in or create an account to view your past orders and saved delivery addresses.
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/auth')}
              style={styles.loginPill}
            >
              <Text style={styles.loginPillText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Options List */}
        <View style={styles.menuCard}>
          {isAuthenticated && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/orders')}
              style={styles.menuItem}
            >
              <View style={[styles.menuIconWrapper, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="receipt-outline" size={18} color="#0284C7" />
              </View>
              <Text style={styles.menuItemText}>My Orders</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/legal/about')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconWrapper, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="information-circle-outline" size={18} color="#9333EA" />
            </View>
            <Text style={styles.menuItemText}>About QuickMart</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/legal/privacy')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconWrapper, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="shield-outline" size={18} color={Colors.primaryDark} />
            </View>
            <Text style={styles.menuItemText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/legal/terms')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconWrapper, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="document-text-outline" size={18} color="#D97706" />
            </View>
            <Text style={styles.menuItemText}>Terms & Conditions</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {isAuthenticated && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setDeleteStep('confirm');
                setDeleteOtp('');
                setDeleteModal(true);
              }}
              style={styles.menuItem}
            >
              <View style={[styles.menuIconWrapper, { backgroundColor: Colors.dangerLight }]}>
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </View>
              <Text style={[styles.menuItemText, { color: Colors.danger }]}>Delete Account</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Logout Button */}
        {isAuthenticated && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        )}

        {/* App Version Info */}
        <View style={styles.appVersionContainer}>
          <Text style={styles.appVersionText}>QuickMart Hyperlocal v1.0.0 (Production Release)</Text>
          <Text style={styles.appVersionSub}>Crafted for rural and semi-urban hyper-commerce</Text>
        </View>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={editNameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Profile Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setEditNameModal(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveName}
                disabled={isUpdatingName}
                style={styles.modalSaveButton}
              >
                {isUpdatingName ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal (with OTP Verification) */}
      <Modal visible={deleteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {deleteStep === 'confirm' ? (
              <>
                <View style={styles.deleteWarningIcon}>
                  <Ionicons name="warning-outline" size={32} color={Colors.danger} />
                </View>
                <Text style={styles.modalTitle}>Delete Your Account?</Text>
                <Text style={styles.modalDesc}>
                  This action is permanent. All your saved addresses and personal details will be deleted and your active session will be revoked. An SMS OTP will be sent to your mobile number to confirm your identity.
                </Text>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    onPress={() => setDeleteModal(false)}
                    style={styles.modalCancelButton}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleRequestDeleteOtp}
                    disabled={isDeleting}
                    style={[styles.modalSaveButton, { backgroundColor: Colors.danger }]}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={Colors.textInverse} />
                    ) : (
                      <Text style={styles.modalSaveText}>Send Code</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Confirm Account Deletion</Text>
                <Text style={styles.modalDesc}>
                  Enter the 6-digit verification code sent to +91 {user?.mobile}
                </Text>

                <TextInput
                  style={[styles.modalInput, { textAlign: 'center', letterSpacing: 8, fontSize: 20 }]}
                  value={deleteOtp}
                  onChangeText={setDeleteOtp}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    onPress={() => setDeleteModal(false)}
                    style={styles.modalCancelButton}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirmDelete}
                    disabled={isDeleting}
                    style={[styles.modalSaveButton, { backgroundColor: Colors.danger }]}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={Colors.textInverse} />
                    ) : (
                      <Text style={styles.modalSaveText}>Verify & Delete</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...Shadows.subtle,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceSubtle,
  },
  initialsAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
  cameraPill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.primaryDark,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  userInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  userMobile: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  guestCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    textAlign: 'center',
    ...Shadows.subtle,
  },
  guestIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  guestTextCol: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  guestTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  guestDesc: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
  },
  loginPill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  loginPillText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.subtle,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  menuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuItemText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  logoutButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.danger,
  },
  appVersionContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  appVersionText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
  },
  appVersionSub: {
    fontSize: Typography.sizes.xs - 1,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
    ...Shadows.floating,
  },
  deleteWarningIcon: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  modalInput: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    fontSize: Typography.sizes.base,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontWeight: Typography.weights.semibold,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  modalSaveText: {
    color: Colors.textInverse,
    fontWeight: Typography.weights.bold,
  },
});
