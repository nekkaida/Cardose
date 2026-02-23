import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';
import { theme } from '../theme/theme';

interface CameraCaptureProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
  allowGallery?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  visible,
  onClose,
  onCapture,
  allowGallery = true,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    // Wait for the initial permission check to complete (permission !== null)
    // before deciding whether to request. Also skip if canAskAgain is false
    // (user selected "Don't ask again") to avoid an infinite no-op loop.
    if (visible && permission !== null && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      setIsLoading(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (photo) {
        setPreviewUri(photo.uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Kesalahan', 'Gagal mengambil foto.');
    } finally {
      setIsLoading(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Izin Ditolak',
          'Kami membutuhkan akses galeri untuk memilih foto.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPreviewUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Kesalahan', 'Gagal memilih foto dari galeri.');
    }
  };

  const handleConfirm = () => {
    if (previewUri) {
      onCapture(previewUri);
      setPreviewUri(null);
      onClose();
    }
  };

  const handleRetake = () => {
    setPreviewUri(null);
  };

  const handleCancel = () => {
    setPreviewUri(null);
    onClose();
  };

  if (!visible) return null;

  // Still requesting permissions
  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Meminta izin kamera...</Text>
        </View>
      </Modal>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.centerContainer}>
          <Icon source="camera-off" size={48} color="#fff" />
          <Text style={styles.permissionText}>Tidak ada akses kamera</Text>
          <Text style={styles.permissionHint}>
            Aktifkan izin kamera di pengaturan perangkat Anda.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {previewUri ? (
          // Preview mode
          <View style={styles.previewContainer}>
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
            <View
              style={[
                styles.previewActions,
                { paddingBottom: Math.max(insets.bottom, 20) },
              ]}
            >
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleRetake}
              >
                <Icon source="camera-retake" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Ulangi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Icon source="check" size={20} color="#fff" />
                <Text
                  style={[styles.actionButtonText, styles.confirmButtonText]}
                >
                  Gunakan Foto
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Camera mode
          <>
            <CameraView
              style={styles.camera}
              facing={facing}
              ref={cameraRef}
            >
              <View
                style={[
                  styles.cameraTopBar,
                  { paddingTop: Math.max(insets.top, 16) },
                ]}
              >
                <TouchableOpacity
                  style={styles.flipButton}
                  onPress={() =>
                    setFacing((f) => (f === 'back' ? 'front' : 'back'))
                  }
                  accessibilityLabel="Putar kamera"
                >
                  <Icon source="camera-flip" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </CameraView>

            <View
              style={[
                styles.bottomControls,
                { paddingBottom: Math.max(insets.bottom, 20) },
              ]}
            >
              {allowGallery ? (
                <TouchableOpacity
                  style={styles.galleryButton}
                  onPress={pickFromGallery}
                  accessibilityLabel="Pilih dari galeri"
                >
                  <Icon source="image-multiple" size={20} color="#fff" />
                  <Text style={styles.galleryButtonText}>Galeri</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.placeholder} />
              )}

              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
                disabled={isLoading}
                accessibilityLabel="Ambil foto"
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <View style={styles.captureButtonInner} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                accessibilityLabel="Batal"
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    gap: 12,
    padding: 32,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  permissionHint: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  camera: {
    flex: 1,
  },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 50,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#000',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ddd',
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  galleryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  placeholder: {
    width: 80,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#000',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
  },
});
