/**
 * Algoritma Laboratuvarı — görev ve ünite tipleri (bütün sınıflar için ortak).
 *
 * Ekranda üç şey vardır (yönerge, tuval, kod); ünite bir görev dizisidir. Görevler tek tek gelir:
 * önce kodu yaz, sonra aynı kodu farklı kurgularda sına ve düzelt, arada hazır koddaki hatayı bul.
 */
import type { BlokSablonu, OlcumTuru, Program } from './program';
import type { DunyaTanimi, Hedef } from './dunya';
import type { Iz } from './yorumlayici';
import { KAZANIM_LISTESI } from './kazanimlar';

/** yaz: kodu yaz · kurgu: aynı kodu yeni kurguda düzelt · hata: hazır koddaki hatayı bul · tahmin: çalıştırmadan önce sonucu tahmin et */
export type GorevTuru = 'yaz' | 'kurgu' | 'hata' | 'tahmin';

export const GOREV_TURU_ADI: Record<GorevTuru, string> = {
  yaz: 'Kodu yaz',
  kurgu: 'Yeni kurgu',
  hata: 'Hatayı bul',
  tahmin: 'Tahmin et',
};

/** Kod panelinin görünümleri (7–8. sınıfta seçilebilir) */
export type KodGorunumu = 'bloklar' | 'sozde' | 'akis';

export interface Kazanim {
  kod: string;
  metin: string;
}

/** TYMM matematik kazanımları, 1–8. sınıf (scripts/veri/kazanim-metinleri.json) */
export const KAZANIMLAR: Record<string, Kazanim> = KAZANIM_LISTESI;

export interface GorevSorusu {
  metin: string;
  birim: string;
  cevap: (iz: Iz) => number;
  /** Doğru cevaptan sonra */
  sonrasi?: string;
  /** Yanlış cevapta */
  yonlendirme?: string;
}

export interface Gorev {
  id: string;
  tur: GorevTuru;
  baslik: string;
  yonerge: string;
  dunya: DunyaTanimi;
  hedef: Hedef;
  bitkiAdi: 'saksı' | 'bitki';
  aracKutusu: BlokSablonu[];
  /** Başlangıç kodu: boş, önceki görevin kodu ya da verilen (hazır / hatalı) kod */
  baslangic: 'bos' | 'onceki' | Program;
  /** Doğru çözümlerden biri (öğretmen notu, testler) */
  cozum: Program;
  ipuclari: string[];
  /** Başarıdan sonra tuvalde görünen cümle (matematik burada) */
  basari: (iz: Iz) => string;
  soru?: GorevSorusu;
  kazanimlar: string[];
  /** Zorlu görev: ünitenin tamamlanması için gerekmez */
  zorlu?: boolean;
  /** Önceki kodla açılan görevde önceki çözüm değişmeden çalışmalı (genelleme sınaması); yoksa bozulur */
  genelleme?: boolean;
  /** İş doğru yapılsa da kod bu kadar bloktan uzunsa görev tamamlanmaz (tekrarla / iç içe tekrar kullanmaya yöneltir) */
  enCokBlok?: number;
  /** Tahmin et: Çalıştır'dan önce sorulur; tahmin doğru ve program başarılıysa görev tamamdır */
  tahmin?: GorevSorusu;
  /** Değişken blokları için adlar (düzenleyicideki seçim listesi) */
  degiskenler?: string[];
  /** İfadelerde seçilebilecek ölçümler */
  olcumler?: OlcumTuru[];
  /** 7–8. sınıf: görev açılınca kod panelinin görünümü (okuma görevleri akış şeması ya da sözde kodla açılır) */
  ilkGorunum?: KodGorunumu;
}

export interface FissizEtkinlik {
  ad: string;
  amac: string;
  sure: string;
  roller: string[];
  adimlar: string[];
  hazirlik: string;
  kartlar: { komut: string; aciklama: string; adet: number }[];
  /** Katlanır saksı kartları ("K N K": kuru / nemli); yoksa sayfa basılmaz */
  saksiKartlari?: string;
}

export interface OgretmenNotuVerisi {
  hedef: string;
  dersler: { baslik: string; metin: string }[];
  yanilgilar: { ad: string; metin: string }[];
  sorular: string[];
  celdiriciler: string;
}

export interface Unite {
  id: string;
  sinif: number;
  /** Sınıftaki ünite sırası */
  no: number;
  ad: string;
  kademe: string;
  tema: string;
  yeniKavram: string;
  oncedenBilinen: string;
  kalip: string;
  kazanimlar: string[];
  sure: string;
  uygunluk?: string;
  /** Kod panelinin görünümü: 1–2. sınıfta numaralı kartlar · 3–6 bloklar · 7–8 bloklar, sözde kod ve akış şeması */
  gorunum: 'kart' | 'blok' | 'ifade';
  /** Görev açılınca yönerge kendiliğinden okunur (okumaya yeni başlayanlar) */
  sesliYonerge: boolean;
  gorevler: readonly Gorev[];
  fissiz: FissizEtkinlik;
  ogretmenNotu: OgretmenNotuVerisi;
}

/**
 * Atölye (ikinci etkinlik türü, kullanıcı kararı 2026-09-24): adım adım görev yerine açık uçlu bir proje.
 * Yönerge amacı söyler, nasıl yapılacağını söylemez; kod birkaç dünyada sınanır.
 * Yıldızlar: ★ ilk dünyada doğru · ★★ bütün dünyalarda doğru (genel) · ★★★ ayrıca en çok `enCokBlok` blok (verimli).
 * 1–2. sınıfta tek dünya olur (tekrar sayısı sabit); ★★ ★ ile birlikte gelir.
 */
export interface Atolye {
  /** 'a3-hasat' gibi; müfredatta tek */
  id: string;
  sinif: number;
  /** Kutuda ve başlıkta: 2–4 sözcük */
  ad: string;
  /** Kutudaki kısa tanıtım (öğrenciye, en çok 110 karakter) */
  aciklama: string;
  /** Ekrandaki amaç (en çok 220 karakter); yöntem söylenmez */
  yonerge: string;
  /** Sınama dünyaları; ilki ekranda açılan. 3. sınıftan itibaren en az 3 */
  dunyalar: DunyaTanimi[];
  hedef: Hedef;
  bitkiAdi: 'saksı' | 'bitki';
  aracKutusu: BlokSablonu[];
  /** ★★★ ölçütü */
  enCokBlok: number;
  /** Bütün dünyalarda çalışan ve sınırı aşmayan bir çözüm (öğretmen notu, testler) */
  cozum: Program;
  degiskenler?: string[];
  olcumler?: OlcumTuru[];
  kazanimlar: string[];
  /** İpucu olarak gösterilen kalıp kartı */
  kalip: string;
  /** Tek ipucu: strateji (çözümü söylemez) */
  ipucu: string;
  /** Kutu ve ekran görünümü: sınıfın görünümüyle aynı (kart · blok · ifade) */
  gorunum: 'kart' | 'blok' | 'ifade';
}
