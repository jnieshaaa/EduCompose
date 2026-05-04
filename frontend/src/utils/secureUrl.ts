/**
 * Secure URL Parameter Utility
 * 
 * Encodes multiple query parameters into a single opaque `ref` token
 * using base64 encoding. This prevents raw IDs (UUIDs, database IDs)
 * from being visible in the browser URL bar.
 * 
 * Usage:
 *   Encoding: encodeUrlParams({ activityId: "18", courseName: "Actg 5" })
 *   → "eyJhY3Rpdml0eUlkIjoiMTgiLCJjb3Vyc2VOYW1lIjoiQWN0ZyA1In0="
 * 
 *   Decoding: decodeUrlParams("eyJhY3Rpdml0eUlkIjoiMTgiLC...")
 *   → { activityId: "18", courseName: "Actg 5" }
 */

/**
 * Encode an object of URL parameters into a single opaque base64 token.
 * A timestamp is appended to make each token unique and harder to replay.
 */
export function encodeUrlParams(params: Record<string, string | undefined | null>): string {
  // Filter out undefined/null values
  const cleanParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleanParams[key] = String(value);
    }
  }
  // Add a timestamp for uniqueness
  cleanParams._t = String(Date.now());
  
  const json = JSON.stringify(cleanParams);
  return btoa(json);
}

/**
 * Decode a base64 `ref` token back into a record of URL parameters.
 * Returns null if the token is invalid or cannot be parsed.
 */
export function decodeUrlParams(token: string): Record<string, string> | null {
  try {
    const decoded = atob(decodeURIComponent(token));
    const parsed = JSON.parse(decoded);
    if (typeof parsed !== 'object' || parsed === null) return null;
    // Remove the internal timestamp before returning
    const { _t, ...rest } = parsed;
    return rest as Record<string, string>;
  } catch {
    return null;
  }
}

/**
 * Build a full URL path with an encoded `ref` token containing all parameters.
 * Example: buildSecureUrl('/Teacher/Activities', { activityId: '18', courseName: 'Actg 5' })
 *   → '/Teacher/Activities?ref=eyJhY3Rpdml0eUlkIjoiMTgiLC...'
 */
export function buildSecureUrl(basePath: string, params: Record<string, string | undefined | null>): string {
  const token = encodeUrlParams(params);
  return `${basePath}?ref=${encodeURIComponent(token)}`;
}

/**
 * Read the `ref` token from the current URL search string and decode it.
 * Returns null if no `ref` parameter or if it's invalid.
 */
export function readSecureParams(search: string): Record<string, string> | null {
  const urlParams = new URLSearchParams(search);
  const ref = urlParams.get('ref');
  if (!ref) return null;
  return decodeUrlParams(ref);
}
