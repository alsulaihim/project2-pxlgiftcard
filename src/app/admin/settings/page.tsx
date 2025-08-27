"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase-config";
import { 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  Timestamp
} from "firebase/firestore";
import { 
  Settings, 
  Globe, 
  Mail, 
  MessageSquare, 
  CreditCard,
  Users,
  Palette,
  Key,
  Database,
  Save,
  Upload,
  Download,
  ToggleLeft,
  ToggleRight,
  AlertCircle
} from "lucide-react";
import { logAdminAction, AdminActionTypes } from "@/lib/admin-logging";

interface PlatformConfig {
  // Global Settings
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  systemAnnouncement?: string;
  featureFlags: {
    enableChat: boolean;
    enablePXLTransfers: boolean;
    enableGiftcardPurchase: boolean;
    enableKYC: boolean;
    enableSocialLogin: boolean;
  };

  // Email Templates
  emailTemplates: {
    welcomeEmail: {
      subject: string;
      enabled: boolean;
    };
    purchaseConfirmation: {
      subject: string;
      enabled: boolean;
    };
    tierUpgrade: {
      subject: string;
      enabled: boolean;
    };
    passwordReset: {
      subject: string;
      enabled: boolean;
    };
  };

  // Payment Configuration
  paymentConfig: {
    stripeEnabled: boolean;
    paypalEnabled: boolean;
    minPurchaseUSD: number;
    maxPurchaseUSD: number;
    processingFeePercent: number;
  };

  // Chat Configuration
  chatConfig: {
    maxMessageLength: number;
    fileUploadEnabled: boolean;
    maxFileSize: number; // in MB
    profanityFilterEnabled: boolean;
    linkSharingEnabled: boolean;
  };

  // API Configuration
  apiConfig: {
    rateLimitPerMinute: number;
    apiKeysEnabled: boolean;
    webhooksEnabled: boolean;
  };

  // Branding
  branding: {
    platformName: string;
    supportEmail: string;
    primaryColor: string;
    secondaryColor: string;
  };

  // Tier Configuration
  tierConfig: {
    enableTierProgression: boolean;
    showTierBadges: boolean;
    tierNames: {
      starter: string;
      rising: string;
      pro: string;
      pixlbeast: string;
      pixlionaire: string;
    };
  };

  lastUpdated?: Timestamp;
  updatedBy?: string;
}

const defaultConfig: PlatformConfig = {
  maintenanceMode: false,
  maintenanceMessage: "We're performing scheduled maintenance. We'll be back shortly!",
  systemAnnouncement: "",
  featureFlags: {
    enableChat: true,
    enablePXLTransfers: true,
    enableGiftcardPurchase: true,
    enableKYC: true,
    enableSocialLogin: true,
  },
  emailTemplates: {
    welcomeEmail: {
      subject: "Welcome to GiftCard + PXL Platform!",
      enabled: true,
    },
    purchaseConfirmation: {
      subject: "Your Gift Card Purchase Confirmation",
      enabled: true,
    },
    tierUpgrade: {
      subject: "Congratulations! You've reached {tier} tier!",
      enabled: true,
    },
    passwordReset: {
      subject: "Reset Your Password",
      enabled: true,
    },
  },
  paymentConfig: {
    stripeEnabled: true,
    paypalEnabled: true,
    minPurchaseUSD: 10,
    maxPurchaseUSD: 1000,
    processingFeePercent: 2.9,
  },
  chatConfig: {
    maxMessageLength: 500,
    fileUploadEnabled: true,
    maxFileSize: 10,
    profanityFilterEnabled: true,
    linkSharingEnabled: true,
  },
  apiConfig: {
    rateLimitPerMinute: 100,
    apiKeysEnabled: false,
    webhooksEnabled: true,
  },
  branding: {
    platformName: "GiftCard + PXL Platform",
    supportEmail: "support@pxlgiftcard.com",
    primaryColor: "#0070f3",
    secondaryColor: "#00d72f",
  },
  tierConfig: {
    enableTierProgression: true,
    showTierBadges: true,
    tierNames: {
      starter: "Starter",
      rising: "Rising",
      pro: "Pro",
      pixlbeast: "Pixlbeast",
      pixlionaire: "Pixlionaire",
    },
  },
};

