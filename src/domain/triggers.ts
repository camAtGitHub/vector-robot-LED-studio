/**
 * Trigger map + human labels + groups + relative pack paths.
 * Source: BackpackAnimationTriggerMap.json + stock pack layout.
 */

import type { ModeDef, ModeGroup } from './types';

/** Raw trigger map entry (CladEvent → AnimName basename). */
export interface TriggerMapEntry {
  CladEvent: string;
  AnimName: string;
}

/**
 * Embedded copy of resources/assets/cladToFileMaps/BackpackAnimationTriggerMap.json
 * (also shipped as public/fixtures/triggerMap.json).
 */
export const TRIGGER_MAP: TriggerMapEntry[] = [
  { CladEvent: 'AlexaNotification', AnimName: 'alexaNotification' },
  { CladEvent: 'Charging', AnimName: 'charging' },
  { CladEvent: 'ChargingLowBatteryOverheated', AnimName: 'chargingLowBatteryOverheated' },
  { CladEvent: 'ChargingOverheated', AnimName: 'chargingOverheated' },
  { CladEvent: 'DanceToTheBeat', AnimName: 'danceToTheBeat' },
  { CladEvent: 'MeetVictor', AnimName: 'meetVictor' },
  { CladEvent: 'Muted', AnimName: 'muted' },
  { CladEvent: 'Petting', AnimName: 'petting' },
  { CladEvent: 'Idle_09', AnimName: 'idle_09' },
  { CladEvent: 'LowBattery', AnimName: 'badCharger' },
  { CladEvent: 'LowBatteryOverheated', AnimName: 'badChargerOverheated' },
  { CladEvent: 'Off', AnimName: 'off' },
  { CladEvent: 'Offline', AnimName: 'offline' },
  { CladEvent: 'Offline_Off', AnimName: 'offline_off' },
  { CladEvent: 'Overheated', AnimName: 'overheated' },
  { CladEvent: 'SpinnerBlueCelebration', AnimName: 'spinner_blue_celebration' },
  { CladEvent: 'SpinnerBlueHoldTarget', AnimName: 'spinner_blue_hold_target' },
  { CladEvent: 'SpinnerBlueSelectTarget', AnimName: 'spinner_blue_select_target' },
  { CladEvent: 'SpinnerGreenCelebration', AnimName: 'spinner_green_celebration' },
  { CladEvent: 'SpinnerGreenHoldTarget', AnimName: 'spinner_green_hold_target' },
  { CladEvent: 'SpinnerGreenSelectTarget', AnimName: 'spinner_green_select_target' },
  { CladEvent: 'SpinnerPurpleCelebration', AnimName: 'spinner_purple_celebration' },
  { CladEvent: 'SpinnerPurpleHoldTarget', AnimName: 'spinner_purple_hold_target' },
  { CladEvent: 'SpinnerPurpleSelectTarget', AnimName: 'spinner_purple_select_target' },
  { CladEvent: 'SpinnerRedCelebration', AnimName: 'spinner_red_celebration' },
  { CladEvent: 'SpinnerRedHoldTarget', AnimName: 'spinner_red_hold_target' },
  { CladEvent: 'SpinnerRedSelectTarget', AnimName: 'spinner_red_select_target' },
  { CladEvent: 'SpinnerYellowCelebration', AnimName: 'spinner_yellow_celebration' },
  { CladEvent: 'SpinnerYellowHoldTarget', AnimName: 'spinner_yellow_hold_target' },
  { CladEvent: 'SpinnerYellowSelectTarget', AnimName: 'spinner_yellow_select_target' },
  { CladEvent: 'Streaming', AnimName: 'streaming' },
  { CladEvent: 'WorkingOnIt', AnimName: 'workingOnIt' },
];

/** Human labels for CladEvents (UI only). */
const LABELS: Record<string, string> = {
  AlexaNotification: 'Alexa notification',
  Charging: 'Charging',
  ChargingLowBatteryOverheated: 'Charging + low battery + overheated',
  ChargingOverheated: 'Charging + overheated',
  DanceToTheBeat: 'Dance to the beat',
  MeetVictor: 'Meet Victor',
  Muted: 'Muted',
  Petting: 'Petting',
  Idle_09: 'Idle 09',
  LowBattery: 'Low battery',
  LowBatteryOverheated: 'Low battery + overheated',
  Off: 'Off',
  Offline: 'Offline',
  Offline_Off: 'Offline off',
  Overheated: 'Overheated',
  SpinnerBlueCelebration: 'Spinner blue — celebration',
  SpinnerBlueHoldTarget: 'Spinner blue — hold target',
  SpinnerBlueSelectTarget: 'Spinner blue — select target',
  SpinnerGreenCelebration: 'Spinner green — celebration',
  SpinnerGreenHoldTarget: 'Spinner green — hold target',
  SpinnerGreenSelectTarget: 'Spinner green — select target',
  SpinnerPurpleCelebration: 'Spinner purple — celebration',
  SpinnerPurpleHoldTarget: 'Spinner purple — hold target',
  SpinnerPurpleSelectTarget: 'Spinner purple — select target',
  SpinnerRedCelebration: 'Spinner red — celebration',
  SpinnerRedHoldTarget: 'Spinner red — hold target',
  SpinnerRedSelectTarget: 'Spinner red — select target',
  SpinnerYellowCelebration: 'Spinner yellow — celebration',
  SpinnerYellowHoldTarget: 'Spinner yellow — hold target',
  SpinnerYellowSelectTarget: 'Spinner yellow — select target',
  Streaming: 'Streaming',
  WorkingOnIt: 'Working on it',
};

