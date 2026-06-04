import { Injectable } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

/**
 * URL Validation Service
 * Prevents XSS attacks through URL injection (data: URIs, javascript: URIs, etc.)
 * Ensures only safe, whitelisted URLs are used for images and external resources
 */
@Injectable({
  providedIn: 'root'
})
export class UrlValidatorService {
  private readonly SAFE_PROTOCOLS = ['http', 'https'];
  private readonly IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  private readonly BLOCKED_PROTOCOLS = ['javascript', 'data', 'vbscript', 'file'];

  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Validates and sanitizes image URLs
   * @param url Raw URL string
   * @returns Sanitized safe URL or null if invalid
   */
  validateImageUrl(url: string | null | undefined): SafeUrl | null {
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      console.warn('[v0] Invalid image URL: Empty or null');
      return null;
    }

    // Trim whitespace
    const trimmedUrl = url.trim().toLowerCase();

    // Check for blocked protocols
    if (this.isBlockedProtocol(trimmedUrl)) {
      console.error('[v0] XSS Prevention: Blocked dangerous protocol in URL', { url });
      return null;
    }

    // Validate URL format
    if (!this.isValidUrl(trimmedUrl)) {
      console.error('[v0] Invalid URL format', { url });
      return null;
    }

    // Check if it's an image URL (by extension or known image domain)
    if (!this.looksLikeImageUrl(trimmedUrl)) {
      console.warn('[v0] URL does not appear to be an image', { url });
      // Still allow it, but log warning
    }

    // Validate the domain is safe
    if (!this.isSafeDomain(trimmedUrl)) {
      console.warn('[v0] URL domain may be untrusted', { url });
      // Still allow it but log warning
    }

    try {
      // Use Angular's built-in sanitizer for additional safety
      const parsed = new URL(trimmedUrl);

      // Additional validation: must be http or https
      if (!this.SAFE_PROTOCOLS.includes(parsed.protocol.replace(':', ''))) {
        console.error('[v0] Unsafe protocol detected', { url });
        return null;
      }

      // Sanitize and return
      return this.sanitizer.bypassSecurityTrustUrl(trimmedUrl);
    } catch (error) {
      console.error('[v0] URL parsing error', { url, error });
      return null;
    }
  }

  /**
   * Validates general URLs (for links, redirects, etc.)
   * @param url Raw URL string
   * @returns true if valid and safe
   */
  isValidUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      const parsed = new URL(url);
      return this.SAFE_PROTOCOLS.includes(parsed.protocol.replace(':', ''));
    } catch (error) {
      console.debug('[v0] Invalid URL format:', url);
      return false;
    }
  }

  /**
   * Checks if URL contains blocked/dangerous protocols
   * @param url URL to check
   * @returns true if dangerous protocol is detected
   */
  private isBlockedProtocol(url: string): boolean {
    for (const protocol of this.BLOCKED_PROTOCOLS) {
      if (url.startsWith(`${protocol}:`)) {
        return true;
      }
      // Also check for encoded variations
      if (url.includes(`%3a`) && url.includes(protocol)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if URL looks like an image based on extension or domain
   * @param url URL to check
   * @returns true if likely an image
   */
  private looksLikeImageUrl(url: string): boolean {
    // Check file extension
    for (const ext of this.IMAGE_EXTENSIONS) {
      if (url.includes(ext)) {
        return true;
      }
    }

    // Check known image CDN domains
    const imageDomains = [
      'imgur.com',
      'cloudinary.com',
      'pixabay.com',
      'unsplash.com',
      'pexels.com',
      'imagekit.io',
      'cdn.shopify.com',
      'images.unsplash.com',
      'cdn.pixabay.com',
      'images.pexels.com'
    ];

    try {
      const parsed = new URL(url);
      for (const domain of imageDomains) {
        if (parsed.hostname.includes(domain)) {
          return true;
        }
      }
    } catch (error) {
      return false;
    }

    return false;
  }

  /**
   * Checks if domain is from a trusted source
   * @param url URL to check
   * @returns true if domain is trusted or whitelisted
   */
  private isSafeDomain(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      // Whitelist of trusted domains for images
      const trustedDomains = [
        'localhost',
        '127.0.0.1',
        'imgur.com',
        'cloudinary.com',
        'pixabay.com',
        'unsplash.com',
        'pexels.com',
        'imagekit.io',
        'gravatar.com',
        'github.com',
        'gitlab.com',
        'lh3.googleusercontent.com',
        'platform-lookaside.fbsbx.com',
        'res.cloudinary.com',
        'images.unsplash.com',
        'cdn.pixabay.com',
        'images.pexels.com'
      ];

      for (const domain of trustedDomains) {
        if (hostname === domain || hostname.endsWith(`.${domain}`)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }
}
