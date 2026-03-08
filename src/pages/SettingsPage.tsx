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
import type { ThemeColors, ThemePreset } from '../types/theme';
import { BUILT_IN_PRESETS } from '../constants/themes';
import { applyTheme, resolvePreset } from '../hooks/useTheme';

type SettingsTab = 'theme' | 'platforms' | 'subscriptions' | 'paycheck' | 'notifications' | 'api-keys' | 'data';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'theme', label: 'Theme' },
  { id: 'platforms', label: 'Platforms' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'paycheck', label: 'Paycheck' },
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 border-b border-dark-border last:border-0 gap-3 sm:gap-0">
      <div className="flex items-center gap-3">
        <span
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: platform.color }}
        />
        <span className="font-medium text-white">{platform.name}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <span className="text-sm text-gray-400">Limit:</span>
          {isEditingLimit ? (
            <div className="flex items-center gap-2 flex-wrap">
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

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start flex-wrap">
          <span className="text-sm text-gray-400">Schedule:</span>
          <div className="flex items-center gap-2">
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
        </div>

        {/* Tier Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
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
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <span className="text-sm text-gray-400">Goal:</span>
          {isEditingGoal ? (
            <div className="flex items-center gap-2 flex-wrap">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
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

        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
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
        <div className="mt-4 pl-0 sm:pl-7">
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

function PaycheckTab() {
  const { showToast } = useToast();
  const paycheckSettings = useBNPLStore((state) => state.paycheckSettings);
  const setPaycheckSettings = useBNPLStore((state) => state.setPaycheckSettings);

  const [amount, setAmount] = useState(paycheckSettings ? centsToDollars(paycheckSettings.amount).toString() : '');
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>(paycheckSettings?.frequency || 'biweekly');
  const [nextPayday, setNextPayday] = useState(paycheckSettings?.nextPayday?.split('T')[0] || '');

  const handleSave = () => {
    const amountCents = parseDollarInput(amount);
    if (!amountCents || amountCents <= 0) {
      showToast('Enter a valid paycheck amount', 'error');
      return;
    }
    if (!nextPayday) {
      showToast('Enter your next payday', 'error');
      return;
    }
    setPaycheckSettings({
      amount: amountCents,
      frequency,
      nextPayday: new Date(nextPayday + 'T00:00:00').toISOString(),
    });
    showToast('Paycheck settings saved', 'success');
  };

  const handleClear = () => {
    setPaycheckSettings(null);
    setAmount('');
    setNextPayday('');
    showToast('Paycheck settings cleared', 'success');
  };

  return (
    <Card>
      <p className="text-sm text-terminal-muted mb-4">
        Enter your paycheck details to see how BNPL payments fit into your income.
      </p>
      <div className="space-y-4">
        <div>
          <label className="terminal-label block mb-1">PAYCHECK AMOUNT</label>
          <div className="flex items-center gap-2">
            <span className="text-terminal-muted">$</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-dark-bg border border-dark-border px-3 py-2 text-white text-sm focus:outline-none focus:border-terminal-amber"
            />
          </div>
        </div>
        <div>
          <label className="terminal-label block mb-1">PAY FREQUENCY</label>
          <div className="flex gap-2">
            {(['weekly', 'biweekly', 'monthly'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`px-3 py-1.5 text-2xs uppercase tracking-wider border transition-colors ${
                  frequency === f
                    ? 'border-terminal-amber text-terminal-amber bg-terminal-amber/10'
                    : 'border-dark-border text-terminal-muted hover:text-terminal-text'
                }`}
              >
                {f === 'biweekly' ? 'BI-WEEKLY' : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="terminal-label block mb-1">NEXT PAYDAY</label>
          <input
            type="date"
            value={nextPayday}
            onChange={(e) => setNextPayday(e.target.value)}
            className="bg-dark-bg border border-dark-border px-3 py-2 text-white text-sm focus:outline-none focus:border-terminal-amber w-full"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave}>SAVE</Button>
          {paycheckSettings && (
            <Button variant="ghost" onClick={handleClear}>CLEAR</Button>
          )}
        </div>
      </div>
    </Card>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div>
            <p className="text-white">Export Data</p>
            <p className="text-sm text-gray-400">Download all your data as a JSON file</p>
          </div>
          <Button onClick={handleExport}>Export</Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 pt-4 border-t border-dark-border">
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

// ── Color Picker Row ──
function ColorRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [hexInput, setHexInput] = useState(value);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  const handleHexChange = (raw: string) => {
    setHexInput(raw);
    const cleaned = raw.startsWith('#') ? raw : `#${raw}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
      onChange(cleaned.toUpperCase());
    }
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <input
        type="color"
        value={value}
        onChange={(e) => {
          const hex = e.target.value.toUpperCase();
          onChange(hex);
          setHexInput(hex);
        }}
        className="w-10 h-10 cursor-pointer border border-dark-border bg-transparent p-0.5 shrink-0"
        style={{ WebkitAppearance: 'none' }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-terminal-muted">{description}</div>
      </div>
      <input
        type="text"
        value={hexInput}
        onChange={(e) => handleHexChange(e.target.value)}
        className="w-[5.5rem] text-xs font-mono bg-dark-bg border border-dark-border px-2 py-1.5 text-terminal-text uppercase"
        maxLength={7}
        placeholder="#000000"
      />
    </div>
  );
}

// ── Preset Card ──
function PresetCard({
  preset,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: {
  preset: ThemePreset;
  isActive: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { accent, bg, card, text, border } = preset.colors;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 border transition-colors ${
        isActive
          ? 'border-terminal-amber bg-terminal-amber/5'
          : 'border-dark-border hover:border-terminal-amber/30 bg-dark-bg'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">{preset.name}</span>
        <div className="flex items-center gap-1">
          {isActive && (
            <span className="text-xs text-terminal-amber font-mono">ACTIVE</span>
          )}
          {!preset.isBuiltIn && onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="ml-2 p-1 text-terminal-muted hover:text-white transition-colors"
              title="Edit"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {!preset.isBuiltIn && onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 text-terminal-muted hover:text-terminal-red transition-colors"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {/* Color swatches */}
      <div className="flex gap-1 h-4">
        <div className="flex-1" style={{ background: accent }} title="Accent" />
        <div className="flex-1" style={{ background: bg }} title="Background" />
        <div className="flex-1" style={{ background: card }} title="Card" />
        <div className="flex-1" style={{ background: text }} title="Text" />
        <div className="flex-1" style={{ background: border }} title="Border" />
      </div>
    </button>
  );
}

