/**
 * Tiny markdown → HTML pipeline used by the Hub announcements.
 *
 * `marked` does the parsing; we then run a conservative whitelist filter so
 * that an admin-only feature can't accidentally smuggle scripts. We don't
 * pull a heavy DOM-based sanitiser (DOMPurify is ~50kb gzipped) because the
 * input space is one trusted author writing prose.
 */
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,    // Newlines in markdown become <br>, friendlier for casual writing.
});

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'del', 'code', 'pre',
  'ul', 'ol', 'li', 'blockquote', 'a', 'h1', 'h2', 'h3', 'h4',
  'hr', 'span',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title']),
};

function sanitise(html: string): string {
  // Strip <script>, <style>, <iframe>, on* handlers, and any tag not in
  // the whitelist. Sufficient for a single-author markdown surface.
  return html
    // Drop dangerous blocks outright (content + tag).
    .replace(/<(script|style|iframe|object|embed|svg|math)[\s\S]*?<\/\1>/gi, '')
    // Self-closing variants of the same.
    .replace(/<(script|style|iframe|object|embed)[^>]*\/?>/gi, '')
    // Strip any remaining tag, keeping it only if whitelisted.
    .replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (_, name: string, attrs: string) => {
      const tag = name.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return '';
      const allowed = ALLOWED_ATTRS[tag];
      if (!allowed) return `<${_.startsWith('</') ? '/' : ''}${tag}>`;
      // Keep only whitelisted attributes (href/title for <a>).
      const cleanedAttrs = (attrs || '').replace(
        /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g,
        (full, attrName: string, _val, dq, sq, bare) => {
          if (!allowed.has(attrName.toLowerCase())) return '';
          const value = dq ?? sq ?? bare ?? '';
          // Block javascript: / data: URIs in href.
          if (attrName.toLowerCase() === 'href' && /^\s*(javascript|data):/i.test(value)) {
            return '';
          }
          return ` ${attrName}="${value.replace(/"/g, '&quot;')}"`;
        },
      ).replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
      const slash = full.startsWith('</') ? '/' : '';
      return `<${slash}${tag}${cleanedAttrs}>`;
    });
}

export function renderMarkdown(src: string): string {
  if (!src) return '';
  const html = marked.parse(src, { async: false }) as string;
  return sanitise(html);
}

/**
 * Plain-text preview for the announcement card. Strips markdown markers
 * and code blocks so the line truncation looks clean.
 */
export function plainPreview(src: string, max = 100): string {
  if (!src) return '';
  let t = src;
  // Drop code fences and inline code.
  t = t.replace(/```[\s\S]*?```/g, ' ');
  t = t.replace(/`[^`]*`/g, ' ');
  // Strip markdown markers but keep the words.
  t = t.replace(/[*_~#>]+/g, '');
  // Collapse whitespace.
  t = t.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + '…';
}
