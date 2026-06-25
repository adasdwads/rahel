// ═══════════════════════════════════════════════════════════════
// Client-Side AES-256-GCM Encryption using Web Crypto API
// ═══════════════════════════════════════════════════════════════

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return bufferToHex(raw);
}

export async function encryptData(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<{ encrypted: ArrayBuffer; iv: string; }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return { encrypted, iv: bufferToHex(iv.buffer) };
}

export async function decryptData(
  encrypted: ArrayBuffer,
  key: CryptoKey,
  ivHex: string
): Promise<ArrayBuffer> {
  const iv = hexToBuffer(ivHex);
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
}

export function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

export function generateRandomHex(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return bufferToHex(bytes.buffer);
}

export function formatEncryptionProgress(stage: string, progress: number): string {
  const stages: Record<string, string> = {
    reading: 'قراءة الملف...',
    generating_key: 'توليد مفتاح AES-256...',
    encrypting: 'تشفير البيانات...',
    sharding: 'تقسيم المفتاح إلى أجزاء...',
    uploading: 'رفع البيانات المشفرة...',
    complete: 'اكتمل التشفير والرفع',
  };
  return stages[stage] || stage;
}
