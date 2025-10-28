import { createClient } from 'npm:@supabase/supabase-js@2'

export interface FlutterwaveConfig {
  secretKey: string;
  publicKey?: string;
  webhookSecret?: string;
  environment: 'test' | 'live';
}

export async function getFlutterwaveConfig(): Promise<FlutterwaveConfig> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: settings, error } = await supabaseClient
    .from('admin_settings')
    .select('key, value')
    .in('key', [
      'flutterwave_secret_key',
      'flutterwave_public_key', 
      'flutterwave_webhook_secret',
      'flutterwave_environment'
    ])

  if (error) {
    throw new Error(`Failed to load Flutterwave configuration: ${error.message}`)
  }

  const settingsMap = settings?.reduce((acc: any, setting: any) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {}) || {}

  const secretKey = settingsMap.flutterwave_secret_key
  if (!secretKey) {
    throw new Error('Flutterwave secret key not configured in admin settings')
  }

  return {
    secretKey,
    publicKey: settingsMap.flutterwave_public_key || '',
    webhookSecret: settingsMap.flutterwave_webhook_secret || '',
    environment: settingsMap.flutterwave_environment || 'test'
  }
}

export function getFlutterwaveApiUrl(environment: 'test' | 'live' = 'test'): string {
  // Both test and live use the same URL - the environment is determined by the API keys
  return 'https://api.flutterwave.com/v3'
}