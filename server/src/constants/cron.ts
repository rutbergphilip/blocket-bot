import type { BlocketQueryConfig } from 'blocket.js';
import { SettingRepository } from '@/db/repositories';
import { SettingKey } from '@/types/settings';

// Default configuration for Blocket queries used by watcher jobs
export const BLOCKET_QUERY = Object.freeze({
  limit: parseInt(
    SettingRepository.getValue(SettingKey.BLOCKET_QUERY_LIMIT) || '60',
  ),
  sort: SettingRepository.getValue(SettingKey.BLOCKET_QUERY_SORT) || 'rel',
  listingType:
    SettingRepository.getValue(SettingKey.BLOCKET_QUERY_LISTING_TYPE) || 's',
  status:
    SettingRepository.getValue(SettingKey.BLOCKET_QUERY_STATUS) || 'active',
  geolocation: parseInt(
    SettingRepository.getValue(SettingKey.BLOCKET_QUERY_GEOLOCATION) || '3',
  ),
  include:
    SettingRepository.getValue(SettingKey.BLOCKET_QUERY_INCLUDE) ||
    'extend_with_shipping',
}) as BlocketQueryConfig;

export const BLOCKET_MONITORING_CONFIG = Object.freeze({});
