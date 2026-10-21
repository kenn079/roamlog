/**
 * Google Drive REST API & OAuth Client for RoamLog
 * Interacts with user's private Google Drive appDataFolder (zero 3rd-party database dependency).
 */

import type { BackupPayload, GoogleAuthInfo, SyncManifest } from '../../src/shared/types';

export const DRIVE_APPDATA_FILE_NAME = 'roamlog_data.json';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; expires_in?: number; error?: string }) => void;
            error_callback?: (err: unknown) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export interface RemoteSyncFileContent {
  manifest: SyncManifest;
  data: BackupPayload;
}

export class GoogleDriveClient {
  private tokenClient: any = null;
  private pendingAuthResolver: ((value: GoogleAuthInfo | PromiseLike<GoogleAuthInfo>) => void) | null = null;
  private pendingAuthRejecter: ((reason?: any) => void) | null = null;

  /**
   * Initializes the Google Identity Services (GIS) Token Client.
   */
  async initGoogleAuth(clientId: string, onTokenCallback?: (token: GoogleAuthInfo) => void): Promise<void> {
    if (typeof window === 'undefined') return;

    // Load GIS script if not present
    if (!window.google?.accounts?.oauth2) {
      await new Promise<void>((resolve, reject) => {
        const scriptId = 'google-gis-sdk';
        if (document.getElementById(scriptId)) {
          // Wait for script to finish loading
          const checkTimer = setInterval(() => {
            if (window.google?.accounts?.oauth2) {
              clearInterval(checkTimer);
              resolve();
            }
          }, 100);
          return;
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google GIS SDK'));
        document.head.appendChild(script);
      });
    }

    if (window.google?.accounts?.oauth2) {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        callback: async (resp) => {
          if (resp.error || !resp.access_token) {
            if (this.pendingAuthRejecter) {
              this.pendingAuthRejecter(new Error(resp.error || 'Token acquisition failed'));
              this.pendingAuthRejecter = null;
              this.pendingAuthResolver = null;
            }
            return;
          }

          const expiresAt = Date.now() + (resp.expires_in || 3599) * 1000;
          let userInfo: { email?: string; name?: string; picture?: string } = {};
          try {
            userInfo = await this.fetchUserInfo(resp.access_token);
          } catch {
            // non-fatal
          }

          const authInfo: GoogleAuthInfo = {
            accessToken: resp.access_token,
            expiresAt,
            ...userInfo,
          };

          if (onTokenCallback) {
            onTokenCallback(authInfo);
          }

          if (this.pendingAuthResolver) {
            this.pendingAuthResolver(authInfo);
            this.pendingAuthResolver = null;
            this.pendingAuthRejecter = null;
          }
        },
      });
    }
  }

  /**
   * Triggers the Google OAuth popup to request access token.
   */
  async requestGoogleLogin(): Promise<GoogleAuthInfo> {
    if (!this.tokenClient) {
      throw new Error('Google Identity Services client is not initialized. Please configure your Client ID.');
    }

    return new Promise<GoogleAuthInfo>((resolve, reject) => {
      this.pendingAuthResolver = resolve;
      this.pendingAuthRejecter = reject;
      this.tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  /**
   * Fetches the user profile info using access token.
   */
  async fetchUserInfo(accessToken: string): Promise<{ email?: string; name?: string; picture?: string }> {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch userinfo: ${res.statusText}`);
    }
    return await res.json();
  }

  /**
   * Finds a file by name inside appDataFolder.
   */
  async findAppDataFile(auth: GoogleAuthInfo, fileName: string = DRIVE_APPDATA_FILE_NAME): Promise<{ id: string; name: string } | null> {
    const query = encodeURIComponent(`name = '${fileName}' and 'appDataFolder' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to list appData files: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    if (json.files && json.files.length > 0) {
      return json.files[0];
    }
    return null;
  }

  /**
   * Fetches remote backup data and manifest from appDataFolder.
   */
  async fetchRemoteData(auth: GoogleAuthInfo): Promise<{
    manifest: SyncManifest | null;
    data: BackupPayload | null;
    fileId?: string;
  }> {
    const file = await this.findAppDataFile(auth, DRIVE_APPDATA_FILE_NAME);
    if (!file) {
      return { manifest: null, data: null };
    }

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to download remote data: ${res.status} ${res.statusText}`);
    }

    const content: RemoteSyncFileContent = await res.json();
    return {
      manifest: content.manifest || null,
      data: content.data || null,
      fileId: file.id,
    };
  }

  /**
   * Uploads or updates the remote roamlog_data.json inside appDataFolder.
   */
  async uploadRemoteData(
    auth: GoogleAuthInfo,
    data: BackupPayload,
    manifest: SyncManifest,
    existingFileId?: string
  ): Promise<{ fileId: string; manifest: SyncManifest }> {
    const payload: RemoteSyncFileContent = { manifest, data };
    const jsonString = JSON.stringify(payload, null, 2);

    if (existingFileId) {
      // Update existing file content directly
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
      const res = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: jsonString,
      });

      if (!res.ok) {
        throw new Error(`Failed to update remote file: ${res.status} ${res.statusText}`);
      }

      const resJson = await res.json();
      return { fileId: resJson.id || existingFileId, manifest };
    }

    // Multipart create in appDataFolder
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: DRIVE_APPDATA_FILE_NAME,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonString +
      closeDelimiter;

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      throw new Error(`Failed to create remote file: ${res.status} ${res.statusText}`);
    }

    const resJson = await res.json();
    return { fileId: resJson.id, manifest };
  }

  /**
   * Uploads an individual photo to appDataFolder.
   */
  async uploadPhotoToDrive(auth: GoogleAuthInfo, photoId: string, blob: Blob): Promise<string> {
    const fileName = `photo_${photoId}.jpg`;
    const existing = await this.findAppDataFile(auth, fileName);
    if (existing) {
      return existing.id;
    }

    const boundary = '-------photo_upload_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      parents: ['appDataFolder'],
      mimeType: blob.type || 'image/jpeg',
    };

    const arrayBuffer = await blob.arrayBuffer();
    const metadataPart = new TextEncoder().encode(
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${blob.type || 'image/jpeg'}\r\n\r\n`
    );
    const closePart = new TextEncoder().encode(closeDelimiter);

    // Combine binary parts
    const combined = new Uint8Array(metadataPart.byteLength + arrayBuffer.byteLength + closePart.byteLength);
    combined.set(metadataPart, 0);
    combined.set(new Uint8Array(arrayBuffer), metadataPart.byteLength);
    combined.set(closePart, metadataPart.byteLength + arrayBuffer.byteLength);

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: combined,
    });

    if (!res.ok) {
      throw new Error(`Failed to upload photo: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    return json.id;
  }

  /**
   * Downloads a photo blob by Google Drive file ID.
   */
  async downloadPhotoFromDrive(auth: GoogleAuthInfo, fileId: string): Promise<Blob> {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to download photo: ${res.status} ${res.statusText}`);
    }

    return await res.blob();
  }
}

export const googleDrive = new GoogleDriveClient();
