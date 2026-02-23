import type { BusinessType, LoyaltyStatus } from './customers';

export const BUSINESS_TYPES: BusinessType[] = [
  'corporate',
  'individual',
  'wedding',
  'trading',
  'event',
];

export const LOYALTY_STATUSES = ['new', 'regular', 'vip'] as const;

export const BUSINESS_TYPE_I18N: Record<BusinessType, string> = {
  corporate: 'customers.corporate',
  individual: 'customers.individual',
  wedding: 'customers.wedding',
  trading: 'customers.trading',
  event: 'customers.event',
};

export const LOYALTY_I18N: Record<LoyaltyStatus, string> = {
  new: 'customers.loyaltyNew',
  regular: 'customers.loyaltyRegular',
  vip: 'customers.loyaltyVip',
};
