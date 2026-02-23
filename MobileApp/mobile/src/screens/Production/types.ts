import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * Navigation param list for the root stack.
 * Defined here until the app has a centralized navigation types file.
 */
export type RootStackParamList = {
  Main: undefined;
  OrderPhotos: { orderId: string };
  QualityCheck: { orderId: string };
};

export type QualityCheckScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'QualityCheck'
>;

/** The three possible outcomes of a quality check. */
export type QCStatus = 'passed' | 'needs_review' | 'failed';

export interface ChecklistItem {
  id: string;
  name: string;
  checked: boolean;
  notes?: string;
}

export interface QualityCheck {
  id: string;
  order_id: string;
  checklist_items: ChecklistItem[];
  overall_status: QCStatus;
  notes?: string;
  checked_by_name?: string;
  checked_at: string;
}

/** Payload sent to POST /api/quality-checks */
export interface QualityCheckPayload {
  order_id: string;
  checklist_items: ChecklistItem[];
  overall_status: QCStatus;
  notes?: string;
  checked_by?: string;
}
