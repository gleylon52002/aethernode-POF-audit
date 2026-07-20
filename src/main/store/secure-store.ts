import Store, { type Schema } from 'electron-store';
import { app } from 'electron';
import { join } from 'node:path';

// Secure Store — electron-store sarmalayıcı.
//
// Kalıcı, şifrelenmiş yerel depo. electron-store varsayılan olarak
// dosyayı AES-256-GCM ile şifreler (encryptionKey verilirse).
// Şifre/not gibi hassas veriler master-password ile ayrıca AES-256-GCM'ye
// sokulacak (crypto-service).
//
// Generic sınırı `object` seçildi; electron-store'un `Record<string, unknown>`
// sınırı içerde güvenli cast ile karşılanır — arayüz çağırıcısı için
// ek bir index imzası gerektirmemek adına.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Storable = Record<string, any>;

export interface SecureStoreOptions<T> {
  name: string;
  schema?: Schema<T>;
  encryptionKey: string;
  defaults: T;
}

export class SecureStore<T extends object> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly store: Store<any>;

  constructor(opts: SecureStoreOptions<T>) {
    this.store = new Store<Storable>({
      name: opts.name,
      schema: opts.schema as Schema<Storable>,
      encryptionKey: opts.encryptionKey,
      defaults: opts.defaults as Storable,
      cwd: join(app.getPath('userData'), 'secure-store'),
    });
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.store.get(key as string) as T[K];
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    this.store.set(key as string, value as unknown as Storable[string]);
  }

  all(): T {
    return this.store.store as T;
  }

  reset(): void {
    this.store.clear();
  }

  delete<K extends keyof T>(key: K): void {
    this.store.delete(key as string);
  }

  onDidChange<K extends keyof T>(
    key: K,
    cb: (newValue: T[K] | undefined, oldValue: T[K] | undefined) => void,
  ): void {
    this.store.onDidChange(key as string, (n, o) => cb(n as T[K], o as T[K]));
  }
}