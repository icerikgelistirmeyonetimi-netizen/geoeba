import type { MathObject, ViewportTransform } from '@/types/math';
import type { StyleSettings, ToolMode } from '@/types/workspace';
import type { Clause } from './text';
import type { CommandScene } from './scene';

/** Sahne dışı (arayüz) işlemler. CommandPanel bunları sırayla uygular. */
export type AppAction =
  | { kind: 'undo'; count?: number }
  | { kind: 'redo'; count?: number }
  /** Onay penceresi açılır; sahne hemen silinmez. */
  | { kind: 'clearAll' }
  | { kind: 'selectTool'; tool: ToolMode }
  | { kind: 'openDialog'; dialog: 'function' | 'slider' | 'regularPolygon' | 'circleRadius' }
  | { kind: 'viewport'; patch: Partial<ViewportTransform> }
  /** Görünüm merkezini koruyarak yakınlaştırma çarpanı (ör. 1.2 yakınlaştır, 1/1.2 uzaklaştır). */
  | { kind: 'zoom'; factor: number }
  | { kind: 'fitView' }
  | { kind: 'resetView' }
  | { kind: 'styleMode'; mode: 'Sade' | 'Ayrıntılı' }
  | { kind: 'planeType'; plane: 'dik_koordinat' | 'kareli_duzlem' | 'bos_duzlem' }
  | { kind: 'styleSettings'; patch: Partial<StyleSettings> }
  | { kind: 'playback'; mode: 'play' | 'stop' | 'toggle'; targetId?: string }
  | { kind: 'clearTraces' }
  | { kind: 'help'; topic?: string };

export type CommandSuccess = {
  ok: true;
  objects: MathObject[];
  selectedIds: string[];
  message: string;
  actions: AppAction[];
  /** false ise sahneye dokunulmadı; panel geçmişe adım eklememeli. */
  sceneChanged: boolean;
};
export type CommandFailure = {
  ok: false;
  message: string;
  suggestions?: string[];
  /** true: hiçbir işleyici cümleyi tanımadı (anlaşılan ama uygulanamayan komuttan ayırt etmek için). */
  unrecognized?: boolean;
};
export type CommandResult = CommandSuccess | CommandFailure;

export interface EngineOptions {
  /** Yeni nesneleri görünür alana yerleştirmek ve görünüm komutları için. */
  viewport?: ViewportTransform;
  /** Göreli stil komutları ("yazıları büyüt") için güncel stil ayarları. */
  styleSettings?: StyleSettings;
  /** Yarım kalmış bir araç işleminin (çokgen, doğru parçası…) tıklanmış noktaları: tuvaldeki gibi KULLANIMDA sayılır. */
  pendingPointIds?: string[];
}

/**
 * Bir komut ailesi.
 *
 * match() 0 döndürürse işleyici uygulanmaz. En yüksek puan kazanır; eşitlikte kayıt sırası.
 * Puan bantları (aileler arası çakışmayı önlemek için bu aralıklara uyun):
 *   95–100 biçimsel sözdizimi (f(x)=…, a = 2, A=(1;2))
 *   85–94  uygulama/görünüm ve açık düzenleme fiilleri (sil, gizle, renk, taşı, adlandır, kopyala, uzunluğunu … yap)
 *   75–84  dönüşümler (yansıt, döndür, ötele, büyüt)
 *   65–74  inşalar (paralel, dik, orta dikme, açıortay, kesişim, teğet, yükseklik, kenarortay, merkezler, çevrel/iç teğet çember, orta nokta, oranda böl)
 *   55–64  ölçüm ve sorular (ölç, hesapla, kaç, göster: alan/çevre/uzunluk/açı/eğim)
 *   45–54  parametreli oluşturma (üçgen, kare, dikdörtgen, düzgün çokgen, çember, elips, yay, dilim, açı, kesir, yazı, kaydırıcı, düğme…)
 *   35–44  genel oluşturma (nokta, doğru parçası, doğru, ışın, etiketlerden çokgen)
 *   5–15   araç açma yedeği (kalem, cetvel, görsel…)
 */
export interface CommandHandler {
  id: string;
  examples: string[];
  match(clause: Clause, scene: CommandScene): number;
  run(clause: Clause, scene: CommandScene): void;
}
