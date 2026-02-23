/**
 * Navigation type definitions.
 *
 * Single source of truth for all route param lists used by
 * React Navigation across the app.
 */

export type RootStackParamList = {
  Main: undefined;
  OrderPhotos: { orderId: string; orderNumber: string };
  QualityCheck: { orderId: string };
};

export type MainTabParamList = {
  Orders: undefined;
  Profile: undefined;
};
