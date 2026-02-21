import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import {
  useOrderApi,
  useCustomerApi,
  useInventoryApi,
  useFinancialApi,
  useAnalyticsApi,
  useProductionApi,
  useReportsApi,
  useUserApi,
  useSettingsApi,
  useDashboardApi,
} from '../hooks/api';

// Derive the ApiContextType from the aggregated hook return values
type ApiContextType = ReturnType<typeof useOrderApi> &
  ReturnType<typeof useCustomerApi> &
  ReturnType<typeof useInventoryApi> &
  ReturnType<typeof useFinancialApi> &
  ReturnType<typeof useAnalyticsApi> &
  ReturnType<typeof useProductionApi> &
  ReturnType<typeof useReportsApi> &
  ReturnType<typeof useUserApi> &
  ReturnType<typeof useSettingsApi> &
  ReturnType<typeof useDashboardApi>;

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const useApi = () => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

interface ApiProviderProps {
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const orderApi = useOrderApi();
  const customerApi = useCustomerApi();
  const inventoryApi = useInventoryApi();
  const financialApi = useFinancialApi();
  const analyticsApi = useAnalyticsApi();
  const productionApi = useProductionApi();
  const reportsApi = useReportsApi();
  const userApi = useUserApi();
  const settingsApi = useSettingsApi();
  const dashboardApi = useDashboardApi();

  const value = useMemo<ApiContextType>(
    () => ({
      ...orderApi,
      ...customerApi,
      ...inventoryApi,
      ...financialApi,
      ...analyticsApi,
      ...productionApi,
      ...reportsApi,
      ...userApi,
      ...settingsApi,
      ...dashboardApi,
    }),
    [
      orderApi,
      customerApi,
      inventoryApi,
      financialApi,
      analyticsApi,
      productionApi,
      reportsApi,
      userApi,
      settingsApi,
      dashboardApi,
    ]
  );

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};