export default function SettingsPage() {
  const { user, platformUser, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    'global' | 'email' | 'payment' | 'chat' | 'api' | 'branding' | 'tiers'
  >('global');
  const [config, setConfig] = useState<PlatformConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!authLoading && (!user || !platformUser || !isAdmin)) {
      router.push('/auth/signin?redirect=/admin/settings');
    }
  }, [user, platformUser, authLoading, isAdmin, router]);

  // Fetch configuration
  useEffect(() => {
    const fetchConfig = async () => {
      if (!user || !isAdmin) return;

      try {
        const configDoc = await getDoc(doc(db, 'system-config', 'platform'));
        if (configDoc.exists()) {
          setConfig(configDoc.data() as PlatformConfig);
        }
      } catch (error) {
        console.error('Error fetching config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [user, isAdmin]);

  const handleSave = async () => {
    if (!user || !platformUser) return;

    setSaving(true);
    try {
      const updatedConfig = {
        ...config,
        lastUpdated: Timestamp.now(),
        updatedBy: platformUser.email,
      };

      await setDoc(doc(db, 'system-config', 'platform'), updatedConfig);

      // Log admin action
      await logAdminAction(
        AdminActionTypes.CONFIG_UPDATE,
        user.uid,
        platformUser.email,
        'system-config/platform',
        'Updated platform configuration'
      );

      setHasChanges(false);
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleExportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `platform-config-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);
        setConfig({ ...importedConfig, lastUpdated: undefined, updatedBy: undefined });
        setHasChanges(true);
        alert('Configuration imported successfully! Remember to save changes.');
      } catch (error) {
        alert('Invalid configuration file');
      }
    };
    reader.readAsText(file);
  };

  const updateConfig = (updates: Partial<PlatformConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Platform Configuration</h1>
        <div className="flex space-x-4">
          <input
            type="file"
            id="import-config"
            accept=".json"
            onChange={handleImportConfig}
            className="hidden"
            aria-label="Import configuration"
          />
          <label
            htmlFor="import-config"
            className="flex items-center px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </label>
          <button
            onClick={handleExportConfig}
            className="flex items-center px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-900 p-1 rounded-lg overflow-x-auto">
        {[
          { id: 'global', label: 'Global', icon: Globe },
          { id: 'email', label: 'Email', icon: Mail },
          { id: 'payment', label: 'Payment', icon: CreditCard },
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'api', label: 'API', icon: Key },
          { id: 'branding', label: 'Branding', icon: Palette },
          { id: 'tiers', label: 'Tiers', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Global Settings Tab */}
      {activeTab === 'global' && (
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Global Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">Maintenance Mode</h3>
                <p className="text-sm text-gray-400">Take the platform offline for maintenance</p>
              </div>
              <button
                onClick={() => updateConfig({ maintenanceMode: !config.maintenanceMode })}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Toggle maintenance mode"
              >
                {config.maintenanceMode ? (
                  <ToggleRight className="h-8 w-8 text-blue-400" />
                ) : (
                  <ToggleLeft className="h-8 w-8" />
                )}
              </button>
            </div>

                          {config.maintenanceMode && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Maintenance Message
                </label>
                <textarea
                  value={config.maintenanceMessage || ''}
                  onChange={(e) => updateConfig({ maintenanceMessage: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  aria-label="Maintenance message"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                System Announcement
              </label>
              <textarea
                value={config.systemAnnouncement || ''}
                onChange={(e) => updateConfig({ systemAnnouncement: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Display a message to all users..."
                aria-label="System announcement"
              />
            </div>

            <div className="border-t border-gray-800 pt-4">
              <h3 className="text-lg font-medium text-white mb-4">Feature Flags</h3>
              <div className="space-y-3">
                {Object.entries(config.featureFlags).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">
                      {key.replace(/([A-Z])/g, ' $1').replace('enable', 'Enable')}
                    </span>
                    <button
                      onClick={() => updateConfig({
                        featureFlags: { ...config.featureFlags, [key]: !value }
                      })}
                      className="text-gray-400 hover:text-white transition-colors"
                      aria-label={`Toggle ${key}`}
                    >
                      {value ? (
                        <ToggleRight className="h-6 w-6 text-blue-400" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Templates Tab */}
      {activeTab === 'email' && (
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Email Templates</h2>
          
          <div className="space-y-6">
            {Object.entries(config.emailTemplates).map(([key, template]) => (
              <div key={key} className="border-b border-gray-800 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-white">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </h3>
                  <button
                    onClick={() => updateConfig({
                      emailTemplates: {
                        ...config.emailTemplates,
                        [key]: { ...template, enabled: !template.enabled }
                      }
                    })}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label={`Toggle ${key} email`}
                  >
                    {template.enabled ? (
                      <ToggleRight className="h-6 w-6 text-blue-400" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={template.subject}
                  onChange={(e) => updateConfig({
                    emailTemplates: {
                      ...config.emailTemplates,
                      [key]: { ...template, subject: e.target.value }
                    }
                  })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email subject..."
                  aria-label={`${key} email subject`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Configuration Tab */}
      {activeTab === 'payment' && (
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Payment Configuration</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Enable Stripe</span>
                <button
                  onClick={() => updateConfig({
                    paymentConfig: { ...config.paymentConfig, stripeEnabled: !config.paymentConfig.stripeEnabled }
                  })}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Toggle Stripe"
                >
                  {config.paymentConfig.stripeEnabled ? (
                    <ToggleRight className="h-6 w-6 text-blue-400" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Enable PayPal</span>
                <button
                  onClick={() => updateConfig({
                    paymentConfig: { ...config.paymentConfig, paypalEnabled: !config.paymentConfig.paypalEnabled }
                  })}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Toggle PayPal"
                >
                  {config.paymentConfig.paypalEnabled ? (
                    <ToggleRight className="h-6 w-6 text-blue-400" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Minimum Purchase (USD)
                </label>
                <input
                  type="number"
                  value={config.paymentConfig.minPurchaseUSD}
                  onChange={(e) => updateConfig({
                    paymentConfig: { ...config.paymentConfig, minPurchaseUSD: Number(e.target.value) }
                  })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  aria-label="Minimum purchase amount"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Maximum Purchase (USD)
                </label>
                <input
                  type="number"
                  value={config.paymentConfig.maxPurchaseUSD}
                  onChange={(e) => updateConfig({
                    paymentConfig: { ...config.paymentConfig, maxPurchaseUSD: Number(e.target.value) }
                  })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  aria-label="Maximum purchase amount"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Processing Fee (%)
              </label>
              <input
                type="number"
                value={config.paymentConfig.processingFeePercent}
                onChange={(e) => updateConfig({
                  paymentConfig: { ...config.paymentConfig, processingFeePercent: Number(e.target.value) }
                })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max="10"
                step="0.1"
                aria-label="Processing fee percentage"
              />
            </div>
          </div>
        </div>
      )}

      {/* Chat Configuration Tab */}
      {activeTab === 'chat' && (
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Chat Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Maximum Message Length
              </label>
              <input
                type="number"
                value={config.chatConfig.maxMessageLength}
                onChange={(e) => updateConfig({
                  chatConfig: { ...config.chatConfig, maxMessageLength: Number(e.target.value) }
                })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="50"
                max="5000"
                aria-label="Maximum message length"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">File Upload</h3>
                <p className="text-xs text-gray-400">Allow users to share files in chat</p>
              </div>
              <button
                onClick={() => updateConfig({
                  chatConfig: { ...config.chatConfig, fileUploadEnabled: !config.chatConfig.fileUploadEnabled }
                })}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Toggle file upload"
              >
                {config.chatConfig.fileUploadEnabled ? (
                  <ToggleRight className="h-6 w-6 text-blue-400" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            {config.chatConfig.fileUploadEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  value={config.chatConfig.maxFileSize}
                  onChange={(e) => updateConfig({
                    chatConfig: { ...config.chatConfig, maxFileSize: Number(e.target.value) }
                  })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="100"
                  aria-label="Maximum file size in MB"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Profanity Filter</span>
              <button
                onClick={() => updateConfig({
                  chatConfig: { ...config.chatConfig, profanityFilterEnabled: !config.chatConfig.profanityFilterEnabled }
                })}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Toggle profanity filter"
              >
                {config.chatConfig.profanityFilterEnabled ? (
                  <ToggleRight className="h-6 w-6 text-blue-400" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Link Sharing</span>
              <button
                onClick={() => updateConfig({
                  chatConfig: { ...config.chatConfig, linkSharingEnabled: !config.chatConfig.linkSharingEnabled }
                })}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Toggle link sharing"
              >
                {config.chatConfig.linkSharingEnabled ? (
                  <ToggleRight className="h-6 w-6 text-blue-400" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Configuration Tab */}
      {activeTab === 'api' && (
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">API Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Rate Limit (requests per minute)
              </label>
              <input
                type="number"
                value={config.apiConfig.rateLimitPerMinute}
                onChange={(e) => updateConfig({
                  apiConfig: { ...config.apiConfig, rateLimitPerMinute: Number(e.target.value) }
                })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="10"
                max="1000"
                aria-label="API rate limit per minute"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Enable API Keys</span>
              <button
                onClick={() => updateConfig({
                  apiConfig: { ...config.apiConfig, apiKeysEnabled: !config.apiConfig.apiKeysEnabled }
                })}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Toggle API keys"
              >
                {config.apiConfig.apiKeysEnabled ? (
                  <ToggleRight className="h-6 w-6 text-blue-400" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Enable Webhooks</span>
              <button
                onClick={() => updateConfig({
                  apiConfig: { ...config.apiConfig, webhooksEnabled: !config.apiConfig.webhooksEnabled }
                })}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Toggle webhooks"
              >
                {config.apiConfig.webhooksEnabled ? (
                  <ToggleRight className="h-6 w-6 text-blue-400" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Branding</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Platform Name
              </label>
              <input
                type="text"
                value={config.branding.platformName}
                onChange={(e) => updateConfig({
                  branding: { ...config.branding, platformName: e.target.value }
                })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Platform name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Support Email
              </label>
              <input
                type="email"
                value={config.branding.supportEmail}
                onChange={(e) => updateConfig({
                  branding: { ...config.branding, supportEmail: e.target.value }
                })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Support email"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Primary Color
                </label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    value={config.branding.primaryColor}
                    onChange={(e) => updateConfig({
                      branding: { ...config.branding, primaryColor: e.target.value }
                    })}
                    className="h-10 w-20 bg-gray-900 border border-gray-800 rounded cursor-pointer"
                    aria-label="Primary color picker"
                  />
                  <input
                    type="text"
                    value={config.branding.primaryColor}
                    onChange={(e) => updateConfig({
                      branding: { ...config.branding, primaryColor: e.target.value }
                    })}
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Primary color hex value"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Secondary Color
                </label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    value={config.branding.secondaryColor}
                    onChange={(e) => updateConfig({
                      branding: { ...config.branding, secondaryColor: e.target.value }
                    })}
                    className="h-10 w-20 bg-gray-900 border border-gray-800 rounded cursor-pointer"
                    aria-label="Secondary color picker"
                  />
                  <input
                    type="text"
                    value={config.branding.secondaryColor}
                    onChange={(e) => updateConfig({
                      branding: { ...config.branding, secondaryColor: e.target.value }
                    })}
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Secondary color hex value"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tier Configuration Tab */}
      {activeTab === 'tiers' && (
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Tier Configuration</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Enable Tier Progression</span>
              <button
                onClick={() => updateConfig({
                  tierConfig: { ...config.tierConfig, enableTierProgression: !config.tierConfig.enableTierProgression }
                })}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Toggle tier progression"
              >
                {config.tierConfig.enableTierProgression ? (
                  <ToggleRight className="h-6 w-6 text-blue-400" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Show Tier Badges</span>
              <button
                onClick={() => updateConfig({
                  tierConfig: { ...config.tierConfig, showTierBadges: !config.tierConfig.showTierBadges }
                })}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Toggle tier badges"
              >
                {config.tierConfig.showTierBadges ? (
                  <ToggleRight className="h-6 w-6 text-blue-400" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            <div className="border-t border-gray-800 pt-4">
              <h3 className="text-lg font-medium text-white mb-4">Tier Names</h3>
              <div className="space-y-3">
                {Object.entries(config.tierConfig.tierNames).map(([tier, name]) => (
                  <div key={tier}>
                    <label className="block text-sm font-medium text-gray-400 mb-2 capitalize">
                      {tier} Tier
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => updateConfig({
                        tierConfig: {
                          ...config.tierConfig,
                          tierNames: { ...config.tierConfig.tierNames, [tier]: e.target.value }
                        }
                      })}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-label={`${tier} tier name`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated Info */}
      {config.lastUpdated && (
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400">
                Last updated: {config.lastUpdated.toDate().toLocaleString('en-US')}
              </span>
            </div>
            <span className="text-gray-400">By: {config.updatedBy}</span>
          </div>
        </div>
      )}
    </div>
  );
}
