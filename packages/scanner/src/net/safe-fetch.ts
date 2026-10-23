/**
 * Safe fetch implementation for SSRF protection.
 * Requirements from docs/SECURITY-SCANNER.md:
 * - Only http/https; ports 80/443 (allowlist, configurable)
 * - Resolve DNS yourself; reject if ANY resolved IP is private/loopback/link-local/CGNAT/multicast/reserved
 *   incl. IPv6 (::1, fc00::/7, fe80::/10, IPv4-mapped), 169.254.169.254 and cloud metadata hosts
 * - Connect to the validated IP (pin it; defeat DNS rebinding) while sending original Host/SNI
 * - Follow redirects manually: max 5, re-validate every hop (scheme, host, IP)
 * - Limits: timeout 10s/request, 20s total per page, response size 2MB
 * - Reject credentials in URLs, weird encodings (decimal/octal IPs), localhost aliases
 * - Never forward cookies/auth headers; set clear User-Agent with abuse contact URL
 */

import { createConnection, type Socket } from 'net';
import { connect as tlsConnect, type TLSSocket } from 'tls';
import { URL } from 'url';
import { Resolver } from 'dns';

// Default resolver instance (can be replaced for testing)
let resolverInstance: Resolver = new Resolver();

export function setResolverForTesting(resolver: Resolver): void {
  resolverInstance = resolver;
}

export function getResolver(): Resolver {
  return resolverInstance;
}

export interface SafeFetchOptions {
  maxRedirects?: number;
  requestTimeoutMs?: number;
  totalTimeoutMs?: number;
  maxResponseSizeBytes?: number;
  allowedPorts?: number[];
  userAgent?: string;
  abuseContactUrl?: string;
  dnsServers?: string[];
}

export interface SafeFetchResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  finalUrl: string;
  redirected: boolean;
  redirectChain: string[];
}

export interface ValidatedTarget {
  hostname: string;
  ip: string;
  port: number;
  isTls: boolean;
  sni: string;
}

// Default configuration
const DEFAULT_OPTIONS: Required<SafeFetchOptions> = {
  maxRedirects: 5,
  requestTimeoutMs: 10_000,
  totalTimeoutMs: 20_000,
  maxResponseSizeBytes: 2 * 1024 * 1024, // 2MB
  allowedPorts: [80, 443],
  userAgent: 'SiteHealth/1.0 (+https://sitehealth.example.com/abuse)',
  abuseContactUrl: 'https://sitehealth.example.com/abuse',
  dnsServers: ['1.1.1.1', '8.8.8.8'],
};

// Private IP ranges (CIDR)
const PRIVATE_IPV4_RANGES = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '0.0.0.0/8',
  '224.0.0.0/4',
  '240.0.0.0/4',
  '255.255.255.255/32',
];

const PRIVATE_IPV6_RANGES = [
  '::1/128',
  'fe80::/10',
  'fc00::/7',
  'ff00::/8',
  '::/128',
  '::ffff:0:0/96', // IPv4-mapped
  '64:ff9b::/96',  // IPv4-IPv6 translation
  '100::/64',      // Discard prefix
  '2001:db8::/32', // Documentation
];

// Cloud metadata IPs/hosts
const CLOUD_METADATA_IPS = new Set([
  '169.254.169.254',      // AWS/GCP/Azure/DigitalOcean
  '169.254.169.253',      // Azure
  'metadata.google.internal',
  'metadata.azure.com',
  '169.254.170.2',        // ECS metadata
]);

/**
 * Parse IP address and check if it's in private/reserved ranges
 */
function ipToLong(ip: string): bigint | null {
  if (ip.includes(':')) {
    // IPv6 - simplified check for common private ranges
    return null; // We'll use string matching for IPv6
  }
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => p < 0 || p > 255)) return null;
  return (BigInt(parts[0]) << 24n) | (BigInt(parts[1]) << 16n) | (BigInt(parts[2]) << 8n) | BigInt(parts[3]);
}

