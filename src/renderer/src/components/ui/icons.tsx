// İkon seti — lucide-react üzerine ince sarmalayıcılar.
// Mevcut isimleri koruyarak tüm import'lar dokunulmaz kalır.
// Varsayılan boyut 18 (orijinal davranış); className ile CSS boyutu geçer.
import {
  Shield as LShield,
  ShieldCheck as LShieldCheck,
  Plus as LPlus,
  X as LX,
  ArrowLeft as LArrowLeft,
  ArrowRight as LArrowRight,
  RotateCw as LRotateCw,
  Lock as LLock,
  Globe as LGlobe,
  Home as LHome,
  Star as LStar,
  Download as LDownload,
  Key as LKey,
  StickyNote as LStickyNote,
  Network as LNetwork,
  Settings as LSettings,
  Minus as LMinus,
  Square as LSquare,
  Pin as LPin,
  Search as LSearch,
  History as LHistory,
  Focus as LFocus,
  Trash2 as LTrash,
  AlertTriangle as LAlertTriangle,
  EyeOff as LEyeOff,
  BookOpen as LBookOpen,
  type LucideProps,
} from 'lucide-react';
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & LucideProps;

const wrap = (Icon: React.ComponentType<LucideProps>) => {
  const Wrapped = (props: P) => <Icon size={18} {...props} />;
  Wrapped.displayName = Icon.displayName || Icon.name || 'Icon';
  return Wrapped;
};

export const Shield = wrap(LShield);
export const Plus = wrap(LPlus);
export const Close = wrap(LX);
export const Back = wrap(LArrowLeft);
export const Forward = wrap(LArrowRight);
export const Reload = wrap(LRotateCw);
export const Lock = wrap(LLock);
export const Globe = wrap(LGlobe);
export const Home = wrap(LHome);
export const Star = wrap(LStar);
export const Download = wrap(LDownload);
export const Key = wrap(LKey);
export const Note = wrap(LStickyNote);
export const Network = wrap(LNetwork);
export const Settings = wrap(LSettings);
export const Security = wrap(LShieldCheck);
export const Min = wrap(LMinus);
export const Max = wrap(LSquare);
export const Pin = wrap(LPin);
export const Search = wrap(LSearch);
export const HistoryIcon = wrap(LHistory);
export const Focus = wrap(LFocus);
export const Trash = wrap(LTrash);
export const Warning = wrap(LAlertTriangle);
export const Incognito = wrap(LEyeOff);
export const Reader = wrap(LBookOpen);