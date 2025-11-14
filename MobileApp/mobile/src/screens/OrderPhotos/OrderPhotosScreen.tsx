import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { CameraCapture } from '../../components/CameraCapture';
import { ImageGallery } from '../../components/ImageGallery';
import { useAuth } from '../../contexts/AuthContext';
import { FileService } from '../../services/FileService';
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
  const { token } = useAuth();
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileService = token ? new FileService(token) : null;

  useEffect(() => {
    loadOrderPhotos();
  }, [orderId]);

  const loadOrderPhotos = async () => {
    if (!fileService) return;

    try {
      setIsLoading(true);
      // In a real implementation, you'd fetch order-specific photos
      // For now, we'll get user files as an example
      const files = await fileService.getUserFiles(token!);
      setImages(files);
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapture = async (uri: string) => {
    if (!fileService) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    setIsUploading(true);
    try {
      // Extract filename from URI
      const filename = uri.split('/').pop() || `photo_${Date.now()}.jpg`;

      // Upload file
      const uploadedFile = await fileService.uploadFile(uri, filename);

      // Add to images list
      setImages((prev) => [uploadedFile, ...prev]);

      Alert.alert('Success', 'Photo uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!fileService) return;

    try {
      await fileService.deleteFile(imageId);

      // Remove from list
      setImages((prev) => prev.filter((img) => img.id !== imageId));

      Alert.alert('Success', 'Photo deleted');
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading photos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order #{orderNumber}</Text>
        <Text style={styles.subtitle}>Photo Gallery</Text>
      </View>

      {isUploading && (
        <View style={styles.uploadingBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.uploadingText}>Uploading photo...</Text>
        </View>
      )}

      <ImageGallery
        images={images}
        onDelete={handleDeleteImage}
        onAdd={() => setShowCamera(true)}
        editable={true}
      />

      <CameraCapture
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCapture}
        allowGallery={true}
      />
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
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  uploadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.primary,
    gap: 12,
  },
  uploadingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
