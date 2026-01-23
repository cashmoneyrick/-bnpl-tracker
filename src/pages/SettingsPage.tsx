import { useState, useRef } from 'react';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { Modal } from '../components/shared/Modal';
import { useBNPLStore } from '../store';
import { formatCurrency, parseDollarInput, centsToDollars } from '../utils/currency';
import type { PlatformId, ExportedData } from '../types';

function PlatformSettings({ platformId }: { platformId: PlatformId }) {
  const platforms = useBNPLStore((state) => state.platforms);
  const updatePlatformLimit = useBNPLStore((state) => state.updatePlatformLimit);
  const updatePlatformSchedule = useBNPLStore((state) => state.updatePlatformSchedule);

  const platform = platforms.find((p) => p.id === platformId);
  if (!platform) return null;

  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState(
    centsToDollars(platform.creditLimit).toString()
  );
  const [installments, setInstallments] = useState(platform.defaultInstallments);
  const [intervalDays, setIntervalDays] = useState(platform.defaultIntervalDays);

  const handleSaveLimit = async () => {
    const newLimit = parseDollarInput(limitInput);
    if (newLimit !== null) {
      await updatePlatformLimit(platformId, newLimit);
      setIsEditingLimit(false);
    }
  };

  const handleSaveSchedule = async () => {
    await updatePlatformSchedule(platformId, installments, intervalDays);
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
        {/* Credit Limit */}
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

        {/* Payment Schedule */}
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

  if (!platform) return null;

  const [isActive, setIsActive] = useState(subscription?.isActive ?? false);
  const [costInput, setCostInput] = useState(
    subscription ? centsToDollars(subscription.monthlyCost).toString() : '0'
  );
  const [benefits, setBenefits] = useState<string[]>(subscription?.benefits ?? []);
  const [newBenefit, setNewBenefit] = useState('');

  const handleToggleActive = async () => {
    const newActive = !isActive;
    setIsActive(newActive);

    await updateSubscription({
      platformId,
      isActive: newActive,
      monthlyCost: parseDollarInput(costInput) ?? 0,
      benefits,
    });
  };

  const handleSaveCost = async () => {
    const cost = parseDollarInput(costInput);
    if (cost !== null) {
      await updateSubscription({
        platformId,
        isActive,
        monthlyCost: cost,
        benefits,
      });
    }
  };

  const handleAddBenefit = async () => {
    if (newBenefit.trim()) {
      const newBenefits = [...benefits, newBenefit.trim()];
      setBenefits(newBenefits);
      setNewBenefit('');

      await updateSubscription({
        platformId,
        isActive,
        monthlyCost: parseDollarInput(costInput) ?? 0,
        benefits: newBenefits,
      });
    }
  };

  const handleRemoveBenefit = async (index: number) => {
    const newBenefits = benefits.filter((_, i) => i !== index);
    setBenefits(newBenefits);

    await updateSubscription({
      platformId,
      isActive,
      monthlyCost: parseDollarInput(costInput) ?? 0,
      benefits: newBenefits,
    });
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
        </div>

        <div className="flex items-center gap-4">
          {/* Active Toggle */}
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

          {/* Monthly Cost */}
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

      {/* Benefits */}
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
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
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

export function SettingsPage() {
  const platforms = useBNPLStore((state) => state.platforms);
  const exportData = useBNPLStore((state) => state.exportData);
  const importData = useBNPLStore((state) => state.importData);
  const clearAllData = useBNPLStore((state) => state.clearAllData);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bnpl-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportedData;

      // Basic validation
      if (!data.version || !data.orders || !data.payments) {
        throw new Error('Invalid file format');
      }

      await importData(data);
      setImportError(null);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : 'Failed to import data'
      );
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAll = async () => {
    await clearAllData();
    setShowClearConfirm(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Configure your BNPL tracking preferences</p>
      </div>

      {/* Credit Limits & Schedules */}
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">
          Platform Settings
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Configure credit limits and default payment schedules for each platform.
        </p>
        {platforms.map((platform) => (
          <PlatformSettings key={platform.id} platformId={platform.id} />
        ))}
      </Card>

      {/* Subscriptions */}
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">
          Subscriptions
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Track subscription costs and benefits for each platform.
        </p>
        {platforms.map((platform) => (
          <SubscriptionSettings key={platform.id} platformId={platform.id} />
        ))}
      </Card>

      {/* Data Management */}
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">
          Data Management
        </h2>
        <div className="space-y-4">
          {/* Export */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white">Export Data</p>
              <p className="text-sm text-gray-400">
                Download all your data as a JSON file
              </p>
            </div>
            <Button onClick={handleExport}>Export</Button>
          </div>

          {/* Import */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white">Import Data</p>
              <p className="text-sm text-gray-400">
                Restore data from a previously exported file
              </p>
              {importError && (
                <p className="text-sm text-red-400 mt-1">{importError}</p>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Import
              </Button>
            </div>
          </div>

          {/* Clear */}
          <div className="flex items-center justify-between pt-4 border-t border-dark-border">
            <div>
              <p className="text-white">Clear All Data</p>
              <p className="text-sm text-gray-400">
                Delete all orders and payments. This cannot be undone.
              </p>
            </div>
            <Button variant="danger" onClick={() => setShowClearConfirm(true)}>
              Clear All
            </Button>
          </div>
        </div>
      </Card>

      {/* Clear Confirmation Modal */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear All Data"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete all your data? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowClearConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleClearAll}>
              Delete All Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
