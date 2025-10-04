export interface AdapterMetadata {
  name: string;
  description: string;
  author: string;
  provider_url: string;
  tested_on: string;
}

export interface CapabilityWait {
  visible?: boolean;
  enabled?: boolean;
  timeout_ms: number;
  stable_ms?: number;
}

export interface Capability {
  selector: string;
  selector_type: 'css' | 'xpath' | 'text';
  wait: CapabilityWait;
  optional?: boolean;
  fallback_selectors?: string[];
}

export interface RecoveryAction {
  action: 'screenshot' | 'log' | 'check_selector' | 'wait' | 'retry';
  path?: string;
  level?: 'error' | 'warn' | 'info';
  message?: string;
  capability?: string;
  if_found?: RecoveryAction;
  duration_ms?: number;
  then?: 'retry';
}

export interface AdapterRecovery {
  on_timeout?: RecoveryAction[];
  on_not_found?: RecoveryAction[];
}

export interface AdapterNavigation {
  base_url: string;
  login_required?: boolean;
  rate_limit_ms?: number;
}

export interface Adapter {
  adapter_id: string;
  selector_version: string;
  metadata: AdapterMetadata;
  capabilities: Record<string, Capability>;
  recovery?: AdapterRecovery;
  navigation: AdapterNavigation;
  known_issues?: Array<{
    description: string;
    workaround?: string;
  }>;
}

export interface AdapterExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  recovery_actions_taken?: RecoveryAction[];
  screenshot_path?: string;
}

export interface RateLimiter {
  checkLimit(provider: string): Promise<boolean>;
  recordRequest(provider: string): Promise<void>;
}