function ipInCidr(ip: string, cidr: string): boolean {
  const [rangeIp, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  
  if (rangeIp.includes(':')) {
    // IPv6 - simplified: check common prefixes
    if (cidr === '::1/128') return ip === '::1' || ip === '0:0:0:0:0:0:0:1';
    if (cidr === 'fe80::/10') {
      // fe80::/10 covers fe80:: to febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff
      const firstHextet = parseInt(ip.split(':')[0], 16);
      return firstHextet >= 0xfe80 && firstHextet <= 0xfebf;
    }
    if (cidr === 'fc00::/7') {
      const firstHextet = parseInt(ip.split(':')[0], 16);
      return firstHextet >= 0xfc00 && firstHextet <= 0xfdff;
    }
    if (cidr === 'ff00::/8') return ip.startsWith('ff');
    if (cidr === '::ffff:0:0/96') return ip.startsWith('::ffff:');
    return false;
  }
  
  const ipLong = ipToLong(ip);
  const rangeLong = ipToLong(rangeIp);
  if (ipLong === null || rangeLong === null) return false;
  
  const mask = ~((1n << (32n - BigInt(prefix))) - 1n);
  return (ipLong & mask) === (rangeLong & mask);
}

function isPrivateIp(ip: string): boolean {
  // Check IPv4 private ranges
  for (const range of PRIVATE_IPV4_RANGES) {
    if (ipInCidr(ip, range)) return true;
  }
  
  // Check IPv6 private ranges
  for (const range of PRIVATE_IPV6_RANGES) {
    if (ipInCidr(ip, range)) return true;
  }
  
  // Check cloud metadata IPs
  if (CLOUD_METADATA_IPS.has(ip)) return true;
  
  return false;
}

/**
 * Resolve hostname to IPs, rejecting if ANY IP is private
 */
async function resolveHostname(hostname: string, dnsServers: string[]): Promise<string[]> {
  // Check if hostname is a cloud metadata host
  if (CLOUD_METADATA_IPS.has(hostname.toLowerCase())) {
    throw new Error(`Blocked: cloud metadata host ${hostname}`);
  }
  
  // Check for decimal/octal/hex IP notation in hostname
  if (isObfuscatedIp(hostname)) {
    throw new Error(`Blocked: obfuscated IP address ${hostname}`);
  }
  
  const resolver = getResolver();
  
  try {
    resolver.setServers(dnsServers);
    
    // Use the resolver's promise-based methods (Node.js 18+)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addresses = await (resolver as any).resolve4(hostname);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ipv6Addresses = await (resolver as any).resolve6(hostname).catch(() => [] as string[]);
    
    const allIps = [...addresses, ...ipv6Addresses];
    
    // Check each resolved IP
    for (const ip of allIps) {
      if (isPrivateIp(ip)) {
        throw new Error(`Blocked: resolved to private IP ${ip}`);
      }
    }
    
    if (allIps.length === 0) {
      throw new Error(`No IP addresses resolved for ${hostname}`);
    }
    
    return allIps;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Blocked')) throw error;
    throw new Error(`DNS resolution failed for ${hostname}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if hostname is an obfuscated IP (decimal, hex, octal)
 */
function isObfuscatedIp(hostname: string): boolean {
  // Decimal notation (e.g., http://3232235777/)
  if (/^\d+$/.test(hostname)) {
    const num = parseInt(hostname, 10);
    if (num >= 0 && num <= 0xffffffff) return true;
  }
  
  // Hex notation (e.g., http://0xC0A80001/)
  if (/^0x[0-9a-fA-F]+$/.test(hostname)) {
    const num = parseInt(hostname, 16);
    if (num >= 0 && num <= 0xffffffff) return true;
  }
  
  // Octal notation (e.g., http://0300.0250.0000.0001/)
  if (/^0[0-7]+(\.0[0-7]+){3}$/.test(hostname)) {
    return true;
  }
  
  // Mixed notation
  if (/^(\d+|0x[0-9a-fA-F]+|0[0-7]+)(\.(\d+|0x[0-9a-fA-F]+|0[0-7]+)){3}$/.test(hostname)) {
    return true;
  }
  
  return false;
}

/**
 * Validate URL before fetching
 */
function validateUrl(urlString: string, allowedPorts: number[]): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error('Invalid URL');
  }
  
  // Only http/https
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols allowed');
  }
  
  // Reject credentials in URL
  if (url.username || url.password) {
    throw new Error('Credentials in URL not allowed');
  }
  
  // Check port
  const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
  if (!allowedPorts.includes(port)) {
    throw new Error(`Port ${port} not allowed`);
  }
  
  // Check for localhost aliases
  const hostname = url.hostname.toLowerCase();
  if (['localhost', 'localhost.localdomain', 'local'].includes(hostname)) {
    throw new Error('Localhost not allowed');
  }
  
  return url;
}

/**
 * Create HTTP request
 */
function createRequest(
  method: string,
  url: URL,
  headers: Record<string, string>,
  body?: string
): string {
  const path = url.pathname + url.search || '/';
  const requestLines = [`${method} ${path} HTTP/1.1`];
  
  const requestHeaders: Record<string, string> = {
    Host: url.host,
    'User-Agent': headers['User-Agent'] || DEFAULT_OPTIONS.userAgent,
    Accept: '*/*',
    Connection: 'close',
    ...headers,
  };
  
  // Never forward cookies/auth
  delete requestHeaders.Cookie;
  delete requestHeaders.Authorization;
  delete requestHeaders.cookie;
  delete requestHeaders.authorization;
  
  for (const [key, value] of Object.entries(requestHeaders)) {
    requestLines.push(`${key}: ${value}`);
  }
  
  requestLines.push('', '');
  
  let request = requestLines.join('\r\n');
  if (body) {
    request += body;
  }
  
  return request;
}

/**
 * Parse HTTP response
 */
function parseResponse(response: string): { statusCode: number; headers: Record<string, string>; body: string } {
  const [head, ...bodyParts] = response.split('\r\n\r\n');
  const body = bodyParts.join('\r\n\r\n');
  const lines = head.split('\r\n');
  
  const statusLine = lines[0];
  const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d{3})/);
  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 0;
  
  const headers: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    const colonIndex = lines[i].indexOf(':');
    if (colonIndex > 0) {
      const key = lines[i].substring(0, colonIndex).toLowerCase();
      const value = lines[i].substring(colonIndex + 1).trim();
      headers[key] = value;
    }
  }
  
  return { statusCode, headers, body };
}

/**
 * Check if status code is a redirect
 */
function isRedirect(statusCode: number): boolean {
  return [301, 302, 303, 307, 308].includes(statusCode);
}

/**
 * Get redirect location
 */
function getRedirectLocation(headers: Record<string, string>, currentUrl: URL): URL | null {
  const location = headers.location || headers.Location;
  if (!location) return null;
  
  try {
    return new URL(location, currentUrl.toString());
  } catch {
    return null;
  }
}

/**
 * Main safe fetch function
 */
export async function safeFetch(
  urlString: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  const redirectChain: string[] = [urlString];
  let currentUrl = validateUrl(urlString, opts.allowedPorts);
  let redirected = false;
  
  for (let redirectCount = 0; redirectCount <= opts.maxRedirects; redirectCount++) {
    // Check total timeout
    if (Date.now() - startTime > opts.totalTimeoutMs) {
      throw new Error('Total timeout exceeded');
    }
    
    // Resolve hostname
    const ips = await resolveHostname(currentUrl.hostname, opts.dnsServers);
    const ip = ips[0]; // Use first resolved IP (pin it)
    
    // Validate the resolved IP again (defeat DNS rebinding)
    if (isPrivateIp(ip)) {
      throw new Error(`Blocked: resolved IP ${ip} is private`);
    }
    
    const port = currentUrl.port ? parseInt(currentUrl.port, 10) : (currentUrl.protocol === 'https:' ? 443 : 80);
    const isTls = currentUrl.protocol === 'https:';
    
    // Create connection with timeout
    const socket = await createConnectionWithTimeout(ip, port, isTls, currentUrl.hostname, opts.requestTimeoutMs);
    
    try {
      // Send request
      const request = createRequest('GET', currentUrl, { 'User-Agent': opts.userAgent });
      socket.write(request);
      
      // Read response with size limit
      const response = await readResponseWithLimits(socket, opts.maxResponseSizeBytes, opts.requestTimeoutMs);
      
      const { statusCode, headers, body } = parseResponse(response);
      
      // Handle redirect
      if (isRedirect(statusCode) && redirectCount < opts.maxRedirects) {
        const location = getRedirectLocation(headers, currentUrl);
        if (location) {
          // Validate redirect target
          const newUrl = validateUrl(location.toString(), opts.allowedPorts);
          
          // Re-resolve and validate the new hostname
          const newIps = await resolveHostname(newUrl.hostname, opts.dnsServers);
          for (const newIp of newIps) {
            if (isPrivateIp(newIp)) {
              throw new Error(`Blocked: redirect to private IP ${newIp}`);
            }
          }
          
          currentUrl = newUrl;
          redirectChain.push(currentUrl.toString());
          redirected = true;
          socket.destroy();
          continue;
        }
      }
      
      return {
        statusCode,
        headers,
        body,
        finalUrl: currentUrl.toString(),
        redirected,
        redirectChain,
      };
    } finally {
      socket.destroy();
    }
  }
  
  throw new Error(`Too many redirects (max ${opts.maxRedirects})`);
}

/**
 * Create connection with timeout and TLS support
 */
function createConnectionWithTimeout(
  ip: string,
  port: number,
  isTls: boolean,
  sni: string,
  timeoutMs: number
): Promise<Socket | TLSSocket> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, timeoutMs);
    
    const onError = (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    };
    
    if (isTls) {
      const tlsOptions = {
        host: ip,
        port,
        servername: sni,
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2' as const,
      };
      
      const socket = tlsConnect(tlsOptions, () => {
        clearTimeout(timeout);
        if (socket.authorized) {
          resolve(socket);
        } else {
          reject(new Error(`TLS certificate verification failed: ${socket.authorizationError?.message}`));
        }
      });
      
      socket.on('error', onError);
    } else {
      const socket = createConnection({ host: ip, port }, () => {
        clearTimeout(timeout);
        resolve(socket);
      });
      
      socket.on('error', onError);
    }
  });
}

/**
 * Read response with size and timeout limits
 */
function readResponseWithLimits(
  socket: Socket | TLSSocket,
  maxSize: number,
  timeoutMs: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    let timeout: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Read timeout'));
      }, timeoutMs);
    };
    
    socket.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxSize) {
        socket.destroy();
        reject(new Error(`Response size exceeds ${maxSize} bytes limit`));
        return;
      }
      data += chunk.toString('utf8');
      resetTimeout();
    });
    
    socket.on('end', () => {
      clearTimeout(timeout);
      resolve(data);
    });
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    
    resetTimeout();
  });
}

/**
 * Validate a URL without fetching (for pre-checking)
 */
export async function validateFetchUrl(urlString: string, options: SafeFetchOptions = {}): Promise<{ valid: boolean; error?: string }> {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const url = validateUrl(urlString, opts.allowedPorts);
    const ips = await resolveHostname(url.hostname, opts.dnsServers);
    
    for (const ip of ips) {
      if (isPrivateIp(ip)) {
        return { valid: false, error: `Resolves to private IP: ${ip}` };
      }
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Validation failed' };
  }
}

// Export for testing
export { 
  isPrivateIp, 
  isObfuscatedIp, 
  validateUrl, 
  resolveHostname, 
  PRIVATE_IPV4_RANGES, 
  PRIVATE_IPV6_RANGES, 
  CLOUD_METADATA_IPS,
};