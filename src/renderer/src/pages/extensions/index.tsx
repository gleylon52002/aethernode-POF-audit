import { AetherNodePromoCard } from '@renderer/components/promo/AetherNodePromoCard';

export default function ExtensionsPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold text-fg">Eklentiler & VPN</h1>
      <p className="mt-1 text-sm text-fg-muted">AetherNode Pro ile ek koruma katmanları.</p>
      <div className="mt-6">
        <AetherNodePromoCard />
      </div>
    </div>
  );
}
