const mimeToExt: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
};

export function formatFileName(name: string, mimeType?: string, max = 12): string {
  // Extract extension from name if present
  const lastDot = name.lastIndexOf('.');
  const hasDot = lastDot > 0 && lastDot < name.length - 1;
  const extFromName = hasDot ? name.slice(lastDot + 1) : '';
  const base = hasDot ? name.slice(0, lastDot) : name;

  // Fallback to mime type if name has no extension
  const ext = extFromName || (mimeType && mimeToExt[mimeType]) || '';

  if (base.length <= max) {
    return ext ? `${base}.${ext}` : base;
  }

  const truncated = base.slice(0, max);
  return ext ? `${truncated}.${ext}` : truncated;
}