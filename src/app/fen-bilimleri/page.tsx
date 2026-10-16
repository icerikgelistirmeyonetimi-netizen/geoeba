import type { Metadata } from 'next';
import FenKoyu from '@/components/fen-bilimleri/FenKoyu';

export const metadata: Metadata = {
  title: 'Fen Keşif Köyü | EBA',
  description: 'İlkokul 3–4 ve ortaokul 5–8. sınıflar için doğadan evrene uzanan üç boyutlu bir fen bilimleri köyü.',
};

export default function FenBilimleriSayfasi() {
  return <FenKoyu />;
}
