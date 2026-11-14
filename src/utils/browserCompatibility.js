export function isInAppBrowser(userAgent = globalThis.navigator?.userAgent || "") {
  return /(Instagram|FBAN|FBAV|Line\/|LinkedInApp|Twitter|TikTok|Snapchat)/i.test(String(userAgent));
}

export function safeStorageSet(storage, key, value) {
  try {
    storage?.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}
