import { publicUrl } from './storage';

// Profil fotoğrafı (avatar) yardımcıları.
// avatars = PUBLIC bucket → imza gerekmez, public URL doğrudan kullanılır.
// Yol deseni: {uid}/{timestamp}.jpg (RLS: yalnız sahibi yazar).
export const AVATAR_BUCKET = 'avatars';

// Storage yolu → gösterilebilir public URL. Yol yoksa null.
export function avatarUrl(yol: string | null | undefined): string | null {
  return publicUrl(AVATAR_BUCKET, yol);
}
