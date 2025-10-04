export interface TemplateMetadata {
  name: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
}

export interface PortSchema {
  name: string;
  schema_ref: string;
  description: string;
}

export interface Template {
  template_id: string;
  version: string;
  metadata: TemplateMetadata;
  executor: string;
  interface: string;
  required_capabilities?: string[];
  configuration_schema: any;
  default_input_ports: PortSchema[];
  default_output_ports: PortSchema[];
  dynamic_input_ports?: boolean;
  cost_estimation?: {
    base_cost_usd: number;
    per_token_cost_usd: number;
  };
}

export interface TypeDefinition {
  type_id: string;
  version: string;
  schema: any;
}

export interface AdapterCapability {
  selector: string;
  selector_type: 'css' | 'xpath' | 'text';
  wait: {
    visible?: boolean;
    timeout_ms: number;
    stable_ms?: number;
    enabled?: boolean;
  };
  optional?: boolean;
  fallback_selectors?: string[];
}

export interface AdapterMetadata {
  name: string;
  description: string;
  author: string;
  provider_url: string;
  tested_on: string;
}

export interface Adapter {
  adapter_id: string;
  selector_version: string;
  metadata: AdapterMetadata;
  capabilities: Record<string, AdapterCapability>;
  recovery?: {
    on_timeout?: Array<{
      action: string;
      path?: string;
      level?: string;
      message?: string;
    }>;
    on_not_found?: Array<{
      action: string;
      level?: string;
      message?: string;
    }>;
  };
  navigation?: {
    base_url: string;
    login_required?: boolean;
    rate_limit_ms?: number;
  };
  known_issues?: Array<{
    description: string;
    workaround?: string;
  }>;
}

export interface RegistryIndex {
  version: string;
  last_updated: string;
  templates: Record<string, string[]>;
  types: string[];
  adapters: string[];
}