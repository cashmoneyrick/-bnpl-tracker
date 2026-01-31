import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { Modal } from '../components/shared/Modal';
import { useToast } from '../components/shared/Toast';
import { useBNPLStore } from '../store';
import { formatCurrency, parseDollarInput, centsToDollars } from '../utils/currency';
import {
  isNotificationSupported,
  getPermissionStatus,
  requestPermission,
} from '../services/notifications';
import type { PlatformId, ExportedData } from '../types';
import type { PlatformTier } from '../constants/platforms';

type SettingsTab = 'platforms' | 'subscriptions' | 'notifications' | 'api-keys' | 'data';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'platforms', label: 'Platforms' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'data', label: 'Data' },
];

function PlatformSettings({ platformId }: { platformId: PlatformId }) {
  const platforms = useBNPLStore((state) => state.platforms);
  const updatePlatformLimit = useBNPLStore((state) => state.updatePlatformLimit);
  const updatePlatformSchedule = useBNPLStore((state) => state.updatePlatformSchedule);
  const updatePlatformGoal = useBNPLStore((state) => state.updatePlatformGoal);
  const updatePlatformTier = useBNPLStore((state) => state.updatePlatformTier);

  const platform = platforms.find((p) => p.id === platformId);

  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState(
    platform ? centsToDollars(platform.creditLimit).toString() : '0'
  );
  const [installments, setInstallments] = useState(platform?.defaultInstallments ?? 4);
  const [intervalDays, setIntervalDays] = useState(platform?.defaultIntervalDays ?? 14);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Goal and tier state
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(
    platform?.goalLimit ? centsToDollars(platform.goalLimit).toString() : ''
  );
  const [tier, setTier] = useState<PlatformTier>(platform?.tier || 'limited');

  useEffect(() => {
    if (platform) {
      setLimitInput(centsToDollars(platform.creditLimit).toString());
      setInstallments(platform.defaultInstallments);
      setIntervalDays(platform.defaultIntervalDays);
      setGoalInput(platform.goalLimit ? centsToDollars(platform.goalLimit).toString() : '');
      setTier(platform.tier || 'limited');
    }
  }, [platform?.creditLimit, platform?.defaultInstallments, platform?.defaultIntervalDays, platform?.goalLimit, platform?.tier]);

  if (!platform) return null;

  const handleSaveLimit = async () => {
    const newLimit = parseDollarInput(limitInput);
    if (newLimit !== null) {
      setSaveStatus('saving');
      try {
        await updatePlatformLimit(platformId, newLimit);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        setIsEditingLimit(false);
      } catch (error) {
        console.error('Failed to save limit:', error);
        setSaveStatus('idle');
      }
    }
  };

  const handleSaveSchedule = async () => {
    setSaveStatus('saving');
    try {
      await updatePlatformSchedule(platformId, installments, intervalDays);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save schedule:', error);
      setSaveStatus('idle');
    }
  };

  const handleSaveGoal = async () => {
    const newGoal = goalInput ? parseDollarInput(goalInput) : null;
    setSaveStatus('saving');
    try {
      await updatePlatformGoal(platformId, newGoal !== null && newGoal > 0 ? newGoal : undefined);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      setIsEditingGoal(false);
    } catch (error) {
      console.error('Failed to save goal:', error);
      setSaveStatus('idle');
    }
  };

  const handleChangeTier = async (newTier: PlatformTier) => {
    setTier(newTier);
    setSaveStatus('saving');
    try {
      await updatePlatformTier(platformId, newTier);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save tier:', error);
      setSaveStatus('idle');
      setTier(platform?.tier || 'limited'); // Revert on error
    }
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-dark-border last:border-0">
      <div className="flex items-center gap-3">
        <span
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: platform.color }}
        />
        <span className="font-medium text-white">{platform.name}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Limit:</span>
          {isEditingLimit ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                className="w-24 px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-sm"
                autoFocus
              />
              <Button size="sm" onClick={handleSaveLimit}>
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditingLimit(false);
                  setLimitInput(centsToDollars(platform.creditLimit).toString());
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingLimit(true)}
              className="text-white hover:text-blue-400 transition-colors"
            >
              {platform.creditLimit > 0
                ? formatCurrency(platform.creditLimit)
                : 'No limit'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Schedule:</span>
          <select
            value={installments}
            onChange={(e) => {
              setInstallments(Number(e.target.value));
              setTimeout(handleSaveSchedule, 0);
            }}
            className="px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-sm"
          >
            {[3, 4, 6, 12].map((n) => (
              <option key={n} value={n}>
                {n}x
              </option>
            ))}
          </select>
          <span className="text-gray-500">every</span>
          <select
            value={intervalDays}
            onChange={(e) => {
              setIntervalDays(Number(e.target.value));
              setTimeout(handleSaveSchedule, 0);
            }}
            className="px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-sm"
          >
            {[7, 14, 30].map((n) => (
              <option key={n} value={n}>
                {n} days
              </option>
            ))}
          </select>
        </div>

        {/* Tier Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Tier:</span>
          <select
            value={tier}
            onChange={(e) => handleChangeTier(e.target.value as PlatformTier)}
            className="px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-sm"
          >
            <option value="flexible">Flexible</option>
            <option value="limited">Limited</option>
          </select>
        </div>

        {/* Goal Limit */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Goal:</span>
          {isEditingGoal ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="No goal"
                className="w-24 px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-sm"
                autoFocus
              />
              <Button size="sm" onClick={handleSaveGoal}>
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditingGoal(false);
                  setGoalInput(platform?.goalLimit ? centsToDollars(platform.goalLimit).toString() : '');
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingGoal(true)}
              className="text-white hover:text-blue-400 transition-colors"
            >
              {platform.goalLimit && platform.goalLimit > 0
                ? formatCurrency(platform.goalLimit)
                : 'Set goal'}
            </button>
          )}
        </div>

        {saveStatus !== 'idle' && (
          <span className={`text-xs ${saveStatus === 'saving' ? 'text-gray-400' : 'text-green-400'}`}>
            {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
          </span>
        )}
      </div>
    </div>
  );
}

