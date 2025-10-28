import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Settings, Save } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface AdminSettings {
  referral_enabled: boolean;
  referral_reward_percentage: number;
  referral_minimum_purchase: number;
  funding_charge_enabled: boolean;
  funding_charge_type: 'percentage' | 'fixed';
  funding_charge_value: number;
  funding_charge_min_deposit: number;
  funding_charge_max_deposit: number;
  referral_share_base_url: string;
  referral_min_payout: number;
  // Transfer settings
  transfer_enabled: boolean;
  transfer_min_amount: number;
  transfer_max_amount: number;
  transfer_charge_enabled: boolean;
  transfer_charge_type: 'percentage' | 'fixed';
  transfer_charge_value: number;
  // How it Works content
  referral_howitworks_step1_title: string;
  referral_howitworks_step1_desc: string;
  referral_howitworks_step2_title: string;
  referral_howitworks_step2_desc: string;
  referral_howitworks_step3_title: string;
  referral_howitworks_step3_desc: string;
  // Flutterwave settings
  flutterwave_secret_key: string;
  flutterwave_public_key: string;
  flutterwave_webhook_secret: string;
  flutterwave_environment: 'test' | 'live';
}

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings>({
    referral_enabled: true,
    referral_reward_percentage: 10,
    referral_minimum_purchase: 100,
    funding_charge_enabled: false,
    funding_charge_type: 'percentage',
    funding_charge_value: 2,
    funding_charge_min_deposit: 100,
    funding_charge_max_deposit: 0,
    referral_share_base_url: 'https://starlinenetworks.com/signup',
    referral_min_payout: 500,
    transfer_enabled: false,
    transfer_min_amount: 100,
    transfer_max_amount: 10000,
    transfer_charge_enabled: false,
    transfer_charge_type: 'percentage',
    transfer_charge_value: 1,
    referral_howitworks_step1_title: 'Share your referral code',
    referral_howitworks_step1_desc: 'Send your unique link to friends and family',
    referral_howitworks_step2_title: 'They sign up and purchase',
    referral_howitworks_step2_desc: 'Your friend creates an account and buys their first plan',
    referral_howitworks_step3_title: 'You earn commission',
    referral_howitworks_step3_desc: 'You earn 10% commission on every purchase they make. Minimum withdrawal is ₦500.',
    // Flutterwave settings
    flutterwave_secret_key: '',
    flutterwave_public_key: '',
    flutterwave_webhook_secret: '',
    flutterwave_environment: 'test',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: settingsData } = await supabase
        .from('admin_settings')
        .select('key, value');
      
      if (settingsData) {
        const settingsMap = settingsData.reduce((acc: any, setting: any) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {});
        
        console.log('Loading settings from database:', settingsMap);
        setSettings({
          referral_enabled: settingsMap.referral_enabled === 'true',
          referral_reward_percentage: parseFloat(settingsMap.referral_reward_percentage || '10'),
          referral_minimum_purchase: parseFloat(settingsMap.referral_minimum_purchase || '100'),
          funding_charge_enabled: settingsMap.funding_charge_enabled === 'true',
          funding_charge_type: settingsMap.funding_charge_type || 'percentage',
          funding_charge_value: parseFloat(settingsMap.funding_charge_value || '2'),
          funding_charge_min_deposit: parseFloat(settingsMap.funding_charge_min_deposit || '100'),
          funding_charge_max_deposit: parseFloat(settingsMap.funding_charge_max_deposit || '0'),
          referral_share_base_url: settingsMap.referral_share_base_url || 'https://starlinenetworks.com/signup',
          referral_min_payout: parseFloat(settingsMap.referral_min_payout || '500'),
          transfer_enabled: settingsMap.transfer_enabled === 'true',
          transfer_min_amount: parseFloat(settingsMap.transfer_min_amount || '100'),
          transfer_max_amount: parseFloat(settingsMap.transfer_max_amount || '10000'),
          transfer_charge_enabled: settingsMap.transfer_charge_enabled === 'true',
          transfer_charge_type: settingsMap.transfer_charge_type || 'percentage',
          transfer_charge_value: parseFloat(settingsMap.transfer_charge_value || '1'),
          referral_howitworks_step1_title: settingsMap.referral_howitworks_step1_title || 'Share your referral code',
          referral_howitworks_step1_desc: settingsMap.referral_howitworks_step1_desc || 'Send your unique link to friends and family',
          referral_howitworks_step2_title: settingsMap.referral_howitworks_step2_title || 'They sign up and purchase',
          referral_howitworks_step2_desc: settingsMap.referral_howitworks_step2_desc || 'Your friend creates an account and buys their first plan',
          referral_howitworks_step3_title: settingsMap.referral_howitworks_step3_title || 'You earn commission',
          referral_howitworks_step3_desc: settingsMap.referral_howitworks_step3_desc || 'You earn 10% commission on every purchase they make. Minimum withdrawal is ₦500.',
          // Flutterwave settings
          flutterwave_secret_key: settingsMap.flutterwave_secret_key || '',
          flutterwave_public_key: settingsMap.flutterwave_public_key || '',
          flutterwave_webhook_secret: settingsMap.flutterwave_webhook_secret || '',
          flutterwave_environment: settingsMap.flutterwave_environment || 'test',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      console.log('Saving settings:', settings);
      const updates = [
        { key: 'referral_enabled', value: settings.referral_enabled.toString() },
        { key: 'referral_reward_percentage', value: settings.referral_reward_percentage.toString() },
        { key: 'referral_minimum_purchase', value: settings.referral_minimum_purchase.toString() },
        { key: 'funding_charge_enabled', value: settings.funding_charge_enabled.toString() },
        { key: 'funding_charge_type', value: settings.funding_charge_type },
        { key: 'funding_charge_value', value: settings.funding_charge_value.toString() },
        { key: 'funding_charge_min_deposit', value: settings.funding_charge_min_deposit.toString() },
        { key: 'funding_charge_max_deposit', value: settings.funding_charge_max_deposit.toString() },
        { key: 'referral_share_base_url', value: settings.referral_share_base_url },
        { key: 'referral_min_payout', value: settings.referral_min_payout.toString() },
        { key: 'transfer_enabled', value: settings.transfer_enabled.toString() },
        { key: 'transfer_min_amount', value: settings.transfer_min_amount.toString() },
        { key: 'transfer_max_amount', value: settings.transfer_max_amount.toString() },
        { key: 'transfer_charge_enabled', value: settings.transfer_charge_enabled.toString() },
        { key: 'transfer_charge_type', value: settings.transfer_charge_type },
        { key: 'transfer_charge_value', value: settings.transfer_charge_value.toString() },
        { key: 'referral_howitworks_step1_title', value: settings.referral_howitworks_step1_title },
        { key: 'referral_howitworks_step1_desc', value: settings.referral_howitworks_step1_desc },
        { key: 'referral_howitworks_step2_title', value: settings.referral_howitworks_step2_title },
        { key: 'referral_howitworks_step2_desc', value: settings.referral_howitworks_step2_desc },
        { key: 'referral_howitworks_step3_title', value: settings.referral_howitworks_step3_title },
        { key: 'referral_howitworks_step3_desc', value: settings.referral_howitworks_step3_desc },
      ];

      for (const update of updates) {
        console.log('Saving update:', update);
        
        // Use upsert with proper conflict resolution
        const { error } = await supabase
          .from('admin_settings')
          .upsert(
            { key: update.key, value: update.value },
            { 
              onConflict: 'key',
              ignoreDuplicates: false 
            }
          );
        
        if (error) {
          console.error('Error saving setting:', update.key, error);
        }
      }

      console.log('All settings saved successfully');
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof AdminSettings, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <Card className="p-6 text-center text-gray-500">
        Loading settings...
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
      
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="text-blue-600" size={24} />
          <h3 className="text-lg font-semibold">Configuration</h3>
        </div>

        <div className="space-y-8">
          {/* Referral Program Settings */}
          <div>
            <h4 className="text-md font-semibold mb-4 text-gray-900">Referral Program</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableReferrals"
                    checked={settings.referral_enabled}
                    onChange={(e) => updateSetting('referral_enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="enableReferrals" className="text-sm font-medium text-gray-700">
                    Enable Referral Program
                  </label>
                </div>
                
                <Input
                  label="Referral Reward Percentage (%)"
                  type="number"
                  value={settings.referral_reward_percentage.toString()}
                  onChange={(value) => updateSetting('referral_reward_percentage', parseFloat(value) || 0)}
                  placeholder="10"
                />
                
                <Input
                  label="Minimum Purchase Amount (₦)"
                  type="number"
                  value={settings.referral_minimum_purchase.toString()}
                  onChange={(value) => updateSetting('referral_minimum_purchase', parseFloat(value) || 0)}
                  placeholder="100"
                />
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">Current Settings</h5>
                <p className="text-sm text-blue-800">
                  {settings.referral_enabled ? (
                    <>Users earn {settings.referral_reward_percentage}% of each referral's purchase amount (minimum ₦{settings.referral_minimum_purchase})</>
                  ) : (
                    'Referral program is currently disabled'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Funding Charges Settings */}
          <div>
            <h4 className="text-md font-semibold mb-4 text-gray-900">Funding Charges</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableCharges"
                    checked={settings.funding_charge_enabled}
                    onChange={(e) => updateSetting('funding_charge_enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="enableCharges" className="text-sm font-medium text-gray-700">
                    Enable Funding Charges
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Charge Type</label>
                  <select
                    value={settings.funding_charge_type}
                    onChange={(e) => updateSetting('funding_charge_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                
                <Input
                  label={`Charge Value (${settings.funding_charge_type === 'percentage' ? '%' : '₦'})`}
                  type="number"
                  value={settings.funding_charge_value.toString()}
                  onChange={(value) => updateSetting('funding_charge_value', parseFloat(value) || 0)}
                  placeholder="2"
                />
                
                <Input
                  label="Minimum Deposit (₦)"
                  type="number"
                  value={settings.funding_charge_min_deposit.toString()}
                  onChange={(value) => updateSetting('funding_charge_min_deposit', parseFloat(value) || 0)}
                  placeholder="100"
                />
                
                <Input
                  label="Maximum Deposit (₦, 0 = no limit)"
                  type="number"
                  value={settings.funding_charge_max_deposit.toString()}
                  onChange={(value) => updateSetting('funding_charge_max_deposit', parseFloat(value) || 0)}
                  placeholder="0"
                />
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h5 className="font-medium text-yellow-900 mb-2">Current Settings</h5>
                <p className="text-sm text-yellow-800">
                  {settings.funding_charge_enabled ? (
                    <>
                      {settings.funding_charge_type === 'percentage' 
                        ? `${settings.funding_charge_value}% charge` 
                        : `₦${settings.funding_charge_value} fixed charge`
                      } on deposits between ₦{settings.funding_charge_min_deposit} 
                      {settings.funding_charge_max_deposit > 0 && ` and ₦${settings.funding_charge_max_deposit}`}
                    </>
                  ) : (
                    'Funding charges are currently disabled'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Transfer Settings */}
          <div>
            <h4 className="text-md font-semibold mb-4 text-gray-900">Transfer Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableTransfers"
                    checked={settings.transfer_enabled}
                    onChange={(e) => updateSetting('transfer_enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="enableTransfers" className="text-sm font-medium text-gray-700">
                    Enable User Transfers
                  </label>
                </div>
                
                <Input
                  label="Minimum Transfer Amount (₦)"
                  type="number"
                  value={settings.transfer_min_amount.toString()}
                  onChange={(value) => {
                    const numValue = parseFloat(value);
                    console.log('Transfer min amount change:', value, 'parsed:', numValue);
                    updateSetting('transfer_min_amount', isNaN(numValue) ? 0 : numValue);
                  }}
                  placeholder="100"
                />
                
                <Input
                  label="Maximum Transfer Amount (₦)"
                  type="number"
                  value={settings.transfer_max_amount.toString()}
                  onChange={(value) => updateSetting('transfer_max_amount', parseFloat(value) || 0)}
                  placeholder="10000"
                />
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableTransferCharges"
                    checked={settings.transfer_charge_enabled}
                    onChange={(e) => updateSetting('transfer_charge_enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="enableTransferCharges" className="text-sm font-medium text-gray-700">
                    Enable Transfer Charges
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Charge Type</label>
                  <select
                    value={settings.transfer_charge_type}
                    onChange={(e) => updateSetting('transfer_charge_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                
                <Input
                  label={`Transfer Charge Value (${settings.transfer_charge_type === 'percentage' ? '%' : '₦'})`}
                  type="number"
                  value={settings.transfer_charge_value.toString()}
                  onChange={(value) => updateSetting('transfer_charge_value', parseFloat(value) || 0)}
                  placeholder="1"
                />
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h5 className="font-medium text-green-900 mb-2">Current Settings</h5>
                <p className="text-sm text-green-800">
                  {settings.transfer_enabled ? (
                    <>
                      Users can transfer between ₦{settings.transfer_min_amount} and ₦{settings.transfer_max_amount}
                      {settings.transfer_charge_enabled && (
                        <>
                          <br />
                          {settings.transfer_charge_type === 'percentage' 
                            ? `${settings.transfer_charge_value}% charge` 
                            : `₦${settings.transfer_charge_value} fixed charge`
                          } per transfer
                        </>
                      )}
                    </>
                  ) : (
                    'User transfers are currently disabled'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Referral How It Works (Editable Content) */}
          <div>
            <h4 className="text-md font-semibold mb-4 text-gray-900">Referral How It Works</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input
                  label="Referral Share Base URL (without ?ref=)"
                  value={settings.referral_share_base_url}
                  onChange={(value) => updateSetting('referral_share_base_url', value)}
                  placeholder="https://starlinenetworks.com/signup"
                />
                <Input
                  label="Minimum Payout (₦)"
                  type="number"
                  value={settings.referral_min_payout.toString()}
                  onChange={(value) => updateSetting('referral_min_payout', parseFloat(value) || 0)}
                  placeholder="500"
                />
                <Input
                  label="Step 1 Title"
                  value={settings.referral_howitworks_step1_title}
                  onChange={(value) => updateSetting('referral_howitworks_step1_title', value)}
                />
                <Input
                  label="Step 1 Description"
                  value={settings.referral_howitworks_step1_desc}
                  onChange={(value) => updateSetting('referral_howitworks_step1_desc', value)}
                />
                <Input
                  label="Step 2 Title"
                  value={settings.referral_howitworks_step2_title}
                  onChange={(value) => updateSetting('referral_howitworks_step2_title', value)}
                />
                <Input
                  label="Step 2 Description"
                  value={settings.referral_howitworks_step2_desc}
                  onChange={(value) => updateSetting('referral_howitworks_step2_desc', value)}
                />
                <Input
                  label="Step 3 Title"
                  value={settings.referral_howitworks_step3_title}
                  onChange={(value) => updateSetting('referral_howitworks_step3_title', value)}
                />
                <Input
                  label="Step 3 Description"
                  value={settings.referral_howitworks_step3_desc}
                  onChange={(value) => updateSetting('referral_howitworks_step3_desc', value)}
                />
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">Preview</h5>
                <ol className="space-y-3 list-decimal list-inside text-sm text-gray-700">
                  <li>
                    <span className="font-medium">{settings.referral_howitworks_step1_title}</span>
                    <div className="text-gray-600">{settings.referral_howitworks_step1_desc}</div>
                  </li>
                  <li>
                    <span className="font-medium">{settings.referral_howitworks_step2_title}</span>
                    <div className="text-gray-600">{settings.referral_howitworks_step2_desc}</div>
                  </li>
                  <li>
                    <span className="font-medium">{settings.referral_howitworks_step3_title}</span>
                    <div className="text-gray-600">{settings.referral_howitworks_step3_desc}</div>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Flutterwave Settings */}
          <div>
            <h4 className="text-md font-semibold mb-4 text-gray-900">Flutterwave Payment Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Environment</label>
                  <select
                    value={settings.flutterwave_environment}
                    onChange={(e) => updateSetting('flutterwave_environment', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="test">Test (Sandbox)</option>
                    <option value="live">Live (Production)</option>
                  </select>
                </div>
                
                <Input
                  label="Secret Key"
                  type="password"
                  value={settings.flutterwave_secret_key}
                  onChange={(value) => updateSetting('flutterwave_secret_key', value)}
                  placeholder="FLWSECK-xxxxx or FLWSECK_TEST-xxxxx"
                />
                
                <Input
                  label="Public Key"
                  value={settings.flutterwave_public_key}
                  onChange={(value) => updateSetting('flutterwave_public_key', value)}
                  placeholder="FLWPUBK-xxxxx or FLWPUBK_TEST-xxxxx"
                />
                
                <Input
                  label="Webhook Secret (Optional)"
                  type="password"
                  value={settings.flutterwave_webhook_secret}
                  onChange={(value) => updateSetting('flutterwave_webhook_secret', value)}
                  placeholder="Webhook verification secret"
                />
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <h5 className="font-medium text-orange-900 mb-2">Payment Configuration</h5>
                <div className="text-sm text-orange-800 space-y-2">
                  <p><strong>Environment:</strong> {settings.flutterwave_environment === 'test' ? 'Test (Sandbox)' : 'Live (Production)'}</p>
                  <p><strong>Secret Key:</strong> {settings.flutterwave_secret_key ? '••••••••' : 'Not set'}</p>
                  <p><strong>Public Key:</strong> {settings.flutterwave_public_key ? '••••••••' : 'Not set'}</p>
                  <div className="mt-3 p-2 bg-orange-100 rounded text-xs">
                    <strong>Note:</strong> Test keys start with FLWSECK_TEST- and FLWPUBK_TEST-. 
                    Live keys start with FLWSECK- and FLWPUBK-.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={saveSettings} disabled={saving}>
              <Save size={16} className="mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
