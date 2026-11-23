import { env } from '../../config/env.js';
import { localAuth } from './authLocal.js';
import { supabaseAuth } from './authSupabase.js';
import { localStorageDriver, supabaseStorageDriver } from './storage.js';
import { logPush, fcmPush } from './push.js';

// Các dịch vụ bên ngoài, chọn theo biến môi trường. Test thay bằng bản giả qua setGateways().
const gateways = {
  auth: env.AUTH_DRIVER === 'supabase' ? supabaseAuth : localAuth,
  storage: env.STORAGE_DRIVER === 'supabase' ? supabaseStorageDriver : localStorageDriver,
  push: env.PUSH_DRIVER === 'fcm' ? fcmPush : logPush,
};

export const auth = () => gateways.auth;
export const storage = () => gateways.storage;
export const push = () => gateways.push;

export function setGateways(overrides) {
  Object.assign(gateways, overrides);
}
