/**
 * Built-in pattern library — always available, not stored, not deletable.
 */

import type { Pattern, Rgba } from './types';
import { SOLID_ON_PERIOD } from './player';
import { presetBlink, presetChase, presetSolid } from './presets';

export interface LibraryPreset {
  id: string;
  name: string;
  pattern: Pattern;
}

const BLACK: Rgba = [0, 0, 0, 1];

function rgba(r: number, g: number, b: number): Rgba {
  return [r, g, b, 1];
}

function all(c: Rgba): [Rgba, Rgba, Rgba] {
  return [[...c] as Rgba, [...c] as Rgba, [...c] as Rgba];
}

function n3(a: number, b = a, c = a): [number, number, number] {
  return [a, b, c];
}

function makePattern(p: {
  on: [Rgba, Rgba, Rgba];
  off?: [Rgba, Rgba, Rgba];
  onMs: [number, number, number];
  offMs: [number, number, number];
  transOn?: [number, number, number];
  transOff?: [number, number, number];
  offset?: [number, number, number];
}): Pattern {
  return {
    onColors: p.on,
    offColors: p.off ?? all(BLACK),
    onPeriod_ms: p.onMs,
    offPeriod_ms: p.offMs,
    transitionOnPeriod_ms: p.transOn ?? n3(0),
    transitionOffPeriod_ms: p.transOff ?? n3(0),
    offset: p.offset ?? n3(0),
  };
}

function preset(id: string, name: string, pattern: Pattern): LibraryPreset {
  return { id, name, pattern };
}

