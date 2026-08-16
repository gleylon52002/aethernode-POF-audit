import {
  Briefcase,
  User,
  Coins,
  Shield,
  Laptop,
  BookOpen,
  Sparkles,
  Globe,
  Zap,
  Layers,
  Compass,
  Code,
  Star,
  Cpu,
} from 'lucide-react';

export const WORKSPACE_ICONS = [
  { key: 'briefcase', label: 'İş & Proje', Icon: Briefcase },
  { key: 'user', label: 'Kişisel', Icon: User },
  { key: 'coins', label: 'Kripto & Finans', Icon: Coins },
  { key: 'shield', label: 'Gizlilik & Güvenlik', Icon: Shield },
  { key: 'laptop', label: 'Yazılım & Cihaz', Icon: Laptop },
  { key: 'code', label: 'Geliştirme', Icon: Code },
  { key: 'book', label: 'Okuma & Araştırma', Icon: BookOpen },
  { key: 'sparkles', label: 'Yaratıcı', Icon: Sparkles },
  { key: 'globe', label: 'Genel Ağ', Icon: Globe },
  { key: 'zap', label: 'Hızlı İşler', Icon: Zap },
  { key: 'compass', label: 'Keşif', Icon: Compass },
  { key: 'layers', label: 'Kümeler', Icon: Layers },
  { key: 'cpu', label: 'Teknoloji', Icon: Cpu },
  { key: 'star', label: 'Özel', Icon: Star },
] as const;

export type WorkspaceIconKey = (typeof WORKSPACE_ICONS)[number]['key'];

interface WorkspaceIconProps {
  name?: string;
  className?: string;
  size?: number;
}

export function WorkspaceIcon({ name, className = 'h-3.5 w-3.5', size = 14 }: WorkspaceIconProps) {
  if (!name) return <Layers className={className} size={size} />;
  
  // Backwards-compatibility with old emojis
  if (name.includes('💼')) return <Briefcase className={className} size={size} />;
  if (name.includes('🏠')) return <User className={className} size={size} />;
  if (name.includes('🪙')) return <Coins className={className} size={size} />;
  if (name.includes('🕶️') || name.includes('🛡️')) return <Shield className={className} size={size} />;
  if (name.includes('💻')) return <Laptop className={className} size={size} />;
  if (name.includes('📚')) return <BookOpen className={className} size={size} />;
  if (name.includes('⚡')) return <Zap className={className} size={size} />;

  const found = WORKSPACE_ICONS.find((i) => i.key === name);
  const IconComp = found ? found.Icon : Layers;
  return <IconComp className={className} size={size} />;
}
