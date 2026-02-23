import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../theme/theme';
import type { OrderFile } from '../services/FileService';

interface ImageGalleryProps {
  images: OrderFile[];
  onDelete?: (id: string) => Promise<void>;
  onAdd?: () => void;
  editable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  headerTitle?: string;
}

const COLUMN_COUNT = 3;
const GRID_PADDING = 12;
const GRID_GAP = 4;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onDelete,
  onAdd,
  editable = false,
  refreshing = false,
  onRefresh,
  headerTitle,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [selectedImage, setSelectedImage] = useState<OrderFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const imageSize =
    (windowWidth - GRID_PADDING * 2 - GRID_GAP * (COLUMN_COUNT - 1)) /
    COLUMN_COUNT;

  const handleDeleteRequest = useCallback(() => {
    setConfirmingDelete(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setConfirmingDelete(false);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedImage || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(selectedImage.id);
      // Only close modal if delete succeeded (no throw)
      setSelectedImage(null);
      setConfirmingDelete(false);
    } catch {
      // Parent showed Snackbar and re-threw; modal stays open for retry
      setConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedImage, onDelete]);

  const handleClosePreview = useCallback(() => {
    setSelectedImage(null);
    setConfirmingDelete(false);
  }, []);

  const handleImageError = useCallback((imageId: string) => {
    setFailedImages((prev) => new Set(prev).add(imageId));
  }, []);

  const handleRetryImage = useCallback((imageId: string) => {
    setFailedImages((prev) => {
      const next = new Set(prev);
      next.delete(imageId);
      return next;
    });
  }, []);

  const handleGalleryRefresh = useCallback(() => {
    setFailedImages(new Set());
    onRefresh?.();
  }, [onRefresh]);

  const renderImage = useCallback(
    ({ item }: { item: OrderFile }) => {
      const isFailed = failedImages.has(item.id);

      return (
        <TouchableOpacity
          style={[styles.imageContainer, { width: imageSize, height: imageSize }]}
          onPress={() =>
            isFailed ? handleRetryImage(item.id) : setSelectedImage(item)
          }
          accessibilityLabel={
            isFailed
              ? `Coba muat ulang ${item.filename}`
              : `Foto ${item.filename}`
          }
          accessibilityRole="button"
        >
          {isFailed ? (
            <View style={[styles.thumbnail, styles.failedImage]}>
              <Icon
                source="image-broken-variant"
                size={24}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.failedText}>Ketuk untuk coba lagi</Text>
            </View>
          ) : (
            <Image
              source={{ uri: item.thumbnailUrl || item.url }}
              style={styles.thumbnail}
              resizeMode="cover"
              onError={() => handleImageError(item.id)}
            />
          )}
        </TouchableOpacity>
      );
    },
    [imageSize, failedImages, handleImageError, handleRetryImage],
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Icon
          source="camera-plus-outline"
          size={56}
          color={theme.colors.disabled}
        />
        <Text style={styles.emptyMessage}>Belum ada foto</Text>
        {editable && onAdd && (
          <TouchableOpacity style={styles.addButton} onPress={onAdd}>
            <Icon source="plus" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Tambah Foto</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [editable, onAdd],
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.header}>
        <Text style={styles.title}>
          {headerTitle || `Foto (${images.length})`}
        </Text>
        {editable && onAdd && images.length > 0 && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onAdd}
            accessibilityLabel="Tambah foto"
          >
            <Icon source="plus" size={16} color="#fff" />
            <Text style={styles.headerButtonText}>Tambah</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [headerTitle, images.length, editable, onAdd],
  );

  const previewMaxHeight = windowHeight * 0.6;

  return (
    <View style={styles.container}>
      <FlatList
        data={images}
        renderItem={renderImage}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh ? handleGalleryRefresh : undefined}
      />

      {/* Image Preview Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={isDeleting ? undefined : handleClosePreview}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={isDeleting ? undefined : handleClosePreview}
          />

          <View style={styles.modalContent}>
            {selectedImage && (
              <>
                <Image
                  source={{ uri: selectedImage.url }}
                  style={[
                    styles.fullImage,
                    { width: windowWidth, maxHeight: previewMaxHeight },
                  ]}
                  resizeMode="contain"
                />

                <View style={styles.imageInfo}>
                  <Text style={styles.imageName} numberOfLines={1}>
                    {selectedImage.filename}
                  </Text>
                  <Text style={styles.imageDetails}>
                    {formatFileSize(selectedImage.size)}
                    {selectedImage.uploadedAt
                      ? ` \u2022 ${formatDate(selectedImage.uploadedAt)}`
                      : ''}
                  </Text>
                </View>

                {confirmingDelete ? (
                  <View style={styles.confirmBar}>
                    <Text style={styles.confirmText}>
                      Yakin hapus foto ini?
                    </Text>
                    <View style={styles.confirmActions}>
                      <TouchableOpacity
                        style={styles.modalButton}
                        onPress={handleCancelDelete}
                        disabled={isDeleting}
                      >
                        <Text style={styles.modalButtonText}>Batal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.deleteButton]}
                        onPress={handleConfirmDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text
                            style={[
                              styles.modalButtonText,
                              styles.deleteButtonText,
                            ]}
                          >
                            Ya, Hapus
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={handleClosePreview}
                    >
                      <Text style={styles.modalButtonText}>Tutup</Text>
                    </TouchableOpacity>

                    {editable && onDelete && (
                      <TouchableOpacity
                        style={[styles.modalButton, styles.deleteButton]}
                        onPress={handleDeleteRequest}
                      >
                        <Text
                          style={[
                            styles.modalButtonText,
                            styles.deleteButtonText,
                          ]}
                        >
                          Hapus
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: GRID_PADDING,
    flexGrow: 1,
  },
  imageContainer: {
    padding: GRID_GAP / 2,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  failedImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  failedText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
  },
  fullImage: {
    alignSelf: 'center',
  },
  imageInfo: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  imageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  imageDetails: {
    fontSize: 14,
    color: '#ccc',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  confirmBar: {
    padding: 16,
    gap: 12,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#fff',
  },
});