/**
 * Mode groups for sidebar (not a wire protocol).
 * Critical: auto priority; Behavior: freeplay; Utility: base/rare.
 */
const GROUPS: Record<string, ModeGroup> = {
  Streaming: 'Critical',
  LowBattery: 'Critical',
  LowBatteryOverheated: 'Critical',
  Overheated: 'Critical',
  Offline: 'Critical',
  Muted: 'Critical',
  AlexaNotification: 'Critical',
  Charging: 'Critical',
  ChargingOverheated: 'Critical',
  ChargingLowBatteryOverheated: 'Critical',

  Petting: 'Behavior',
  WorkingOnIt: 'Behavior',
  DanceToTheBeat: 'Behavior',
  MeetVictor: 'Behavior',
  SpinnerBlueCelebration: 'Behavior',
  SpinnerBlueHoldTarget: 'Behavior',
  SpinnerBlueSelectTarget: 'Behavior',
  SpinnerGreenCelebration: 'Behavior',
  SpinnerGreenHoldTarget: 'Behavior',
  SpinnerGreenSelectTarget: 'Behavior',
  SpinnerPurpleCelebration: 'Behavior',
  SpinnerPurpleHoldTarget: 'Behavior',
  SpinnerPurpleSelectTarget: 'Behavior',
  SpinnerRedCelebration: 'Behavior',
  SpinnerRedHoldTarget: 'Behavior',
  SpinnerRedSelectTarget: 'Behavior',
  SpinnerYellowCelebration: 'Behavior',
  SpinnerYellowHoldTarget: 'Behavior',
  SpinnerYellowSelectTarget: 'Behavior',

  Off: 'Utility',
  Offline_Off: 'Utility',
  Idle_09: 'Utility',
};

/**
 * Map AnimName basename → relative path under pack root.
 * Spinners live under cubeSpinner/<color>/; others at root.
 */
export function animNameToRelativePath(animName: string): string {
  const spinnerMatch = /^spinner_(blue|green|purple|red|yellow)_(.+)$/.exec(
    animName
  );
  if (spinnerMatch) {
    const color = spinnerMatch[1];
    return `cubeSpinner/${color}/${animName}.json`;
  }
  return `${animName}.json`;
}

/** Build full ModeDef list (32 modes). */
export function getAllModes(): ModeDef[] {
  return TRIGGER_MAP.map((entry) => {
    const { CladEvent, AnimName } = entry;
    return {
      cladEvent: CladEvent,
      animName: AnimName,
      relativePath: animNameToRelativePath(AnimName),
      label: LABELS[CladEvent] ?? CladEvent,
      group: GROUPS[CladEvent] ?? 'Utility',
    };
  });
}

/** Modes filtered by group. */
export function getModesByGroup(group: ModeGroup): ModeDef[] {
  return getAllModes().filter((m) => m.group === group);
}

/** Lookup by CladEvent. */
export function getModeByCladEvent(cladEvent: string): ModeDef | undefined {
  return getAllModes().find((m) => m.cladEvent === cladEvent);
}

/** Lookup by relative path. */
export function getModeByRelativePath(path: string): ModeDef | undefined {
  return getAllModes().find((m) => m.relativePath === path);
}

/**
 * Load trigger map from a JSON array (e.g. fetched public/fixtures/triggerMap.json).
 * Falls back to embedded TRIGGER_MAP validation shape.
 */
export function loadTriggerMap(json: unknown): TriggerMapEntry[] {
  if (!Array.isArray(json)) {
    throw new Error('Trigger map must be a JSON array');
  }
  return json.map((entry, i) => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      typeof (entry as TriggerMapEntry).CladEvent !== 'string' ||
      typeof (entry as TriggerMapEntry).AnimName !== 'string'
    ) {
      throw new Error(`Invalid trigger map entry at index ${i}`);
    }
    return {
      CladEvent: (entry as TriggerMapEntry).CladEvent,
      AnimName: (entry as TriggerMapEntry).AnimName,
    };
  });
}

/** Sentinel relative paths required for custom pack detection on robot. */
export const SENTINEL_PATHS = [
  'off.json',
  'cubeSpinner/purple/spinner_purple_celebration.json',
] as const;

/** Expected full pack size (stock / custom export). */
export const FULL_PACK_PATTERN_COUNT = 32;