/** Built-in recipes. Ids stay stable so UI keys and tests can rely on them. */
export function libraryPresets(): LibraryPreset[] {
  const cyan: Rgba = [0, 0.85, 1, 1];
  const green: Rgba = [0, 0.5, 0, 1];
  const red: Rgba = [1, 0, 0, 1];
  const greenChase = presetChase(green, 600, 600, 300);
  greenChase.onPeriod_ms = [600, 1200, 1800];
  greenChase.offPeriod_ms = [1200, 600, 0];
  greenChase.offset = [1200, 600, 0];

  const redRear = presetBlink(red, 600, 600);
  redRear.onColors = [
    [0, 0, 0, 1],
    [0, 0, 0, 1],
    [1, 0, 0, 1],
  ];
  redRear.offColors = [
    [0, 0, 0, 1],
    [0, 0, 0, 1],
    [0, 0, 0, 1],
  ];
  redRear.onPeriod_ms = [0, 0, 600];
  redRear.offPeriod_ms = [0, 0, 600];
  redRear.transitionOnPeriod_ms = [0, 0, 300];
  redRear.transitionOffPeriod_ms = [0, 0, 300];

  const knight = rgba(1, 0.08, 0.02);
  const pulse = rgba(0.95, 0.06, 0.2);
  const ocean = rgba(0.04, 0.32, 0.88);
  const strobe = rgba(0.95, 0.97, 1);
  const amber = rgba(1, 0.55, 0.08);
  const gold = rgba(1, 0.72, 0.18);
  const violet = rgba(0.55, 0.16, 1);
  const comet = rgba(0, 0.88, 1);
  const ice = rgba(0.82, 0.9, 1);

  return [
    preset('preset-solid-cyan', 'Solid cyan', presetSolid(cyan)),
    preset('preset-green-charge-chase', 'Green charge chase', greenChase),
    preset('preset-red-rear-blink', 'Red rear blink', redRear),

    preset(
      'preset-knight-rider',
      'Knight rider',
      makePattern({
        on: all(knight),
        onMs: n3(120),
        offMs: n3(240),
        offset: n3(0, 120, 240),
      })
    ),

    preset(
      'preset-heartbeat',
      'Heartbeat',
      makePattern({
        on: all(pulse),
        onMs: n3(90),
        offMs: n3(810),
        transOff: n3(40),
        offset: n3(0, 0, 180),
      })
    ),

    preset(
      'preset-ocean-swell',
      'Ocean swell',
      makePattern({
        on: all(ocean),
        onMs: n3(300),
        offMs: n3(400),
        transOn: n3(1400),
        transOff: n3(1400),
      })
    ),

    preset(
      'preset-strobe',
      'Strobe',
      makePattern({
        on: all(strobe),
        onMs: n3(40),
        offMs: n3(360),
      })
    ),

    preset(
      'preset-amber-reverse-scan',
      'Amber reverse scan',
      makePattern({
        on: all(amber),
        onMs: n3(180),
        offMs: n3(360),
        transOn: n3(60),
        transOff: n3(60),
        offset: n3(360, 180, 0),
      })
    ),

    preset(
      'preset-rgb-cascade',
      'RGB cascade',
      makePattern({
        on: [rgba(1, 0.05, 0.05), rgba(0.05, 0.85, 0.12), rgba(0.08, 0.32, 1)],
        onMs: n3(180),
        offMs: n3(360),
        transOn: n3(50),
        transOff: n3(50),
        offset: n3(0, 180, 360),
      })
    ),

    preset(
      'preset-split-siren',
      'Split siren',
      makePattern({
        on: [rgba(1, 0, 0), rgba(0.85, 0.88, 0.95), rgba(0.08, 0.22, 1)],
        off: [BLACK, rgba(0.08, 0.08, 0.1), BLACK],
        onMs: n3(180, 80, 180),
        offMs: n3(180, 280, 180),
        offset: n3(0, 0, 180),
      })
    ),

    preset(
      'preset-ember-flicker',
      'Ember flicker',
      makePattern({
        on: [rgba(1, 0.4, 0.05), rgba(1, 0.22, 0.02), rgba(0.9, 0.16, 0)],
        off: [rgba(0.22, 0.05, 0), rgba(0.16, 0.03, 0), rgba(0.12, 0.02, 0)],
        onMs: n3(70, 45, 110),
        offMs: n3(40, 85, 55),
        transOn: n3(20, 15, 25),
        transOff: n3(25, 20, 30),
        offset: n3(0, 33, 71),
      })
    ),

    preset(
      'preset-center-bloom',
      'Center bloom',
      makePattern({
        on: all(violet),
        onMs: n3(220, 320, 220),
        offMs: n3(580, 480, 580),
        transOn: n3(140),
        transOff: n3(220),
        offset: n3(200, 0, 200),
      })
    ),

    preset(
      'preset-comet-tail',
      'Comet tail',
      makePattern({
        on: all(comet),
        onMs: n3(80),
        offMs: n3(180),
        transOn: n3(40),
        transOff: n3(500),
        offset: n3(0, 267, 533),
      })
    ),

    preset(
      'preset-bookend-clap',
      'Bookend clap',
      makePattern({
        on: [ice, rgba(0.55, 0.7, 1), ice],
        onMs: n3(120),
        offMs: n3(480),
        transOn: n3(20),
        transOff: n3(80),
        offset: n3(0, 300, 0),
      })
    ),

    preset(
      'preset-gold-snap-fade',
      'Gold snap fade',
      makePattern({
        on: all(gold),
        onMs: n3(60),
        offMs: n3(280),
        transOn: n3(0),
        transOff: n3(900),
      })
    ),

    preset(
      'preset-rolling-breathe',
      'Rolling breathe',
      makePattern({
        on: all(cyan),
        onMs: n3(300),
        offMs: n3(400),
        transOn: n3(1400),
        transOff: n3(1400),
        offset: n3(0, 1167, 2333),
      })
    ),

    preset(
      'preset-overlap-marquee',
      'Overlap marquee',
      makePattern({
        on: all(cyan),
        onMs: n3(400),
        offMs: n3(200),
        offset: n3(0, 200, 400),
      })
    ),

    preset(
      'preset-wink',
      'Wink',
      makePattern({
        on: all(cyan),
        onMs: n3(920),
        offMs: n3(80),
      })
    ),

    preset(
      'preset-harmonic-trio',
      'Harmonic trio',
      makePattern({
        on: all(cyan),
        onMs: n3(200, 400, 800),
        offMs: n3(200, 400, 800),
      })
    ),

    preset(
      'preset-pendulum',
      'Pendulum',
      makePattern({
        on: all(cyan),
        onMs: n3(250, SOLID_ON_PERIOD, 250),
        offMs: n3(250, 0, 250),
        offset: n3(0, 0, 250),
      })
    ),

    preset(
      'preset-work-stagger',
      'Work stagger',
      makePattern({
        on: all(cyan),
        onMs: n3(100),
        offMs: n3(200),
        offset: n3(0, 100, 200),
      })
    ),

    preset(
      'preset-walking-shadow',
      'Walking shadow',
      makePattern({
        on: all(cyan),
        onMs: n3(600),
        offMs: n3(150),
        offset: n3(0, 250, 500),
      })
    ),

    preset(
      'preset-sawtooth-rise',
      'Sawtooth rise',
      makePattern({
        on: all(cyan),
        onMs: n3(80),
        offMs: n3(220),
        transOn: n3(800),
        transOff: n3(0),
      })
    ),

    preset(
      'preset-duty-cascade',
      'Duty cascade',
      makePattern({
        on: all(cyan),
        onMs: n3(480, 300, 120),
        offMs: n3(120, 300, 480),
      })
    ),

    preset(
      'preset-triple-echo',
      'Triple echo',
      makePattern({
        on: all(cyan),
        onMs: n3(70),
        offMs: n3(830),
        offset: n3(0, 140, 280),
      })
    ),
  ];
}

export function findLibraryPreset(id: string): LibraryPreset | undefined {
  return libraryPresets().find((p) => p.id === id);
}
