import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Snackbar } from 'react-native-paper';
import { CameraCapture } from '../../components/CameraCapture';
import { ImageGallery } from '../../components/ImageGallery';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectToken, forceLogout } from '../../store/slices/authSlice';
import { FileService, FileServiceError } from '../../services/FileService';
import type { OrderFile } from '../../services/FileService';
import { theme } from '../../theme/theme';

interface OrderPhotosScreenProps {
  route: {
    params: {
      orderId: string;
      orderNumber: string;
    };
  };
}

export default function OrderPhotosScreen({ route }: OrderPhotosScreenProps) {
  const { orderId, orderNumber } = route.params;
  const token = useAppSelector(selectToken);
  const dispatch = useAppDispatch();

  const [images, setImages] = useState<OrderFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // Snackbar state
  const [snackMessage, setSnackMessage] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackIsError, setSnackIsError] = useState(false);

  // Unmount guard to prevent state updates after navigation
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Stable FileService instance that updates when token changes
  const handleUnauthorized = useCallback(() => {
    dispatch(forceLogout());
  }, [dispatch]);

  const fileService = useMemo(() => {
    if (!token) return null;
    return new FileService(token, handleUnauthorized);
  }, [token, handleUnauthorized]);

  // Prevent stale closure in callbacks
  const fileServiceRef = useRef(fileService);
  fileServiceRef.current = fileService;

  const showSnack = useCallback((message: string, isError = false) => {
    if (!isMountedRef.current) return;
    setSnackMessage(message);
    setSnackIsError(isError);
    setSnackVisible(true);
  }, []);

  // Shared fetch logic for initial load and pull-to-refresh
  const fetchPhotos = useCallback(async () => {
    const svc = fileServiceRef.current;
    if (!svc) return;

    const files = await svc.getOrderFiles(orderId);
    if (isMountedRef.current) {
      setImages(files);
    }
  }, [orderId]);

  const loadOrderPhotos = useCallback(async () => {
    if (isMountedRef.current) setIsLoading(true);
    try {
      await fetchPhotos();
    } catch (error) {
      if (error instanceof FileServiceError && error.isAuthError) return;
      showSnack('Gagal memuat foto pesanan.', true);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [fetchPhotos, showSnack]);

  const handleRefresh = useCallback(async () => {
    if (isMountedRef.current) setIsRefreshing(true);
    try {
      await fetchPhotos();
    } catch (error) {
      if (error instanceof FileServiceError && error.isAuthError) return;
      showSnack('Gagal memuat ulang foto.', true);
    } finally {
      if (isMountedRef.current) setIsRefreshing(false);
    }
  }, [fetchPhotos, showSnack]);

  useEffect(() => {
    loadOrderPhotos();
  }, [loadOrderPhotos]);

  const handleCapture = useCallback(
    async (uri: string) => {
      const svc = fileServiceRef.current;
      if (!svc) {
        showSnack('Tidak terautentikasi. Silakan login ulang.', true);
        return;
      }

      if (isMountedRef.current) {
        setIsUploading(true);
        setUploadProgress(0);
      }

      try {
        const filename = uri.split('/').pop() || `foto_${Date.now()}.jpg`;

        const uploadedFile = await svc.uploadOrderFile(
          uri,
          filename,
          orderId,
          (progress) => {
            if (isMountedRef.current) setUploadProgress(progress);
          },
        );

        if (isMountedRef.current) {
          const newImage: OrderFile = {
            id: uploadedFile.id,
            filename: uploadedFile.filename,
            url: uploadedFile.url,
            thumbnailUrl: uploadedFile.thumbnailUrl ?? undefined,
            size: uploadedFile.size,
            uploadedAt: uploadedFile.uploadedAt || '',
          };
          setImages((prev) => [newImage, ...prev]);
          showSnack('Foto berhasil diunggah.');
        }
      } catch (error) {
        if (error instanceof FileServiceError) {
          if (error.isAuthError) return;
          showSnack(error.message, true);
        } else {
          showSnack('Gagal mengunggah foto.', true);
        }
      } finally {
        if (isMountedRef.current) {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
    },
    [orderId, showSnack],
  );

  const handleDeleteImage = useCallback(
    async (imageId: string) => {
      const svc = fileServiceRef.current;
      if (!svc) return;

      try {
        await svc.deleteFile(imageId);
        if (isMountedRef.current) {
          setImages((prev) => prev.filter((img) => img.id !== imageId));
          showSnack('Foto berhasil dihapus.');
        }
      } catch (error) {
        if (error instanceof FileServiceError) {
          if (error.isAuthError) return;
          showSnack(error.message, true);
        } else {
          showSnack('Gagal menghapus foto.', true);
        }
        throw error; // Re-throw so ImageGallery keeps modal open for retry
      }
    },
    [showSnack],
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Memuat foto...</Text>
      </View>
    );
  }

  const progressPercent = Math.round(uploadProgress * 100);

  return (
    <View style={styles.container}>
      {isUploading && (
        <View style={styles.uploadingBanner}>
          <ActivityIndicator size="small" color={theme.colors.surface} />
          <Text style={styles.uploadingText}>
            Mengunggah foto...{progressPercent > 0 ? ` ${progressPercent}%` : ''}
          </Text>
          {progressPercent > 0 && (
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          )}
        </View>
      )}

      <ImageGallery
        images={images}
        onDelete={handleDeleteImage}
        onAdd={() => setShowCamera(true)}
        editable={true}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        headerTitle={`Foto Pesanan #${orderNumber}`}
      />

      <CameraCapture
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCapture}
        allowGallery={true}
      />

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={3000}
        style={snackIsError ? styles.snackError : styles.snackSuccess}
      >
        {snackMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  uploadingBanner: {
    padding: 12,
    backgroundColor: theme.colors.primary,
    gap: 6,
  },
  uploadingText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 2,
  },
  snackSuccess: {
    backgroundColor: theme.colors.success,
  },
  snackError: {
    backgroundColor: theme.colors.error,
  },
});
