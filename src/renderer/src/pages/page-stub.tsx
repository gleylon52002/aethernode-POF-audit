// Aşama 5/6'da doldurulacak sayfalar için tutarlı yer tutucu.
export function PageStub({ title, stage }: { title: string; stage: string }) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">{title}</h1>
      </header>
      <div className="glass rounded-2xl p-10 text-center">
        <div className="mb-2 text-4xl">🛡️</div>
        <p className="text-sm text-fg-muted">
          Bu modül <span className="text-brand font-medium">{stage}</span> aşamasında geliştirilecek.
        </p>
        <p className="mt-2 text-xs text-fg-subtle">
          İskelet, IPC sözleşmesi ve store altyapısı hazırdır.
        </p>
      </div>
    </div>
  );
}