import fs from 'node:fs';
import { DEFAULT_CONFIG, type WallConfig } from '@photowall/shared';
import { configFile } from './paths.js';

type PlainObject = Record<string, unknown>;

function isPlainObject(v: unknown): v is PlainObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return (patch === undefined ? base : (patch as T));
  }
  const out: PlainObject = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const baseValue = (base as PlainObject)[key];
    out[key] = isPlainObject(baseValue) && isPlainObject(value)
      ? deepMerge(baseValue, value)
      : value;
  }
  return out as T;
}

const clamp = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Sanitiza valores numéricos críticos para evitar um telão quebrado por config inválida. */
function sanitize(cfg: WallConfig): WallConfig {
  const d = DEFAULT_CONFIG;
  cfg.grid.rows = Math.round(clamp(cfg.grid.rows, 1, 20, d.grid.rows));
  cfg.grid.cols = Math.round(clamp(cfg.grid.cols, 1, 20, d.grid.cols));
  cfg.grid.gap = clamp(cfg.grid.gap, 0, 200, d.grid.gap);
  cfg.grid.padding = clamp(cfg.grid.padding, 0, 400, d.grid.padding);
  cfg.background.overlayOpacity = clamp(cfg.background.overlayOpacity, 0, 1, d.background.overlayOpacity);
  cfg.frame.borderWidth = clamp(cfg.frame.borderWidth, 0, 60, d.frame.borderWidth);
  cfg.frame.borderRadius = clamp(cfg.frame.borderRadius, 0, 200, d.frame.borderRadius);
  cfg.frame.matte = clamp(cfg.frame.matte, 0, 80, d.frame.matte);
  cfg.animation.entryDuration = clamp(cfg.animation.entryDuration, 100, 5000, d.animation.entryDuration);
  cfg.animation.swapInterval = clamp(cfg.animation.swapInterval, 300, 60000, d.animation.swapInterval);
  cfg.animation.pageDuration = clamp(cfg.animation.pageDuration, 1000, 600000, d.animation.pageDuration);
  cfg.animation.fadeDuration = clamp(cfg.animation.fadeDuration, 100, 5000, d.animation.fadeDuration);
  cfg.animation.scrollSpeed = clamp(cfg.animation.scrollSpeed, 5, 500, d.animation.scrollSpeed);
  cfg.animation.parallaxIntensity = clamp(cfg.animation.parallaxIntensity, 0, 60, d.animation.parallaxIntensity);
  cfg.sources.drive.pollIntervalSec = clamp(cfg.sources.drive.pollIntervalSec, 5, 3600, d.sources.drive.pollIntervalSec);
  const modes = ['mosaic', 'paged', 'scroll'];
  if (!modes.includes(cfg.animation.mode)) cfg.animation.mode = d.animation.mode;
  const entries = ['fade', 'zoom', 'flip', 'slide', 'pop', 'random'];
  if (!entries.includes(cfg.animation.entry)) cfg.animation.entry = d.animation.entry;
  const bgTypes = ['color', 'image', 'video'];
  if (!bgTypes.includes(cfg.background.type)) cfg.background.type = d.background.type;
  return cfg;
}

export class ConfigStore {
  private config: WallConfig;
  onChange: ((cfg: WallConfig) => void) | null = null;

  constructor() {
    let loaded: unknown = {};
    try {
      loaded = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    } catch {
      // primeiro boot: usa defaults
    }
    this.config = sanitize(deepMerge(structuredClone(DEFAULT_CONFIG), loaded));
    this.persist();
  }

  get(): WallConfig {
    return this.config;
  }

  update(patch: unknown): WallConfig {
    this.config = sanitize(deepMerge(this.config, patch));
    this.persist();
    this.onChange?.(this.config);
    return this.config;
  }

  private persist(): void {
    const tmp = configFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.config, null, 2));
    fs.renameSync(tmp, configFile);
  }
}
