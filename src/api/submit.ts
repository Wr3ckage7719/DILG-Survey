import type { FormData } from '../types';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

export async function submitSurvey(data: FormData): Promise<boolean> {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    // no-cors mode means we can't read response body
    return true;
  } catch (e) {
    console.error('Submit failed:', e);
    return false;
  }
}
