/**
 * Shared anti-disintermediation content filter.
 * Detects and replaces phone numbers, emails, social media links,
 * and WhatsApp keyword patterns in user-submitted text.
 */

const BLOCKED_REPLACEMENT =
  '[\u26A0 \u0645\u062D\u062A\u0648\u0649 \u0645\u062D\u0638\u0648\u0631]';

export interface FilterResult {
  content: string;
  wasFiltered: boolean;
  filteredTypes: string[];
}

export function filterContactInfo(content: string): FilterResult {
  const filteredTypes: string[] = [];
  let sanitized = content;

  // Phone numbers: international, local, Arabic-Indic numerals, French format
  const phonePatterns = [
    /(?:\+|00)\d[\d\s\-.()]{7,15}/g,
    /\b0[5-7]\d[\d\s\-.]{6,12}/g,
    /[\u0660-\u0669]{7,15}/g,
    /\b\d{2}[\s.-]\d{2}[\s.-]\d{2}[\s.-]\d{2}[\s.-]\d{2}\b/g,
  ];
  for (const p of phonePatterns) {
    if (p.test(sanitized)) {
      filteredTypes.push('phone');
      sanitized = sanitized.replace(p, BLOCKED_REPLACEMENT);
    }
  }

  // Email addresses
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailPattern.test(sanitized)) {
    filteredTypes.push('email');
    sanitized = sanitized.replace(emailPattern, BLOCKED_REPLACEMENT);
  }

  // Social media links
  const socialPatterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:wa\.me|api\.whatsapp\.com)[/\w\-.?=&]*/gi,
    /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|ig\.me)[/\w\-.?=&]*/gi,
    /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com|fb\.me|m\.me)[/\w\-.?=&]*/gi,
    /(?:https?:\/\/)?(?:www\.)?t\.me[/\w\-.?=&]*/gi,
    /(?:https?:\/\/)?(?:www\.)?snapchat\.com[/\w\-.?=&]*/gi,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com[/\w\-.?=&@]*/gi,
  ];
  for (const p of socialPatterns) {
    if (p.test(sanitized)) {
      filteredTypes.push('social_link');
      sanitized = sanitized.replace(p, BLOCKED_REPLACEMENT);
    }
  }

  // WhatsApp keyword + number combo
  const waKeyword =
    /(?:\u0648\u0627\u062A\u0633|\u0648\u0627\u062A\u0633\u0627\u0628|whatsapp|whatsp|wtsp|wats)[\s:]*[+\d][\d\s\-.]{6,}/gi;
  if (waKeyword.test(sanitized)) {
    filteredTypes.push('whatsapp');
    sanitized = sanitized.replace(waKeyword, BLOCKED_REPLACEMENT);
  }

  return {
    content: sanitized,
    wasFiltered: filteredTypes.length > 0,
    filteredTypes: [...new Set(filteredTypes)],
  };
}
