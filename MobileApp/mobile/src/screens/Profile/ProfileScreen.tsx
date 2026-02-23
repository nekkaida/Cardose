import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Pressable,
  BackHandler,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  selectUser,
  logout,
  updateProfile,
  changePassword,
  refreshUser,
} from '../../store/slices/authSlice';
import { theme } from '../../theme/theme';
import { VALIDATION, REGEX_PATTERNS, APP_INFO } from '../../constants';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// ── Constants ──────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner: 'Pemilik',
  manager: 'Manajer',
  employee: 'Karyawan',
};

const REFRESH_STALE_MS = 60_000; // skip refresh if last one was <60 s ago

// ── Component ──────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();

  // Separate loading states for independent operations
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);

  // Profile form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Password form fields
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Inline validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Input refs for keyboard navigation
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Staleness tracking
  const lastRefreshedRef = useRef<number>(0);

  // ── Form sync ────────────────────────────────────────────────────────

  const syncFormWithUser = useCallback(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    syncFormWithUser();
  }, [syncFormWithUser]);

  // ── Refresh on focus with staleness check ─────────────────────────────

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastRefreshedRef.current > REFRESH_STALE_MS) {
        dispatch(refreshUser());
        lastRefreshedRef.current = now;
      }
    }, [dispatch]),
  );

  // ── Dirty-state detection ────────────────────────────────────────────

  const isProfileDirty =
    fullName.trim() !== (user?.fullName || '') ||
    email.trim() !== (user?.email || '') ||
    phone.trim() !== (user?.phone || '');

  const hasPasswordContent =
    currentPassword !== '' || newPassword !== '' || confirmPassword !== '';
  const hasUnsavedChanges =
    (isEditing && isProfileDirty) ||
    (showPasswordChange && hasPasswordContent);

  // ── Android back-button guard ────────────────────────────────────────

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const onBackPress = () => {
      Alert.alert(
        'Perubahan Belum Disimpan',
        'Anda memiliki perubahan yang belum disimpan. Buang perubahan?',
        [
          { text: 'Tetap di Sini', style: 'cancel' },
          {
            text: 'Buang',
            style: 'destructive',
            onPress: () => {
              setIsEditing(false);
              setShowPasswordChange(false);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setErrors({});
              syncFormWithUser();
            },
          },
        ],
      );
      return true; // prevent default back behaviour
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );
    return () => subscription.remove();
  }, [hasUnsavedChanges, syncFormWithUser]);

  // ── Validation ───────────────────────────────────────────────────────

  const validateProfile = (): boolean => {
    const newErrors: Record<string, string> = {};
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      newErrors.fullName = 'Nama lengkap wajib diisi';
    } else if (trimmedName.length < VALIDATION.MIN_NAME_LENGTH) {
      newErrors.fullName = `Minimal ${VALIDATION.MIN_NAME_LENGTH} karakter`;
    } else if (trimmedName.length > VALIDATION.MAX_NAME_LENGTH) {
      newErrors.fullName = `Maksimal ${VALIDATION.MAX_NAME_LENGTH} karakter`;
    }

    if (!trimmedEmail) {
      newErrors.email = 'Email wajib diisi';
    } else if (!REGEX_PATTERNS.EMAIL.test(trimmedEmail)) {
      newErrors.email = 'Masukkan alamat email yang valid';
    }

    if (trimmedPhone && !REGEX_PATTERNS.PHONE_INDONESIA.test(trimmedPhone)) {
      newErrors.phone =
        'Nomor telepon tidak valid (contoh: 08xx atau +62xx)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordFields = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Password saat ini wajib diisi';
    }

    if (!newPassword) {
      newErrors.newPassword = 'Password baru wajib diisi';
    } else if (newPassword.length < VALIDATION.MIN_PASSWORD_LENGTH) {
      newErrors.newPassword = `Minimal ${VALIDATION.MIN_PASSWORD_LENGTH} karakter`;
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = 'Harus mengandung huruf besar';
    } else if (!/[a-z]/.test(newPassword)) {
      newErrors.newPassword = 'Harus mengandung huruf kecil';
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword = 'Harus mengandung angka';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Konfirmasi password baru';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Password tidak cocok';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await dispatch(refreshUser()).unwrap();
      lastRefreshedRef.current = Date.now();
    } catch {
      // Silently fail; stale data is acceptable on pull-to-refresh failure
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch]);

  const handleEditPress = () => {
    setErrors({});
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrors({});
    syncFormWithUser();
  };

  const doSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await dispatch(
        updateProfile({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      ).unwrap();

      // Confirm with server for data integrity
      try {
        await dispatch(refreshUser()).unwrap();
        lastRefreshedRef.current = Date.now();
      } catch {
        // Optimistic data is acceptable if refresh fails
      }

      setIsEditing(false);
      setErrors({});
      Alert.alert('Berhasil', 'Profil berhasil diperbarui');
    } catch (error: any) {
      Alert.alert(
        'Gagal Memperbarui',
        typeof error === 'string'
          ? error
          : 'Gagal memperbarui profil. Silakan coba lagi.',
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;

    // Nothing actually changed — just exit edit mode
    if (!isProfileDirty) {
      setIsEditing(false);
      setErrors({});
      return;
    }

    // Email changed — confirm with the user first
    const emailChanged = email.trim() !== (user?.email || '');
    if (emailChanged) {
      Alert.alert(
        'Konfirmasi Perubahan Email',
        'Mengubah email akan mempengaruhi pemulihan akun. Lanjutkan?',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Lanjutkan', onPress: doSaveProfile },
        ],
      );
      return;
    }

    await doSaveProfile();
  };

  const handleCancelPasswordChange = () => {
    setShowPasswordChange(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
  };

  const handleChangePassword = async () => {
    if (!validatePasswordFields()) return;

    setIsChangingPassword(true);
    try {
      await dispatch(
        changePassword({ currentPassword, newPassword }),
      ).unwrap();

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
      setErrors({});
      Alert.alert('Berhasil', 'Password berhasil diubah');
    } catch (error: any) {
      Alert.alert(
        'Gagal Mengubah Password',
        typeof error === 'string'
          ? error
          : 'Gagal mengubah password. Silakan coba lagi.',
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          try {
            await dispatch(logout()).unwrap();
          } catch {
            Alert.alert('Gagal', 'Gagal keluar. Silakan coba lagi.');
          }
        },
      },
    ]);
  };

  // ── Derived values ───────────────────────────────────────────────────

  const displayName = user?.fullName || 'Pengguna';
  const userInitial = displayName.charAt(0).toUpperCase();
  const roleLabel = ROLE_LABELS[user?.role || ''] || user?.role || '';
  const memberSince = (() => {
    if (!user?.createdAt) return null;
    try {
      return format(new Date(user.createdAt), 'MMMM yyyy', {
        locale: idLocale,
      });
    } catch {
      return null;
    }
  })();

  // ── Render helpers ───────────────────────────────────────────────────

  const renderFieldError = (field: string) => {
    if (!errors[field]) return null;
    return (
      <Text style={styles.errorText} accessibilityRole="alert">
        {errors[field]}
      </Text>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header / Avatar */}
        <View style={styles.header} accessibilityRole="header">
          <View
            style={styles.avatarContainer}
            accessibilityLabel={`Foto profil ${displayName}`}
          >
            <Text style={styles.avatarText}>{userInitial}</Text>
          </View>
          <Text style={styles.name} accessibilityRole="text">
            {displayName}
          </Text>
          <Text style={styles.username} accessibilityRole="text">
            @{user?.username}
          </Text>
          <View
            style={styles.roleBadge}
            accessibilityRole="text"
            accessibilityLabel={`Peran: ${roleLabel}`}
          >
            <Text style={styles.roleText}>{roleLabel.toUpperCase()}</Text>
          </View>
          {memberSince && (
            <Text style={styles.memberSince} accessibilityRole="text">
              Anggota sejak {memberSince}
            </Text>
          )}
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informasi Akun</Text>
            {!isEditing && (
              <Pressable
                onPress={handleEditPress}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Edit profil"
              >
                {({ pressed }) => (
                  <Text
                    style={[
                      styles.editButton,
                      pressed && styles.textPressed,
                    ]}
                  >
                    Edit
                  </Text>
                )}
              </Pressable>
            )}
          </View>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nama Lengkap</Text>
            {isEditing ? (
              <>
                <TextInput
                  style={[
                    styles.input,
                    errors.fullName && styles.inputError,
                  ]}
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    if (errors.fullName)
                      setErrors((e) => ({ ...e, fullName: '' }));
                  }}
                  placeholder="Masukkan nama lengkap"
                  placeholderTextColor={theme.colors.placeholder}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  blurOnSubmit={false}
                  autoCorrect={false}
                  accessibilityLabel="Nama lengkap"
                  accessibilityHint="Masukkan nama lengkap Anda"
                />
                {renderFieldError('fullName')}
              </>
            ) : (
              <Text style={styles.value}>{user?.fullName}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            {isEditing ? (
              <>
                <TextInput
                  ref={emailRef}
                  style={[styles.input, errors.email && styles.inputError]}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email)
                      setErrors((e) => ({ ...e, email: '' }));
                  }}
                  placeholder="Masukkan email"
                  placeholderTextColor={theme.colors.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  blurOnSubmit={false}
                  accessibilityLabel="Alamat email"
                  accessibilityHint="Masukkan alamat email Anda"
                />
                {renderFieldError('email')}
              </>
            ) : (
              <Text style={styles.value}>{user?.email}</Text>
            )}
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Telepon</Text>
            {isEditing ? (
              <>
                <TextInput
                  ref={phoneRef}
                  style={[styles.input, errors.phone && styles.inputError]}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (errors.phone)
                      setErrors((e) => ({ ...e, phone: '' }));
                  }}
                  placeholder="contoh: 08123456789"
                  placeholderTextColor={theme.colors.placeholder}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  accessibilityLabel="Nomor telepon"
                  accessibilityHint="Masukkan nomor telepon Indonesia Anda"
                />
                {renderFieldError('phone')}
              </>
            ) : (
              <Text style={styles.value}>
                {user?.phone || 'Belum diatur'}
              </Text>
            )}
          </View>

          {/* Edit action buttons */}
          {isEditing && (
            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.cancelButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleCancelEdit}
                disabled={isSavingProfile}
                accessibilityRole="button"
                accessibilityLabel="Batalkan perubahan"
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.saveButton,
                  pressed && styles.saveButtonPressed,
                  isSavingProfile && styles.buttonDisabled,
                ]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
                accessibilityRole="button"
                accessibilityLabel="Simpan perubahan profil"
              >
                {isSavingProfile ? (
                  <ActivityIndicator
                    color={theme.colors.surface}
                    size="small"
                    accessibilityLabel="Menyimpan profil"
                  />
                ) : (
                  <Text style={styles.saveButtonText}>Simpan</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Keamanan</Text>

          {!showPasswordChange ? (
            <Pressable
              style={({ pressed }) => [
                styles.changePasswordButton,
                pressed && styles.changePasswordPressed,
              ]}
              onPress={() => {
                setShowPasswordChange(true);
                setErrors({});
              }}
              accessibilityRole="button"
              accessibilityLabel="Ubah password"
            >
              <Text style={styles.changePasswordButtonText}>
                Ubah Password
              </Text>
            </Pressable>
          ) : (
            <>
              {/* Current Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password Saat Ini</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.currentPassword && styles.inputError,
                  ]}
                  value={currentPassword}
                  onChangeText={(text) => {
                    setCurrentPassword(text);
                    if (errors.currentPassword)
                      setErrors((e) => ({ ...e, currentPassword: '' }));
                  }}
                  placeholder="Masukkan password saat ini"
                  placeholderTextColor={theme.colors.placeholder}
                  secureTextEntry
                  returnKeyType="next"
                  onSubmitEditing={() => newPasswordRef.current?.focus()}
                  blurOnSubmit={false}
                  accessibilityLabel="Password saat ini"
                />
                {renderFieldError('currentPassword')}
              </View>

              {/* New Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password Baru</Text>
                <TextInput
                  ref={newPasswordRef}
                  style={[
                    styles.input,
                    errors.newPassword && styles.inputError,
                  ]}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (errors.newPassword)
                      setErrors((e) => ({ ...e, newPassword: '' }));
                  }}
                  placeholder="Min 8 karakter, huruf besar + kecil + angka"
                  placeholderTextColor={theme.colors.placeholder}
                  secureTextEntry
                  returnKeyType="next"
                  onSubmitEditing={() =>
                    confirmPasswordRef.current?.focus()
                  }
                  blurOnSubmit={false}
                  accessibilityLabel="Password baru"
                  accessibilityHint="Minimal 8 karakter dengan huruf besar, huruf kecil, dan angka"
                />
                {renderFieldError('newPassword')}
              </View>

              {/* Confirm Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Konfirmasi Password Baru</Text>
                <TextInput
                  ref={confirmPasswordRef}
                  style={[
                    styles.input,
                    errors.confirmPassword && styles.inputError,
                  ]}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword)
                      setErrors((e) => ({ ...e, confirmPassword: '' }));
                  }}
                  placeholder="Ulangi password baru"
                  placeholderTextColor={theme.colors.placeholder}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleChangePassword}
                  accessibilityLabel="Konfirmasi password baru"
                />
                {renderFieldError('confirmPassword')}
              </View>

              {/* Password action buttons */}
              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.cancelButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleCancelPasswordChange}
                  disabled={isChangingPassword}
                  accessibilityRole="button"
                  accessibilityLabel="Batalkan ubah password"
                >
                  <Text style={styles.cancelButtonText}>Batal</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.saveButton,
                    pressed && styles.saveButtonPressed,
                    isChangingPassword && styles.buttonDisabled,
                  ]}
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                  accessibilityRole="button"
                  accessibilityLabel="Perbarui password"
                >
                  {isChangingPassword ? (
                    <ActivityIndicator
                      color={theme.colors.surface}
                      size="small"
                      accessibilityLabel="Mengubah password"
                    />
                  ) : (
                    <Text style={styles.saveButtonText}>Perbarui</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
            ]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Keluar dari akun Anda"
          >
            <Text style={styles.logoutButtonText}>Keluar</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText} accessibilityRole="text">
            {APP_INFO.NAME} v{APP_INFO.VERSION}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: theme.colors.surface,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.surface,
  },
  memberSince: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  section: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  editButton: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  textPressed: {
    opacity: 0.6,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.borderDark,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  inputError: {
    borderColor: theme.colors.error,
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.error,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  changePasswordButton: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  changePasswordPressed: {
    backgroundColor: theme.colors.backgroundVariant,
  },
  changePasswordButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    padding: 16,
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
