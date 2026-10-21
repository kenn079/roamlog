import React, { useState } from 'react';
import {
  Cloud,
  X,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  LogOut,
  Tent,
  Settings,
} from 'lucide-react';
import type { SyncStatus } from '../../shared/types';
import { defaultFirebaseConfig } from '../lib/firebaseConfig';

export interface FirebaseSyncModalProps {
  onClose: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onManualSync: () => void;
  isLoggedIn: boolean;
  userEmail?: string | null;
  userName?: string | null;
  userPhoto?: string | null;
  syncStatus: SyncStatus;
  lastSyncedAt?: string | null;
  syncErrorMessage?: string | null;
}

export function FirebaseSyncModal({
  onClose,
  onLogin,
  onLogout,
  onManualSync,
  isLoggedIn,
  userEmail,
  userName,
  userPhoto,
  syncStatus,
  lastSyncedAt,
  syncErrorMessage,
}: FirebaseSyncModalProps): React.ReactElement {
  const [showConfig, setShowConfig] = useState(false);
  const [customConfigText, setCustomConfigText] = useState(() => {
    try {
      const saved = localStorage.getItem('roamlog_custom_firebase_config');
      return saved || JSON.stringify(defaultFirebaseConfig, null, 2);
    } catch {
      return JSON.stringify(defaultFirebaseConfig, null, 2);
    }
  });
  const [configSavedNotice, setConfigSavedNotice] = useState(false);

  function handleSaveCustomConfig(e: React.FormEvent) {
    e.preventDefault();
    try {
      const parsed = JSON.parse(customConfigText);
      localStorage.setItem('roamlog_custom_firebase_config', JSON.stringify(parsed));
      setConfigSavedNotice(true);
      setTimeout(() => setConfigSavedNotice(false), 2000);
    } catch {
      alert('請輸入有效的 JSON 格式');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
      <div
        className="w-full max-w-md panel p-6 shadow-soft space-y-5 border border-line bg-surface max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="firebase-sync-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-accent">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 id="firebase-sync-title" className="font-display text-base font-bold text-ink">
                Google 雲端同步
              </h2>
              <p className="text-[11px] text-ink-faint">手機與電腦雙向即時無縫同步</p>
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

        {/* Status Card */}
        {isLoggedIn ? (
          <div className="p-3.5 bg-surface-2 border border-line rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt={userName || 'Google Account'}
                    className="w-10 h-10 rounded-full border border-line shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-moss/20 text-moss font-bold flex items-center justify-center text-sm shrink-0">
                    {userEmail?.slice(0, 1).toUpperCase() || 'G'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink truncate">{userName || 'Google 旅人'}</p>
                  <p className="text-[11px] text-ink-soft truncate">{userEmail}</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-moss/15 text-moss border border-moss/30 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                即時同步中
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-ink-soft border-t border-line/60 pt-2">
              <span>最後同步時間：{lastSyncedAt || '剛剛'}</span>
              <span className="capitalize text-ink-faint">
                {syncStatus === 'syncing' ? '同步中...' : syncStatus === 'synced' ? '已是最新' : '正常連線'}
              </span>
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
                onClick={onLogout}
                className="btn-soft w-full py-2 text-xs flex items-center justify-center gap-1.5 text-accent hover:border-accent"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>登出帳號</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-surface-2 border border-line rounded-xl space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-accent/15 flex items-center justify-center text-accent">
              <Tent className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-ink">一鍵同步您的旅程足跡</p>
              <p className="text-xs text-ink-soft leading-relaxed max-w-xs mx-auto">
                使用個人 Google 帳號登入，在手機與電腦間自動即時同步足跡、心願與旅程，斷網時照常離線記錄。
              </p>
            </div>

            <button
              type="button"
              onClick={onLogin}
              className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              <Cloud className="w-4 h-4" />
              <span>以 Google 帳號一鍵登入</span>
            </button>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="space-y-2 text-[11px] text-ink-soft bg-canvas p-3 rounded-xl border border-line">
          <div className="flex items-center gap-2 text-ink font-semibold">
            <span>✨ 雲端同步特色：</span>
          </div>
          <ul className="space-y-1 list-disc list-inside text-ink-faint">
            <li>即時同步：手機新增打卡，電腦地圖即時自動跳出。</li>
            <li>離線記錄：在無訊號秘境中照樣打卡，連網後自動補傳。</li>
            <li>智慧壓縮：照片自動最佳化，省流量且載入飛快。</li>
          </ul>
        </div>

        {/* Advanced Config Toggle */}
        <div className="border-t border-line pt-2">
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="text-[11px] text-ink-faint hover:text-ink flex items-center gap-1 cursor-pointer"
          >
            <Settings className="w-3 h-3" />
            <span>{showConfig ? '收合專案設定' : '進階 Firebase 設定'}</span>
          </button>

          {showConfig && (
            <form onSubmit={handleSaveCustomConfig} className="mt-2 space-y-2">
              <textarea
                value={customConfigText}
                onChange={(e) => setCustomConfigText(e.target.value)}
                rows={5}
                className="field w-full text-[10px] font-mono py-1.5 px-2"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-moss">
                  {configSavedNotice ? '設定已儲存！' : ''}
                </span>
                <button type="submit" className="btn-soft py-1 px-3 text-xs">
                  儲存自訂設定
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
