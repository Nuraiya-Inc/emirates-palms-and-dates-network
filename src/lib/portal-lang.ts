/**
 * Portal language — Arabic-first with an English toggle.
 *
 * The partner portal DEFAULTS to Arabic (the platform's identity); the
 * cookie `ntr-lang` flips it to English. Server components read the
 * cookie via getPortalLang(); the LangToggle client component writes it.
 * Scope: partner portal only — the staff console remains English for now.
 */

import { cookies } from 'next/headers';

export type PortalLang = 'ar' | 'en';

export const PORTAL_LANG_COOKIE = 'ntr-lang';

export async function getPortalLang(): Promise<PortalLang> {
  const jar = await cookies();
  return jar.get(PORTAL_LANG_COOKIE)?.value === 'en' ? 'en' : 'ar';
}

/** Pick a string by language: t(lang, english, arabic). */
export function t(lang: PortalLang, en: string, ar: string): string {
  return lang === 'ar' ? ar : en;
}
