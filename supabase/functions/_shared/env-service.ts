/**
 * Environment service abstraction for cross-platform compatibility
 * Handles environment variable access in both Deno and Node.js environments
 */

export interface EnvService {
  get(key: string): string | undefined;
}

/**
 * Deno environment service implementation
 */
export class DenoEnvService implements EnvService {
  get(key: string): string | undefined {
    // Check if we're in a Deno environment
    if (
      typeof (globalThis as any).Deno !== "undefined" &&
      (globalThis as any).Deno?.env
    ) {
      return (globalThis as any).Deno.env.get(key);
    }
    return undefined;
  }
}

/**
 * Node.js environment service implementation
 */
export class NodeEnvService implements EnvService {
  get(key: string): string | undefined {
    // Check if we're in a Node.js environment
    if (typeof process !== "undefined" && process.env) {
      return process.env[key];
    }
    return undefined;
  }
}

/**
 * Universal environment service that automatically detects the runtime
 */
export class UniversalEnvService implements EnvService {
  private envService: EnvService;

  constructor() {
    // Auto-detect runtime and use appropriate service
    if (
      typeof (globalThis as any).Deno !== "undefined" &&
      (globalThis as any).Deno?.env
    ) {
      this.envService = new DenoEnvService();
    } else if (typeof process !== "undefined" && process.env) {
      this.envService = new NodeEnvService();
    } else {
      // Fallback for testing environments
      this.envService = new MockEnvService();
    }
  }

  get(key: string): string | undefined {
    return this.envService.get(key);
  }
}

/**
 * Mock environment service for testing
 */
export class MockEnvService implements EnvService {
  private mockEnv: Record<string, string> = {};

  set(key: string, value: string): void {
    this.mockEnv[key] = value;
  }

  get(key: string): string | undefined {
    return this.mockEnv[key];
  }

  clear(): void {
    this.mockEnv = {};
  }
}

// Export a default instance for convenience
export const envService = new UniversalEnvService(); 