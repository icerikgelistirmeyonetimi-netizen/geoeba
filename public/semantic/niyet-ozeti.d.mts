export interface Niyet { id: string; phrases: string[] }
export const GOMME_DOSYASI: string;
export function niyetOrnekleri(intents: Niyet[]): { intent: string; text: string }[];
export function niyetOzeti(intents: Niyet[], revision: string): string;
export function gommeKodla(vectors: ArrayLike<number>[]): string;
export function gommeCoz(base64: string, count: number, dim: number): Float32Array[];
