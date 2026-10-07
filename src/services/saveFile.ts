/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared file saving and export service.
 * Supports both web browser downloads (AI Studio preview) and
 * native Android/Capacitor file share/saving via Filesystem + Share plugins.
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface SaveFileResult {
  success: boolean;
  method?: 'native-share' | 'browser-download';
  error?: string;
  path?: string;
}

/**
 * Converts a Blob or UTF-8 string to a base64 encoded string.
 */
async function toBase64(data: Blob | string, mimeType: string): Promise<string> {
  const blob = typeof data === 'string' ? new Blob([data], { type: mimeType }) : data;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const commaIndex = result.indexOf(',');
        resolve(commaIndex !== -1 ? result.slice(commaIndex + 1) : result);
      } else {
        reject(new Error('Failed to read data as base64 string'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Saves or shares a file.
 * - On native platforms (Android Capacitor): writes to app Cache directory,
 *   obtains file URI, and opens system Share sheet (to Save to Downloads, Drive, etc.).
 * - On web platforms: creates Blob URL and triggers standard browser download.
 *
 * Never fails silently; returns clear success/error status.
 */
export async function saveFile(
  fileName: string,
  data: Blob | string,
  mimeType = 'application/octet-stream'
): Promise<SaveFileResult> {
  try {
    if (Capacitor.isNativePlatform()) {
      const base64Data = await toBase64(data, mimeType);

      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      const uri = writeResult.uri;

      await Share.share({
        title: fileName,
        url: uri,
        dialogTitle: 'Save or share',
      });

      return {
        success: true,
        method: 'native-share',
        path: uri,
      };
    } else {
      // Browser environment
      const blob = typeof data === 'string' ? new Blob([data], { type: mimeType }) : data;
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      setTimeout(() => {
        try {
          URL.revokeObjectURL(downloadUrl);
        } catch {
          // ignore cleanup error
        }
      }, 1500);

      return {
        success: true,
        method: 'browser-download',
      };
    }
  } catch (err: any) {
    console.error(`saveFile failed for "${fileName}":`, err);
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}
