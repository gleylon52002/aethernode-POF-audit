import { SecureStore } from '@main/store/secure-store';
import {
  sealWithPasswordAsync,
  openWithPasswordAsync,
  openWithPassword,
  randomId,
  type SealedPayload,
} from '@main/services/crypto';
import { getDeviceEncryptionKey } from '@main/services/device-key';
import { getMasterPassword } from '@main/services/vault';

// Otomatik doldurma kasası.
//
// Profiller (ad/adres/telefon): cihaz anahtarıyla şifreli SecureStore'da —
// disk üzerinde düz metin yok, ama kasa kilidi gerekmez (düşük hassasiyet).
//
// Kartlar: EN hassas kategori — şifre kasasının master parolasıyla ayrıca
// mühürlenir (AES-256-GCM + PBKDF2). Kasa kilitliyken kart verisi okunamaz;
// doldurma isteği "kasa kilitli" hatasıyla döner.

export interface AutofillProfile {
  id: string;
  name: string;
  fields: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface AutofillCard {
  id: string;
  label: string;
  cardholderName: string;
  pan: string; // yalnızca mühürlü blob içinde yaşar
  cvv?: string;
  expiryMonth: string;
  expiryYear: string;
}

/** Renderer/guest'e gösterilen maskeli kart özeti */
export interface AutofillCardSummary {
  id: string;
  label: string;
  cardholderName: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
}

interface AutofillRecord {
  profiles: AutofillProfile[];
  cardsSealed: SealedPayload | null;
}

let storeRef: SecureStore<AutofillRecord> | null = null;

function store(): SecureStore<AutofillRecord> {
  if (!storeRef) {
    storeRef = new SecureStore<AutofillRecord>({
      name: 'autofill-vault',
      encryptionKey: getDeviceEncryptionKey(),
      defaults: { profiles: [], cardsSealed: null },
    });
  }
  return storeRef;
}

// ---- Profiller ----

export function listProfiles(): AutofillProfile[] {
  return store().get('profiles') ?? [];
}

export function saveProfile(
  input: Omit<AutofillProfile, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): AutofillProfile {
  const profiles = listProfiles();
  const now = Date.now();
  if (input.id) {
    const idx = profiles.findIndex((p) => p.id === input.id);
    if (idx >= 0) {
      const updated: AutofillProfile = {
        ...profiles[idx]!,
        name: input.name,
        fields: input.fields,
        updatedAt: now,
      };
      profiles[idx] = updated;
      store().set('profiles', profiles);
      return updated;
    }
  }
  const profile: AutofillProfile = {
    id: randomId(),
    name: input.name,
    fields: input.fields,
    createdAt: now,
    updatedAt: now,
  };
  store().set('profiles', [...profiles, profile]);
  return profile;
}

export function removeProfile(id: string): void {
  store().set(
    'profiles',
    listProfiles().filter((p) => p.id !== id),
  );
}

// ---- Kartlar (master parola mühürlü) ----

async function readCards(): Promise<AutofillCard[]> {
  const master = getMasterPassword();
  if (!master) throw new Error('Kasa kilitli — kart verisi için önce kasayı aç');
  const sealed = store().get('cardsSealed');
  if (!sealed) return [];
  try {
    return JSON.parse(await openWithPasswordAsync(sealed, master)) as AutofillCard[];
  } catch {
    return JSON.parse(openWithPassword(sealed, master)) as AutofillCard[];
  }
}

async function writeCards(cards: AutofillCard[]): Promise<void> {
  const master = getMasterPassword();
  if (!master) throw new Error('Kasa kilitli — kart verisi için önce kasayı aç');
  store().set('cardsSealed', await sealWithPasswordAsync(JSON.stringify(cards), master));
}

function toSummary(c: AutofillCard): AutofillCardSummary {
  return {
    id: c.id,
    label: c.label,
    cardholderName: c.cardholderName,
    last4: c.pan.replace(/\D/g, '').slice(-4),
    expiryMonth: c.expiryMonth,
    expiryYear: c.expiryYear,
  };
}

export async function listCardSummaries(): Promise<AutofillCardSummary[]> {
  return (await readCards()).map(toSummary);
}

export async function saveCard(input: Omit<AutofillCard, 'id'> & { id?: string }): Promise<AutofillCardSummary> {
  const cards = await readCards();
  if (input.id) {
    const idx = cards.findIndex((c) => c.id === input.id);
    if (idx >= 0) {
      cards[idx] = { ...input, id: input.id };
      await writeCards(cards);
      return toSummary(cards[idx]!);
    }
  }
  const card: AutofillCard = { ...input, id: randomId() };
  await writeCards([...cards, card]);
  return toSummary(card);
}

export async function removeCard(id: string): Promise<void> {
  await writeCards((await readCards()).filter((c) => c.id !== id));
}

/**
 * Doldurma anında tam kart verisi — YALNIZCA kasa açıkken.
 * Çağıran taraf (guest) form submit sonrası değeri bellekten temizlemelidir.
 */
export async function getCardForFill(id: string): Promise<AutofillCard> {
  const card = (await readCards()).find((c) => c.id === id);
  if (!card) throw new Error('Kart bulunamadı');
  return card;
}
