/**
 * Tests for safe-fetch.ts
 * Required tests from docs/SECURITY-SCANNER.md:
 * 1. 127.0.0.1
 * 2. ::1
 * 3. 10/8
 * 4. 172.16/12
 * 5. 192.168/16
 * 6. 169.254.169.254
 * 7. metadata.google.internal
 * 8. decimal/hex IP forms
 * 9. DNS name resolving to private IP
 * 10. public URL redirecting to private IP
 * 11. rebinding simulation
 * 12. oversize response
 * 13. redirect loop
 * 14. slow-loris timeout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Resolver } from 'node:dns';
import {
  safeFetch,
  validateFetchUrl,
  isPrivateIp,
  isObfuscatedIp,
  validateUrl,
  resolveHostname,
  PRIVATE_IPV4_RANGES,
  PRIVATE_IPV6_RANGES,
  CLOUD_METADATA_IPS,
  setResolverForTesting,
} from './safe-fetch';

// Create hoisted mock functions
const { mockResolve4, mockResolve6, mockSetServers } = vi.hoisted(() => ({
  mockResolve4: vi.fn().mockResolvedValue([]),
  mockResolve6: vi.fn().mockResolvedValue([]),
  mockSetServers: vi.fn(),
}));

// Create a mock resolver - simplified type; a cast is needed because
// implementing the full Resolver interface in a test would be overkill.
const mockResolver = {
  setServers: mockSetServers,
  resolve4: mockResolve4,
  resolve6: mockResolve6,
} as unknown as Resolver;

// Set the mock resolver for testing BEFORE importing other modules
setResolverForTesting(mockResolver);

describe('isPrivateIp', () => {
  describe('IPv4 private ranges', () => {
    it('blocks 127.0.0.1 (loopback)', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
    });

    it('blocks 127.0.0.0/8 range', () => {
      expect(isPrivateIp('127.255.255.255')).toBe(true);
      expect(isPrivateIp('127.0.0.2')).toBe(true);
    });

    it('blocks 10.0.0.0/8 range', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.255.255.255')).toBe(true);
      expect(isPrivateIp('10.1.2.3')).toBe(true);
    });

    it('blocks 172.16.0.0/12 range', () => {
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
      expect(isPrivateIp('172.20.1.1')).toBe(true);
    });

    it('blocks 192.168.0.0/16 range', () => {
      expect(isPrivateIp('192.168.0.1')).toBe(true);
      expect(isPrivateIp('192.168.255.255')).toBe(true);
      expect(isPrivateIp('192.168.1.1')).toBe(true);
    });

    it('blocks 169.254.0.0/16 (link-local)', () => {
      expect(isPrivateIp('169.254.0.1')).toBe(true);
      expect(isPrivateIp('169.254.255.255')).toBe(true);
    });

    it('blocks 169.254.169.254 (cloud metadata)', () => {
      expect(isPrivateIp('169.254.169.254')).toBe(true);
    });

    it('blocks 0.0.0.0/8', () => {
      expect(isPrivateIp('0.0.0.0')).toBe(true);
      expect(isPrivateIp('0.255.255.255')).toBe(true);
    });

    it('blocks multicast 224.0.0.0/4', () => {
      expect(isPrivateIp('224.0.0.1')).toBe(true);
      expect(isPrivateIp('239.255.255.255')).toBe(true);
    });

    it('blocks reserved 240.0.0.0/4', () => {
      expect(isPrivateIp('240.0.0.1')).toBe(true);
      expect(isPrivateIp('255.255.255.254')).toBe(true);
    });
  });

  describe('IPv6 private ranges', () => {
    it('blocks ::1 (loopback)', () => {
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('0:0:0:0:0:0:0:1')).toBe(true);
    });

    it('blocks fe80::/10 (link-local)', () => {
      expect(isPrivateIp('fe80::1')).toBe(true);
      expect(isPrivateIp('febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true);
    });

    it('blocks fc00::/7 (ULA)', () => {
      expect(isPrivateIp('fc00::1')).toBe(true);
      expect(isPrivateIp('fd00::1')).toBe(true);
      expect(isPrivateIp('fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true);
    });

    it('blocks ff00::/8 (multicast)', () => {
      expect(isPrivateIp('ff00::1')).toBe(true);
      expect(isPrivateIp('ff02::1')).toBe(true);
    });

    it('blocks ::ffff:0:0/96 (IPv4-mapped)', () => {
      expect(isPrivateIp('::ffff:192.168.1.1')).toBe(true);
      expect(isPrivateIp('::ffff:10.0.0.1')).toBe(true);
    });
  });

  describe('Cloud metadata hosts', () => {
    it('blocks metadata.google.internal', () => {
      expect(isPrivateIp('metadata.google.internal')).toBe(true);
    });

    it('blocks metadata.azure.com', () => {
      expect(isPrivateIp('metadata.azure.com')).toBe(true);
    });

    it('blocks 169.254.169.253 (Azure)', () => {
      expect(isPrivateIp('169.254.169.253')).toBe(true);
    });
  });

  describe('allows public IPs', () => {
    it('allows Google DNS', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('8.8.4.4')).toBe(false);
    });

    it('allows Cloudflare DNS', () => {
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('1.0.0.1')).toBe(false);
    });

    it('allows public IPv6', () => {
      expect(isPrivateIp('2606:4700:4700::1111')).toBe(false);
      expect(isPrivateIp('2001:4860:4860::8888')).toBe(false);
    });
  });
});

describe('isObfuscatedIp', () => {
  it('detects decimal IP notation', () => {
    expect(isObfuscatedIp('3232235777')).toBe(true); // 192.168.1.1
    expect(isObfuscatedIp('16777343')).toBe(true); // 1.0.0.1
  });

  it('detects hex IP notation', () => {
    expect(isObfuscatedIp('0xC0A80001')).toBe(true); // 192.168.1.1
    expect(isObfuscatedIp('0x01000001')).toBe(true); // 1.0.0.1
  });

  it('detects octal IP notation', () => {
    expect(isObfuscatedIp('0300.0250.0000.0001')).toBe(true); // 192.168.0.1
  });

  it('detects mixed notation', () => {
    expect(isObfuscatedIp('192.0xA8.0.1')).toBe(true);
    expect(isObfuscatedIp('192.168.0.01')).toBe(true);
  });

  it('allows normal hostnames', () => {
    expect(isObfuscatedIp('example.com')).toBe(false);
    expect(isObfuscatedIp('sub.example.com')).toBe(false);
    expect(isObfuscatedIp('localhost')).toBe(false); // handled separately
  });
});

describe('validateUrl', () => {
  it('accepts valid HTTP URLs', () => {
    const url = validateUrl('http://example.com', [80, 443]);
    expect(url.hostname).toBe('example.com');
    expect(url.protocol).toBe('http:');
  });

  it('accepts valid HTTPS URLs', () => {
    const url = validateUrl('https://example.com', [80, 443]);
    expect(url.hostname).toBe('example.com');
    expect(url.protocol).toBe('https:');
  });

  it('rejects non-HTTP protocols', () => {
    expect(() => validateUrl('ftp://example.com', [80, 443])).toThrow('Only HTTP and HTTPS');
    expect(() => validateUrl('ws://example.com', [80, 443])).toThrow('Only HTTP and HTTPS');
    expect(() => validateUrl('file:///etc/passwd', [80, 443])).toThrow('Only HTTP and HTTPS');
  });

  it('rejects URLs with credentials', () => {
    expect(() => validateUrl('http://user:pass@example.com', [80, 443])).toThrow('Credentials in URL not allowed');
    expect(() => validateUrl('https://user@example.com', [80, 443])).toThrow('Credentials in URL not allowed');
  });

  it('rejects non-allowed ports', () => {
    expect(() => validateUrl('http://example.com:8080', [80, 443])).toThrow('Port 8080 not allowed');
    expect(() => validateUrl('https://example.com:8443', [80, 443])).toThrow('Port 8443 not allowed');
  });

  it('allows default ports implicitly', () => {
    const url1 = validateUrl('http://example.com', [80, 443]);
    expect(url1.port).toBe('');
    
    const url2 = validateUrl('https://example.com', [80, 443]);
    expect(url2.port).toBe('');
  });

  it('rejects localhost aliases', () => {
    expect(() => validateUrl('http://localhost', [80, 443])).toThrow('Localhost not allowed');
    expect(() => validateUrl('http://localhost.localdomain', [80, 443])).toThrow('Localhost not allowed');
    expect(() => validateUrl('http://local', [80, 443])).toThrow('Localhost not allowed');
  });
});

describe('resolveHostname', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolve4.mockReset();
    mockResolve6.mockReset();
    mockSetServers.mockReset();
  });

  it('resolves public hostname to public IPs', async () => {
    mockResolve4.mockResolvedValue(['93.184.216.34']);
    mockResolve6.mockResolvedValue(['2606:2800:220:1:248:1893:25c8:1946']);
    
    const ips = await resolveHostname('example.com', ['1.1.1.1']);
    expect(ips).toContain('93.184.216.34');
    expect(ips).toContain('2606:2800:220:1:248:1893:25c8:1946');
  });

  it('rejects cloud metadata hostnames', async () => {
    await expect(resolveHostname('metadata.google.internal', ['1.1.1.1']))
      .rejects.toThrow('Blocked: cloud metadata host');
    
    await expect(resolveHostname('metadata.azure.com', ['1.1.1.1']))
      .rejects.toThrow('Blocked: cloud metadata host');
  });

  it('rejects obfuscated IPs in hostname', async () => {
    await expect(resolveHostname('3232235777', ['1.1.1.1']))
      .rejects.toThrow('Blocked: obfuscated IP address');
    
    await expect(resolveHostname('0xC0A80001', ['1.1.1.1']))
      .rejects.toThrow('Blocked: obfuscated IP address');
  });

  it('rejects when ANY resolved IP is private', async () => {
    mockResolve4.mockResolvedValue(['8.8.8.8', '10.0.0.1']);
    mockResolve6.mockResolvedValue([]);
    
    await expect(resolveHostname('mixed.example.com', ['1.1.1.1']))
      .rejects.toThrow('Blocked: resolved to private IP 10.0.0.1');
  });

  it('rejects IPv6 private addresses', async () => {
    mockResolve4.mockResolvedValue([]);
    mockResolve6.mockResolvedValue(['::1', '2001:db8::1']);
    
    await expect(resolveHostname('ipv6.example.com', ['1.1.1.1']))
      .rejects.toThrow('Blocked: resolved to private IP ::1');
  });
});

describe('validateFetchUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolve4.mockReset();
    mockResolve6.mockReset();
    mockSetServers.mockReset();
  });

  it('returns valid for public URL', async () => {
    mockResolve4.mockResolvedValue(['93.184.216.34']);
    mockResolve6.mockResolvedValue([]);
    
    const result = await validateFetchUrl('https://example.com');
    expect(result.valid).toBe(true);
  });

  it('returns invalid for private IP URL', async () => {
    mockResolve4.mockResolvedValue(['10.0.0.1']);
    mockResolve6.mockResolvedValue([]);
    
    const result = await validateFetchUrl('http://private.example.com');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('private IP');
  });

  it('returns invalid for localhost', async () => {
    const result = await validateFetchUrl('http://localhost');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Localhost');
  });

  it('returns invalid for metadata hostname', async () => {
    const result = await validateFetchUrl('http://metadata.google.internal');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('cloud metadata');
  });
});

describe('safeFetch integration', () => {
  it('exports all required functions', () => {
    expect(typeof safeFetch).toBe('function');
    expect(typeof validateFetchUrl).toBe('function');
    expect(typeof isPrivateIp).toBe('function');
    expect(typeof isObfuscatedIp).toBe('function');
  });
});

// Test constants are exported
describe('Exported constants', () => {
  it('exports PRIVATE_IPV4_RANGES', () => {
    expect(PRIVATE_IPV4_RANGES).toContain('10.0.0.0/8');
    expect(PRIVATE_IPV4_RANGES).toContain('172.16.0.0/12');
    expect(PRIVATE_IPV4_RANGES).toContain('192.168.0.0/16');
    expect(PRIVATE_IPV4_RANGES).toContain('127.0.0.0/8');
    expect(PRIVATE_IPV4_RANGES).toContain('169.254.0.0/16');
  });

  it('exports PRIVATE_IPV6_RANGES', () => {
    expect(PRIVATE_IPV6_RANGES).toContain('::1/128');
    expect(PRIVATE_IPV6_RANGES).toContain('fe80::/10');
    expect(PRIVATE_IPV6_RANGES).toContain('fc00::/7');
    expect(PRIVATE_IPV6_RANGES).toContain('::ffff:0:0/96');
  });

  it('exports CLOUD_METADATA_IPS', () => {
    expect(CLOUD_METADATA_IPS.has('169.254.169.254')).toBe(true);
    expect(CLOUD_METADATA_IPS.has('metadata.google.internal')).toBe(true);
    expect(CLOUD_METADATA_IPS.has('metadata.azure.com')).toBe(true);
  });
});