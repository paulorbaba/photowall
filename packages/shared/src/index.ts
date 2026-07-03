// Tipos e configuração padrão compartilhados entre server, wall e admin.

export type BackgroundType = 'color' | 'image' | 'video';
export type AnimationMode = 'mosaic' | 'paged' | 'scroll';
export type EntryAnimation = 'fade' | 'zoom' | 'flip' | 'slide' | 'pop' | 'random';
export type PhotoStatus = 'pending' | 'approved' | 'rejected';
export type PhotoSource = 'local' | 'drive' | 'upload';

export interface GridConfig {
  rows: number;
  cols: number;
  /** Espaço entre células, em px */
  gap: number;
  /** Margem interna do telão, em px */
  padding: number;
}

export interface BackgroundConfig {
  type: BackgroundType;
  color: string;
  /** URL relativa do arquivo em /media/backgrounds (imagem ou vídeo) */
  file: string | null;
  /** Camada escura sobre o fundo para dar contraste às fotos (0 a 1) */
  overlayOpacity: number;
  overlayColor: string;
}

export interface FrameConfig {
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
  /** "Passe-partout": respiro interno entre a borda e a foto, em px */
  matte: number;
  matteColor: string;
  shadow: boolean;
  shadowColor: string;
}

export interface TitleConfig {
  enabled: boolean;
  text: string;
  subtitle: string;
  color: string;
}

export interface AnimationConfig {
  mode: AnimationMode;
  entry: EntryAnimation;
  /** Duração da animação de entrada de cada foto, em ms */
  entryDuration: number;
  /** Mosaico: intervalo médio entre trocas de foto no telão, em ms */
  swapInterval: number;
  /** Paginado: tempo de exibição de cada página, em ms */
  pageDuration: number;
  /** Paginado: duração do crossfade entre páginas, em ms */
  fadeDuration: number;
  /** Scroll: velocidade de rolagem, em px/s */
  scrollSpeed: number;
  /** Deriva sutil das fotos (efeito parallax/vivo) */
  parallax: boolean;
  /** Intensidade do parallax, em px de amplitude */
  parallaxIntensity: number;
  /** Randomizar a ordem/posição de entrada das fotos */
  randomizeOrder: boolean;
}

export interface DriveConfig {
  enabled: boolean;
  /** ID da pasta do Google Drive (trecho final da URL da pasta) */
  folderId: string;
  /** Chave de API (para pastas públicas "qualquer pessoa com o link") */
  apiKey: string;
  /** Caminho local do JSON de service account (para pastas privadas) */
  credentialsFile: string;
  /** Intervalo de sincronização, em segundos */
  pollIntervalSec: number;
}

export interface SourcesConfig {
  /** Pasta local observada; relativa ao diretório de dados ou absoluta */
  localFolder: string;
  /** true = fotos entram no telão sem passar pela fila de moderação */
  autoApprove: boolean;
  drive: DriveConfig;
}

export interface WallConfig {
  version: 1;
  grid: GridConfig;
  background: BackgroundConfig;
  frame: FrameConfig;
  title: TitleConfig;
  animation: AnimationConfig;
  sources: SourcesConfig;
}

export interface Photo {
  id: string;
  /** Nome do arquivo dentro de /media/photos */
  file: string;
  originalName: string;
  source: PhotoSource;
  driveId?: string;
  size: number;
  status: PhotoStatus;
  createdAt: number;
  updatedAt: number;
}

export interface ServerStatus {
  version: string;
  uptimeSec: number;
  counts: { pending: number; approved: number; rejected: number };
  watcher: { folder: string; active: boolean };
  drive: { enabled: boolean; lastSyncAt: number | null; lastError: string | null };
  dataDir: string;
}

export type ServerEvent =
  | { type: 'config'; config: WallConfig }
  | { type: 'photos' };

export const DEFAULT_CONFIG: WallConfig = {
  version: 1,
  grid: { rows: 4, cols: 7, gap: 14, padding: 28 },
  background: {
    type: 'color',
    color: '#0d0630',
    file: null,
    overlayOpacity: 0.25,
    overlayColor: '#000000'
  },
  frame: {
    borderWidth: 2,
    borderColor: '#b388ff',
    borderRadius: 10,
    matte: 0,
    matteColor: '#ffffff',
    shadow: true,
    shadowColor: 'rgba(120,80,255,0.45)'
  },
  title: {
    enabled: false,
    text: 'PHOTO WALL',
    subtitle: 'Momentos criados ao vivo pelos nossos visitantes',
    color: '#ffffff'
  },
  animation: {
    mode: 'mosaic',
    entry: 'random',
    entryDuration: 700,
    swapInterval: 2500,
    pageDuration: 10000,
    fadeDuration: 600,
    scrollSpeed: 40,
    parallax: true,
    parallaxIntensity: 8,
    randomizeOrder: true
  },
  sources: {
    localFolder: 'incoming',
    autoApprove: false,
    drive: {
      enabled: false,
      folderId: '',
      apiKey: '',
      credentialsFile: '',
      pollIntervalSec: 15
    }
  }
};

export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export function isSupportedImage(name: string): boolean {
  const lower = name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
