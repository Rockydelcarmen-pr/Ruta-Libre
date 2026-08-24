import { createDevice } from "./api";

const STORAGE_KEY = "rl_device_token";

/** Anonymous per-device token, minted once and cached in localStorage. */
export async function getDeviceToken(): Promise<string> {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) return cached;
  const { device_token } = await createDevice();
  localStorage.setItem(STORAGE_KEY, device_token);
  return device_token;
}