// ── Theme Tab ──
function ThemeTab() {
  const activePresetId = useBNPLStore((s) => s.activeThemePresetId);
  const customPresets = useBNPLStore((s) => s.customThemePresets);
  const setActivePreset = useBNPLStore((s) => s.setActiveThemePreset);
  const saveCustomPreset = useBNPLStore((s) => s.saveCustomThemePreset);
  const updateCustomPreset = useBNPLStore((s) => s.updateCustomThemePreset);
  const deleteCustomPreset = useBNPLStore((s) => s.deleteCustomThemePreset);

  const [isEditing, setIsEditing] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColors, setEditColors] = useState<ThemeColors>({
    accent: '#FFB000', bg: '#0B0E11', card: '#0F1215', text: '#C8CCD0', border: '#1E2328',
  });
  const [previousPresetId, setPreviousPresetId] = useState(activePresetId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Live preview as colors change during editing
  useEffect(() => {
    if (isEditing) {
      applyTheme(editColors);
    }
  }, [isEditing, editColors]);

  const handleStartCreate = () => {
    setPreviousPresetId(activePresetId);
    const currentPreset = resolvePreset(activePresetId, customPresets);
    setEditColors({ ...currentPreset.colors });
    setEditName('');
    setEditingPresetId(null);
    setIsEditing(true);
  };

  const handleStartEdit = (preset: ThemePreset) => {
    setPreviousPresetId(activePresetId);
    setEditColors({ ...preset.colors });
    setEditName(preset.name);
    setEditingPresetId(preset.id);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editName.trim()) return;

    if (editingPresetId) {
      // Update existing
      updateCustomPreset(editingPresetId, { name: editName.trim(), colors: editColors });
      setActivePreset(editingPresetId);
    } else {
      // Create new
      const newPreset: ThemePreset = {
        id: `custom-${Date.now()}`,
        name: editName.trim(),
        colors: editColors,
        isBuiltIn: false,
      };
      saveCustomPreset(newPreset);
      setActivePreset(newPreset.id);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Revert to previous theme
    const preset = resolvePreset(previousPresetId, customPresets);
    applyTheme(preset.colors);
    setActivePreset(previousPresetId);
    setIsEditing(false);
  };

  const handleDelete = (presetId: string) => {
    deleteCustomPreset(presetId);
    setShowDeleteConfirm(null);
  };

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setEditColors(prev => ({ ...prev, [key]: value }));
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            {editingPresetId ? 'Edit Preset' : 'New Custom Preset'}
          </h3>
        </div>

        {/* Preset name */}
        <div>
          <label className="terminal-label block mb-1">Preset Name</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="My Custom Theme"
            className="w-full bg-dark-bg border border-dark-border px-3 py-2 text-sm text-terminal-text focus:border-terminal-amber focus:outline-none"
          />
        </div>

        {/* Color pickers */}
        <div className="space-y-1">
          <ColorRow
            label="Accent"
            description="Highlights, active elements, buttons"
            value={editColors.accent}
            onChange={(v) => handleColorChange('accent', v)}
          />
          <ColorRow
            label="Background"
            description="Main page background"
            value={editColors.bg}
            onChange={(v) => handleColorChange('bg', v)}
          />
          <ColorRow
            label="Card"
            description="Cards, panels, modals"
            value={editColors.card}
            onChange={(v) => handleColorChange('card', v)}
          />
          <ColorRow
            label="Text"
            description="Body text color"
            value={editColors.text}
            onChange={(v) => handleColorChange('text', v)}
          />
          <ColorRow
            label="Border"
            description="Borders and dividers"
            value={editColors.border}
            onChange={(v) => handleColorChange('border', v)}
          />
        </div>

        {/* Preview strip */}
        <div>
          <label className="terminal-label block mb-1">Preview</label>
          <div className="flex gap-1 h-6">
            <div className="flex-1" style={{ background: editColors.accent }} />
            <div className="flex-1" style={{ background: editColors.bg }} />
            <div className="flex-1" style={{ background: editColors.card }} />
            <div className="flex-1" style={{ background: editColors.text }} />
            <div className="flex-1" style={{ background: editColors.border }} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleCancel}
            className="flex-1 px-3 py-2 text-sm border border-dark-border text-terminal-muted hover:text-white hover:border-terminal-amber/30 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!editName.trim()}
            className="flex-1 px-3 py-2 text-sm border border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {editingPresetId ? 'Update Preset' : 'Save Preset'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Built-in presets */}
      <div>
        <h3 className="terminal-label mb-2">Built-in Presets</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BUILT_IN_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isActive={activePresetId === preset.id}
              onSelect={() => setActivePreset(preset.id)}
            />
          ))}
        </div>
      </div>

      {/* Custom presets */}
      <div>
        <h3 className="terminal-label mb-2">Custom Presets</h3>
        {customPresets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {customPresets.map((preset) => (
              <div key={preset.id} className="relative">
                <PresetCard
                  preset={preset}
                  isActive={activePresetId === preset.id}
                  onSelect={() => setActivePreset(preset.id)}
                  onEdit={() => handleStartEdit(preset)}
                  onDelete={() => setShowDeleteConfirm(preset.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-terminal-muted mb-3">No custom presets yet.</p>
        )}

        <button
          onClick={handleStartCreate}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-dark-border text-sm text-terminal-muted hover:text-terminal-amber hover:border-terminal-amber/30 transition-colors"
        >
          <span>+</span>
          <span>Create Custom Preset</span>
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteConfirm(null)}
          title="Delete Preset"
          size="sm"
        >
          <p className="text-sm text-terminal-text mb-4">
            Are you sure you want to delete this preset? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <button
              onClick={() => handleDelete(showDeleteConfirm)}
              className="flex-1 px-3 py-2 text-sm bg-terminal-red/10 border border-terminal-red/30 text-terminal-red hover:bg-terminal-red/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('platforms');
  const platforms = useBNPLStore((state) => state.platforms);

  // Settings tab scroll tracking
  const settingsTabRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollArrows = useCallback(() => {
    const el = settingsTabRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  const handleTabScroll = useCallback(() => {
    updateScrollArrows();
  }, [updateScrollArrows]);

  const scrollTabs = useCallback((direction: 'left' | 'right') => {
    const el = settingsTabRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'right' ? 120 : -120, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    updateScrollArrows();
    window.addEventListener('resize', updateScrollArrows);
    return () => window.removeEventListener('resize', updateScrollArrows);
  }, [updateScrollArrows]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="relative border border-dark-border bg-dark-card">
        <div
          ref={settingsTabRef}
          onScroll={handleTabScroll}
          className="flex gap-1 p-1 overflow-x-auto scrollbar-hide"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                shrink-0 sm:flex-1 px-4 py-2.5 sm:py-2 text-sm font-medium transition-colors whitespace-nowrap
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
        {/* Left fade + arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scrollTabs('left')}
            className="sm:hidden absolute left-0 top-0 bottom-0 w-8 flex items-center justify-start pl-1 z-10 transition-opacity"
            style={{ background: 'linear-gradient(90deg, var(--color-card) 40%, transparent)' }}
          >
            <span className="text-terminal-amber text-sm">‹</span>
          </button>
        )}
        {/* Right fade + arrow */}
        {canScrollRight && (
          <button
            onClick={() => scrollTabs('right')}
            className="sm:hidden absolute right-0 top-0 bottom-0 w-8 flex items-center justify-end pr-1 z-10 transition-opacity"
            style={{ background: 'linear-gradient(270deg, var(--color-card) 40%, transparent)' }}
          >
            <span className="text-terminal-amber text-sm">›</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <Card>
        {activeTab === 'theme' && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">Theme</h2>
            <p className="text-sm text-gray-400 mb-4">Choose a color scheme or create your own.</p>
            <ThemeTab />
          </>
        )}

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

        {activeTab === 'paycheck' && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">Paycheck Settings</h2>
            <PaycheckTab />
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