function SubscriptionSettings({ platformId }: { platformId: PlatformId }) {
  const platforms = useBNPLStore((state) => state.platforms);
  const subscriptions = useBNPLStore((state) => state.subscriptions);
  const updateSubscription = useBNPLStore((state) => state.updateSubscription);

  const platform = platforms.find((p) => p.id === platformId);
  const subscription = subscriptions.find((s) => s.platformId === platformId);

  const [isActive, setIsActive] = useState(subscription?.isActive ?? false);
  const [costInput, setCostInput] = useState(
    subscription ? centsToDollars(subscription.monthlyCost).toString() : '0'
  );
  const [benefits, setBenefits] = useState<string[]>(subscription?.benefits ?? []);
  const [newBenefit, setNewBenefit] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (subscription) {
      setIsActive(subscription.isActive);
      setCostInput(centsToDollars(subscription.monthlyCost).toString());
      setBenefits(subscription.benefits);
    }
  }, [subscription?.isActive, subscription?.monthlyCost, subscription?.benefits]);

  if (!platform) return null;

  const handleToggleActive = async () => {
    const newActive = !isActive;
    setIsActive(newActive);
    setSaveStatus('saving');

    await updateSubscription({
      platformId,
      isActive: newActive,
      monthlyCost: parseDollarInput(costInput) ?? 0,
      benefits,
    });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleSaveCost = async () => {
    const cost = parseDollarInput(costInput);
    if (cost !== null) {
      setSaveStatus('saving');
      await updateSubscription({
        platformId,
        isActive,
        monthlyCost: cost,
        benefits,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleAddBenefit = async () => {
    if (newBenefit.trim()) {
      const newBenefits = [...benefits, newBenefit.trim()];
      setBenefits(newBenefits);
      setNewBenefit('');
      setSaveStatus('saving');

      await updateSubscription({
        platformId,
        isActive,
        monthlyCost: parseDollarInput(costInput) ?? 0,
        benefits: newBenefits,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleRemoveBenefit = async (index: number) => {
    const newBenefits = benefits.filter((_, i) => i !== index);
    setBenefits(newBenefits);
    setSaveStatus('saving');

    await updateSubscription({
      platformId,
      isActive,
      monthlyCost: parseDollarInput(costInput) ?? 0,
      benefits: newBenefits,
    });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  return (
    <div className="py-4 border-b border-dark-border last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: platform.color }}
          />
          <span className="font-medium text-white">{platform.name}</span>
          {saveStatus !== 'idle' && (
            <span className={`text-xs ${saveStatus === 'saving' ? 'text-gray-400' : 'text-green-400'}`}>
              {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleToggleActive}
            className={`
              relative w-12 h-6 rounded-full transition-colors
              ${isActive ? 'bg-blue-600' : 'bg-dark-border'}
            `}
          >
            <span
              className={`
                absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                ${isActive ? 'left-7' : 'left-1'}
              `}
            />
          </button>

          {isActive && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">$/mo:</span>
              <input
                type="text"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                onBlur={handleSaveCost}
                className="w-20 px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {isActive && (
        <div className="mt-4 pl-7">
          <p className="text-sm text-gray-400 mb-2">Benefits:</p>
          {benefits.length > 0 && (
            <ul className="space-y-1 mb-2">
              {benefits.map((benefit, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between text-sm text-gray-300"
                >
                  <span>• {benefit}</span>
                  <button
                    onClick={() => handleRemoveBenefit(index)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add benefit..."
              value={newBenefit}
              onChange={(e) => setNewBenefit(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBenefit()}
              className="flex-1 px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-sm"
            />
            <Button size="sm" onClick={handleAddBenefit}>
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationsTab() {
  const { showToast } = useToast();
  const notificationSettings = useBNPLStore((state) => state.notificationSettings);
  const updateNotificationSettings = useBNPLStore((state) => state.updateNotificationSettings);

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(
    getPermissionStatus()
  );

  const isSupported = isNotificationSupported();
  const isGranted = permissionStatus === 'granted';
  const isDenied = permissionStatus === 'denied';

  const handleToggleEnabled = async () => {
    if (!notificationSettings.enabled) {
      const granted = await requestPermission();
      setPermissionStatus(getPermissionStatus());

      if (granted) {
        updateNotificationSettings({ ...notificationSettings, enabled: true });
        showToast('Notifications enabled', 'success');
      } else {
        showToast('Notification permission denied', 'error');
      }
    } else {
      updateNotificationSettings({ ...notificationSettings, enabled: false });
      showToast('Notifications disabled', 'info');
    }
  };

  if (!isSupported) {
    return (
      <p className="text-sm text-gray-400">
        Browser notifications are not supported in this browser.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Get browser notifications for upcoming and overdue payments.
      </p>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-white">Enable Notifications</p>
          {isDenied && (
            <p className="text-sm text-amber-400 mt-1">
              Permission denied. Please enable in browser settings.
            </p>
          )}
        </div>
        <button
          onClick={handleToggleEnabled}
          disabled={isDenied}
          className={`
            relative w-12 h-6 rounded-full transition-colors disabled:opacity-50
            ${notificationSettings.enabled && isGranted ? 'bg-blue-600' : 'bg-dark-border'}
          `}
        >
          <span
            className={`
              absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
              ${notificationSettings.enabled && isGranted ? 'left-7' : 'left-1'}
            `}
          />
        </button>
      </div>

      {notificationSettings.enabled && isGranted && (
        <>
          <div className="flex items-center justify-between pt-4 border-t border-dark-border">
            <div>
              <p className="text-white">Advance Notice</p>
              <p className="text-sm text-gray-400">How many days before to notify</p>
            </div>
            <select
              value={notificationSettings.daysBefore}
              onChange={(e) => updateNotificationSettings({ ...notificationSettings, daysBefore: Number(e.target.value) })}
              className="px-3 py-1.5 bg-dark-card border border-dark-border rounded-lg text-white"
            >
              <option value={1}>1 day</option>
              <option value={2}>2 days</option>
              <option value={3}>3 days</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white">Notify on Due Date</p>
              <p className="text-sm text-gray-400">Remind me when payment is due today</p>
            </div>
            <button
              onClick={() => updateNotificationSettings({ ...notificationSettings, notifyOnDueDate: !notificationSettings.notifyOnDueDate })}
              className={`relative w-12 h-6 rounded-full transition-colors ${notificationSettings.notifyOnDueDate ? 'bg-blue-600' : 'bg-dark-border'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${notificationSettings.notifyOnDueDate ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white">Notify When Overdue</p>
              <p className="text-sm text-gray-400">Alert me about missed payments</p>
            </div>
            <button
              onClick={() => updateNotificationSettings({ ...notificationSettings, notifyOverdue: !notificationSettings.notifyOverdue })}
              className={`relative w-12 h-6 rounded-full transition-colors ${notificationSettings.notifyOverdue ? 'bg-blue-600' : 'bg-dark-border'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${notificationSettings.notifyOverdue ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function APIKeysTab() {
  const { showToast } = useToast();
  const geminiApiKey = useBNPLStore((state) => state.geminiApiKey);
  const setGeminiApiKey = useBNPLStore((state) => state.setGeminiApiKey);

  const [showKey, setShowKey] = useState(false);
  const [inputValue, setInputValue] = useState(geminiApiKey || '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    setInputValue(geminiApiKey || '');
  }, [geminiApiKey]);

  const handleSave = useCallback(() => {
    const trimmedKey = inputValue.trim();
    if (trimmedKey !== (geminiApiKey || '')) {
      setSaveStatus('saving');
      setGeminiApiKey(trimmedKey || null);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      showToast(trimmedKey ? 'API key saved' : 'API key cleared', 'success');
    }
  }, [inputValue, geminiApiKey, setGeminiApiKey, showToast]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Configure API keys for enhanced features.
      </p>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-white">Gemini API Key</label>
          {saveStatus !== 'idle' && (
            <span className={`text-xs ${saveStatus === 'saving' ? 'text-gray-400' : 'text-green-400'}`}>
              {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mb-3">
          Used for screenshot import feature. Get a free key from{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Google AI Studio
          </a>
        </p>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="AIzaSy..."
            className="flex-1 px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button variant="secondary" onClick={() => setShowKey(!showKey)}>
            {showKey ? 'Hide' : 'Show'}
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
        {geminiApiKey && (
          <p className="text-xs text-green-400 mt-2">API key configured</p>
        )}
      </div>
    </div>
  );
}

function DataTab() {
  const { showToast } = useToast();
  const exportData = useBNPLStore((state) => state.exportData);
  const importData = useBNPLStore((state) => state.importData);
  const clearAllData = useBNPLStore((state) => state.clearAllData);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<ExportedData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bnpl-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully', 'success');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportedData;

      if (!data.version || !Array.isArray(data.orders) || !Array.isArray(data.payments)) {
        throw new Error('Invalid file format');
      }

      // Ensure platforms and subscriptions arrays exist
      data.platforms = data.platforms || [];
      data.subscriptions = data.subscriptions || [];

      setPendingImportData(data);
      setShowImportConfirm(true);
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to read file');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImportData || isImporting) return;

    setIsImporting(true);
    setImportError(null);

    try {
      await importData(pendingImportData);
      showToast(`Imported ${pendingImportData.orders.length} orders`, 'success');
      // Only close modal on success
      setPendingImportData(null);
      setShowImportConfirm(false);
    } catch (error) {
      // Keep modal open on error so user can see the error
      const errorMessage = error instanceof Error ? error.message : 'Failed to import data';
      setImportError(errorMessage);
      showToast('Import failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearAll = async () => {
    await clearAllData();
    setShowClearConfirm(false);
    showToast('All data cleared', 'info');
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white">Export Data</p>
            <p className="text-sm text-gray-400">Download all your data as a JSON file</p>
          </div>
          <Button onClick={handleExport}>Export</Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white">Import Data</p>
            <p className="text-sm text-gray-400">Restore data from a previously exported file</p>
            {importError && <p className="text-sm text-red-400 mt-1">{importError}</p>}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Import
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-dark-border">
          <div>
            <p className="text-red-400 font-medium">Danger Zone</p>
            <p className="text-sm text-gray-400">Delete all orders and payments. This cannot be undone.</p>
          </div>
          <Button variant="danger" onClick={() => setShowClearConfirm(true)}>
            Clear All Data
          </Button>
        </div>
      </div>

      <Modal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="Clear All Data" size="sm">
        <div className="space-y-4">
          <p className="text-gray-300">Are you sure you want to delete all your data? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleClearAll}>Delete All Data</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showImportConfirm}
        onClose={() => {
          if (!isImporting) {
            setPendingImportData(null);
            setShowImportConfirm(false);
            setImportError(null);
          }
        }}
        title="Import Data"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-amber-400 text-sm font-medium">Warning</p>
            <p className="text-gray-300 text-sm mt-1">Importing will replace all existing data. This cannot be undone.</p>
          </div>
          {pendingImportData && (
            <div className="text-sm text-gray-400">
              <p>File contains:</p>
              <ul className="list-disc list-inside mt-1">
                <li>{pendingImportData.orders.length} orders</li>
                <li>{pendingImportData.payments.length} payments</li>
              </ul>
            </div>
          )}
          {importError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm font-medium">Import Failed</p>
              <p className="text-gray-300 text-sm mt-1">{importError}</p>
            </div>
          )}
          {isImporting && (
            <div className="flex items-center justify-center gap-2 py-2">
              <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-400 text-sm">Importing data...</span>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setPendingImportData(null);
                setShowImportConfirm(false);
                setImportError(null);
              }}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmImport} disabled={isImporting}>
              {isImporting ? 'Importing...' : 'Import Data'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('platforms');
  const platforms = useBNPLStore((state) => state.platforms);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Configure your BNPL tracking preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-dark-card rounded-lg border border-dark-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${activeTab === tab.id
                ? 'bg-dark-hover text-white'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Card>
        {activeTab === 'platforms' && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">Platform Settings</h2>
            <p className="text-sm text-gray-400 mb-4">Configure credit limits and default payment schedules.</p>
            {platforms.map((platform) => (
              <PlatformSettings key={platform.id} platformId={platform.id} />
            ))}
          </>
        )}

        {activeTab === 'subscriptions' && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">Subscriptions</h2>
            <p className="text-sm text-gray-400 mb-4">Track subscription costs and benefits for each platform.</p>
            {platforms.map((platform) => (
              <SubscriptionSettings key={platform.id} platformId={platform.id} />
            ))}
          </>
        )}

        {activeTab === 'notifications' && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">Notifications</h2>
            <NotificationsTab />
          </>
        )}

        {activeTab === 'api-keys' && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">API Keys</h2>
            <APIKeysTab />
          </>
        )}

        {activeTab === 'data' && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">Data Management</h2>
            <DataTab />
          </>
        )}
      </Card>
    </div>
  );
}
