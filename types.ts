
export enum KioskStep {
  HOME = 'HOME',
  GLASSES_SELECTION = 'GLASSES_SELECTION',
  SCANNING = 'SCANNING',
  RESULT = 'RESULT'
}

export interface CaptureData {
  headImage: string;
  timestamp: string;
  appliedStyle?: string;
}

export enum DetectionMode {
  FACE_LANDMARKS = 'FACE_LANDMARKS',
  SELFIE_SEGMENTATION = 'SELFIE_SEGMENTATION',
  HAIR_SEGMENTATION = 'HAIR_SEGMENTATION'
}

export enum GlassesStyle {
  NONE = 'NONE',
  CYBER = 'CYBER',
  CLASSIC = 'CLASSIC',
  AVIATOR = 'AVIATOR',
  RETRO = 'RETRO',
  MONOCLE = 'MONOCLE'
}

export interface VisionModelInfo {
  id: DetectionMode;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
}
