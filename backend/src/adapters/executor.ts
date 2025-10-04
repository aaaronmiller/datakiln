import * as puppeteer from 'puppeteer';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  Adapter,
  Capability,
  RecoveryAction,
  AdapterExecutionResult,
} from '../types/adapters.js';
import { RateLimiter } from './rateLimiter.js';

export class AdapterExecutor {
  private browser?: puppeteer.Browser;
  private page?: puppeteer.Page;
  private rateLimiter: RateLimiter;

  constructor(rateLimiter?: RateLimiter) {
    this.rateLimiter = rateLimiter || new RateLimiter();
  }

  /**
   * Initialize browser instance
   */
  async initialize(): Promise<void> {
    if (this.browser) {
      return; // Already initialized
    }

    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
  }

  /**
   * Close browser instance
   */
  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = undefined;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }

  /**
   * Execute a capability on the current page
   */
  async executeCapability(
    capability: string,
    adapter: Adapter,
    action: string,
    value?: any,
    timeoutOverride?: number
  ): Promise<AdapterExecutionResult> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    // Check rate limiting
    const provider = adapter.adapter_id.split('/')[2];
    const canProceed = await this.rateLimiter.checkLimit(provider);
    if (!canProceed) {
      return {
        success: false,
        error: `Rate limit exceeded for provider: ${provider}`
      };
    }

    const cap = adapter.capabilities[capability];
    if (!cap) {
      if (adapter.capabilities[capability]?.optional) {
        return { success: true }; // Skip optional capabilities
      }
      return {
        success: false,
        error: `Unknown capability: ${capability}`
      };
    }

    const recoveryActions: RecoveryAction[] = [];

    try {
      // Try primary selector
      let element = await this.waitForElement(this.page, cap, timeoutOverride);

      // Try fallbacks if primary fails
      if (!element && cap.fallback_selectors) {
        for (const fallbackSelector of cap.fallback_selectors) {
          element = await this.trySelector(this.page, fallbackSelector, cap.wait, timeoutOverride);
          if (element) break;
        }
      }

      if (!element) {
        // Handle not found
        const notFoundResult = await this.handleNotFound(adapter, capability, this.page);
        return {
          success: false,
          error: `Element not found for capability: ${capability}`,
          recovery_actions_taken: notFoundResult.recoveryActions,
          screenshot_path: notFoundResult.screenshotPath
        };
      }

      // Execute action
      const result = await this.executeAction(element, action, value);

      // Record successful request for rate limiting
      await this.rateLimiter.recordRequest(provider);

      return {
        success: true,
        data: result,
        recovery_actions_taken: recoveryActions
      };

    } catch (error) {
      // Handle timeout
      const timeoutResult = await this.handleTimeout(adapter, cap, this.page);
      return {
        success: false,
        error: `Capability execution failed: ${error}`,
        recovery_actions_taken: [...recoveryActions, ...timeoutResult.recoveryActions],
        screenshot_path: timeoutResult.screenshotPath
      };
    }
  }

  /**
   * Navigate to adapter's base URL
   */
  async navigateToAdapter(adapter: Adapter): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    // Check rate limiting before navigation
    const provider = adapter.adapter_id.split('/')[2];
    const canProceed = await this.rateLimiter.checkLimit(provider);
    if (!canProceed) {
      throw new Error(`Rate limit exceeded for provider: ${provider}`);
    }

    await this.page.goto(adapter.navigation.base_url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Record navigation request
    await this.rateLimiter.recordRequest(provider);

    // Apply rate limiting if specified
    if (adapter.navigation.rate_limit_ms) {
      await this.page.waitForTimeout(adapter.navigation.rate_limit_ms);
    }
  }

  /**
   * Take a screenshot for debugging
   */
  async takeScreenshot(filename: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const screenshotPath = path.join(process.cwd(), 'data', 'debug', filename);
    await fs.ensureDir(path.dirname(screenshotPath));
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }

  /**
   * Wait for element with capability configuration
   */
  private async waitForElement(
    page: puppeteer.Page,
    cap: Capability,
    timeoutOverride?: number
  ): Promise<puppeteer.ElementHandle | null> {
    const timeout = timeoutOverride || cap.wait.timeout_ms;

    try {
      await page.waitForSelector(cap.selector, {
        visible: cap.wait.visible,
        timeout: timeout,
        ...(cap.wait.enabled && { state: 'enabled' as const })
      });

      // Wait for stability if specified
      if (cap.wait.stable_ms) {
        await page.waitForTimeout(cap.wait.stable_ms);
      }

      return await page.$(cap.selector);
    } catch (error) {
      return null;
    }
  }

  /**
   * Try a specific selector
   */
  private async trySelector(
    page: puppeteer.Page,
    selector: string,
    wait: any,
    timeoutOverride?: number
  ): Promise<puppeteer.ElementHandle | null> {
    const timeout = timeoutOverride || wait.timeout_ms;

    try {
      await page.waitForSelector(selector, {
        visible: wait.visible,
        timeout: timeout,
        ...(wait.enabled && { state: 'enabled' as const })
      });

      if (wait.stable_ms) {
        await page.waitForTimeout(wait.stable_ms);
      }

      return await page.$(selector);
    } catch (error) {
      return null;
    }
  }

  /**
   * Execute action on element
   */
  private async executeAction(
    element: puppeteer.ElementHandle,
    action: string,
    value?: any
  ): Promise<any> {
    switch (action) {
      case 'type':
        await element.type(value || '');
        return true;

      case 'click':
        await element.click();
        return true;

      case 'extract':
        return await element.evaluate((el: any) => el.textContent);

      case 'extract_html':
        return await element.evaluate((el: any) => el.innerHTML);

      case 'get_attribute':
        return await element.evaluate((el: any, attr: string) => el.getAttribute(attr), value);

      case 'is_visible':
        return await element.isIntersectingViewport();

      case 'scroll_into_view':
        await element.evaluate((el: any) => el.scrollIntoView());
        return true;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Handle timeout recovery
   */
  private async handleTimeout(
    adapter: Adapter,
    cap: Capability,
    page: puppeteer.Page
  ): Promise<{ recoveryActions: RecoveryAction[], screenshotPath?: string }> {
    const recoveryActions: RecoveryAction[] = [];
    let screenshotPath: string | undefined;

    if (adapter.recovery?.on_timeout) {
      for (const action of adapter.recovery.on_timeout) {
        recoveryActions.push(action);

        switch (action.action) {
          case 'screenshot':
            const provider = adapter.adapter_id.split('/')[2];
            const filename = action.path
              ?.replace('{{provider}}', provider)
              ?.replace('{{capability}}', cap.selector) || `timeout-${provider}-${Date.now()}.png`;
            screenshotPath = await this.takeScreenshot(filename);
            break;

          case 'log':
            console.log(`[${action.level}] ${action.message}`);
            break;

          case 'check_selector':
            if (action.if_found) {
              // Check if rate limit selector exists
              try {
                await page.waitForSelector(action.capability!, { timeout: 5000 });
                // If found, execute if_found action
                if (action.if_found.action === 'wait') {
                  await page.waitForTimeout(action.if_found.duration_ms || 60000);
                  if (action.if_found.then === 'retry') {
                    // Retry would be handled by caller
                  }
                }
              } catch (e) {
                // Selector not found, continue
              }
            }
            break;
        }
      }
    }

    return { recoveryActions, screenshotPath };
  }

  /**
   * Handle not found recovery
   */
  private async handleNotFound(
    adapter: Adapter,
    capability: string,
    page: puppeteer.Page
  ): Promise<{ recoveryActions: RecoveryAction[], screenshotPath?: string, error?: string }> {
    const recoveryActions: RecoveryAction[] = [];
    let screenshotPath: string | undefined;

    if (adapter.recovery?.on_not_found) {
      for (const action of adapter.recovery.on_not_found) {
        recoveryActions.push(action);

        switch (action.action) {
          case 'log':
            console.log(`[${action.level}] ${action.message}`);
            break;

          case 'screenshot':
            const provider = adapter.adapter_id.split('/')[2];
            const filename = `not-found-${provider}-${capability}-${Date.now()}.png`;
            screenshotPath = await this.takeScreenshot(filename);
            break;
        }
      }
    }

    return { recoveryActions, screenshotPath };
  }
}