import type { ClearinghouseProvider } from "./index";
import { MockProvider } from "./mock-provider";
import { AvailityProvider } from "./availity-provider";

let cached: ClearinghouseProvider | null = null;

/**
 * Returns the active clearinghouse provider based on env config.
 * - "availity" -> AvailityProvider
 * - "mock" (or unset) -> MockProvider
 */
export function getClearinghouseProvider(providerName?: string): ClearinghouseProvider {
  if (cached) return cached;

  const name = providerName || process.env.CLEARINGHOUSE_PROVIDER || "mock";

  switch (name) {
    case "availity":
      cached = new AvailityProvider();
      break;
    case "mock":
      cached = new MockProvider();
      break;
    default:
      throw new Error(`Unknown clearinghouse provider: "${name}". Use "mock" or "availity".`);
  }

  return cached;
}

export function __resetProviderForTests(): void {
  cached = null;
}
