/**
 * API Fetcher Utility
 * Standardizes API communication and prevents path duplication (/api/api/).
 */

export async function apiFetch(url, options = {}) {
  // 1. Sanitize Base URL: Remove trailing slashes and any trailing '/api'
  let rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
  rawBase = rawBase.replace(/\/+$/, '').replace(/\/api$/i, '');
  const BASE_URL = rawBase;

  // 2. Normalization logic for endpoint path:
  // - Ensure leading slash
  // - Deduplicate repetitive '/api' prefixes (e.g. '/api/api/path' -> '/api/path')
  // - Ensure path starts with '/api'
  let cleanPath = url.startsWith('/') ? url : `/${url}`;
  cleanPath = cleanPath.replace(/^(\/api)+/i, '/api'); // Collapse double/triple /api prefixes
  if (!cleanPath.startsWith('/api')) {
    cleanPath = `/api${cleanPath}`;
  }

  // 3. Construct clean full URL (e.g., http://127.0.0.1:5000/api/purchase/orders)
  const fullUrl = `${BASE_URL}${cleanPath}`;

  const config = {
    ...options,
    cache: 'no-store', // Force Next.js to fetch fresh data
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate', // Prevent browser caching
      // Attach JWT token if available (client-side only)
      ...((typeof window !== 'undefined' && localStorage.getItem('token'))
          ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          : {}),
      ...options.headers
    }
  };

  try {
    const response = await fetch(fullUrl, config);

    // 1. Handle Unauthorized (401)
    if (response.status === 401) {
      if (typeof window !== 'undefined') localStorage.removeItem('token');
      return { data: null, error: 'Unauthorized', status: 401 };
    }

    // 2. Safe JSON parsing
    const text = await response.text();
    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error(`[Format Error] ${fullUrl} returned non-JSON response.`);
      return { data: null, error: 'Server returned invalid data format', status: 500 };
    }

    // 3. Handle non-2xx statuses (Errors)
    if (!response.ok) {
      const errorMessage = data.message || data.error || `Status ${response.status}`;
      console.error(`[API Error] ${fullUrl}:`, { status: response.status, message: errorMessage });
      return { data: null, error: errorMessage, status: response.status };
    }

    // 4. Return successful response
    return { data, error: null, status: response.status };
  } catch (error) {
    console.error(`[Network Error] ${fullUrl}:`, error.message);
    return { data: null, error: error.message, status: 0 };
  }
}