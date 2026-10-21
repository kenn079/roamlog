import React, { useState } from 'react';
import {
  Cloud,
  X,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Key,
  HelpCircle,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import type { SyncStatus } from '../../shared/types';

export interface GoogleSyncModalProps {
  onClose: () => void;
  onSaveClientId: (clientId: string) => void;
  onLogin: () => void;
  clientId: string;
  isLoggedIn: boolean;
  userEmail?: string;
  userName?: string;
  userPicture?: string;
  lastSyncedAt?: string | null;
  onManualSync: () => void;
  onDisconnect: () => void;
  syncStatus: SyncStatus;
  syncErrorMessage?: string | null;
}

export function GoogleSyncModal({
  onClose,
  onSaveClientId,
  onLogin,
  clientId,
  isLoggedIn,
  userEmail,
  userName,
  userPicture,
  lastSyncedAt,
  onManualSync,
  onDisconnect,
  syncStatus,
  syncErrorMessage,
}: GoogleSyncModalProps): React.ReactElement {
  const [inputClientId, setInputClientId] = useState(clientId || '');
  const [showConfig, setShowConfig] = useState(!clientId || !isLoggedIn);
  const [showHelp, setShowHelp] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    onSaveClientId(inputClientId.trim());
    if (inputClientId.trim()) {
      setShowConfig(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
      <div
        className="w-full max-w-md panel p-6 shadow-soft space-y-5 border border-line bg-surface max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-sync-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-accent">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 id="google-sync-title" className="font-display text-base font-bold text-ink">
                Google 雲端同步設定
              </h2>
              <p className="text-[11px] text-ink-faint">手機與電腦雙向無縫同步</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-ink-faint hover:text-ink hover:bg-surface-2 transition cursor-pointer"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Banner */}
        {isLoggedIn ? (
          <div className="p-3.5 bg-surface-2 border border-line rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {userPicture ? (
                  <img
                    src={userPicture}
                    alt={userName || 'Google Account'}
                    className="w-9 h-9 rounded-full border border-line"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-moss/20 text-moss font-bold flex items-center justify-center text-xs">
                    {userEmail?.slice(0, 2).toUpperCase() || 'G'}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-ink">{userName || 'Google 旅人帳號'}</p>
                  <p className="text-[11px] text-ink-soft">{userEmail}</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-moss/15 text-moss border border-moss/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                已連線
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-ink-soft border-t border-line/60 pt-2">
              <span>最後同步時間：{lastSyncedAt || '尚未同步'}</span>
              <span className="capitalize text-ink-faint">狀態: {syncStatus}</span>
            </div>

            {syncErrorMessage && (
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-[11px] text-accent flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{syncErrorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onManualSync}
                disabled={syncStatus === 'syncing'}
                className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>{syncStatus === 'syncing' ? '同步中...' : '立即同步'}</span>
              </button>

              <button
                type="button"
                onClick={onDisconnect}
                className="btn-soft w-full py-2 text-xs flex items-center justify-center gap-1.5 text-accent hover:border-accent"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>中斷連結</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-surface-2 border border-line rounded-xl space-y-3 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-accent/15 flex items-center justify-center text-accent">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink">尚未連結 Google 帳號</p>
              <p className="text-[11px] text-ink-soft mt-1 leading-relaxed">
                連結後即可在手機與電腦間無縫同步足跡、心願與旅程，離線時亦可持續記錄。
              </p>
            </div>

            {clientId ? (
              <button
                type="button"
                onClick={onLogin}
                className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-2"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>立即登入 Google 帳號</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfig(true)}
                className="btn-soft w-full py-2 text-xs flex items-center justify-center gap-1.5 text-accent"
              >
                <Key className="w-3.5 h-3.5" />
                <span>請先設定 Google Client ID</span>
              </button>
            )}
          </div>
        )}

        {/* Client ID Configuration Section */}
        <div className="border-t border-line pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowConfig((v) => !v)}
              className="text-xs font-semibold text-ink-soft hover:text-ink flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-accent" />
              <span>{showConfig ? '收合 Client ID 設定' : '修改 Google Client ID 設定'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="text-[11px] text-ink-faint hover:text-accent flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" />
              <span>{showHelp ? '收合教學' : '如何取得？'}</span>
            </button>
          </div>

          {showHelp && (
            <div className="p-3 bg-canvas border border-line rounded-xl text-[11px] text-ink-soft space-y-1.5 leading-relaxed">
              <p className="font-semibold text-ink flex items-center gap-1">
                <span>📘 3 步驟取得 Google OAuth Client ID：</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-ink-soft">
                <li>
                  前往{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline inline-flex items-center gap-0.5"
                  >
                    Google Cloud Console <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  建立專案。
                </li>
                <li>啟用 <strong>Google Drive API</strong>。</li>
                <li>
                  在「憑證」中建立 <strong>OAuth 用戶端 ID</strong>（類型選「網頁應用程式」），並將您的網址加入「已授權的 JavaScript 來源」。
                </li>
              </ol>
              <p className="text-[10px] text-ink-faint pt-1">
                🔒 檔案將儲存在您個人 Google Drive 的隱藏空間 (appDataFolder)，他人及其他應用無法存取。
              </p>
            </div>
          )}

          {showConfig && (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-ink-soft block mb-1">
                  Google OAuth 2.0 Web Client ID
                </label>
                <input
                  type="text"
                  value={inputClientId}
                  onChange={(e) => setInputClientId(e.target.value)}
                  placeholder="請輸入 Google Client ID (例如：123456789-abc.apps.googleusercontent.com)"
                  className="field w-full text-xs font-mono py-2 px-3"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="btn-primary py-1.5 px-4 text-xs"
                >
                  儲存設定
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
