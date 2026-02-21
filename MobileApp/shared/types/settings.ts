export interface SettingData {
  value: string;
  description: string | null;
}

export type SettingsMap = Record<string, SettingData>;

export interface SettingsListResponse {
  success: boolean;
  settings: SettingsMap;
}

export interface UpdateSettingPayload {
  value: string;
  description?: string;
}
