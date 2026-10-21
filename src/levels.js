import { COLORS } from './config.js';

const chapters = [
  ['VECTOR FIELD', '01', COLORS.jade],
  ['CARRIER WAVE', '02', COLORS.violet],
  ['PRISM ARRAY', '03', COLORS.gold],
  ['INVERSION', '04', COLORS.pink],
  ['FRACTURE', '05', COLORS.orange],
  ['POLARITY', '06', COLORS.violet],
  ['ORBITAL', '07', COLORS.jade],
  ['HYPERGRID', '08', COLORS.gold],
  ['SINGULARITY', '09', COLORS.pink],
  ['INFINITY', '10', COLORS.orange],
];

// Fifty authored progression entries: ten settings, five encounter grammars each.
// The five-gate sawtooth alternates build, spike, release, frenzy, guardian.
export const LEVELS = Array.from({ length: 50 }, (_, i) => {
  const chapter = Math.floor(i / 5), beat = i % 5;
  const [name, glyph, color] = chapters[chapter];
  return {
    number: i + 1, chapter, beat, name, glyph, color,
    boss: beat === 4,
    duration: 18 + chapter * 0.7 + beat * 1.4,
    intensity: [0.75, 1.05, 0.8, 1.3, 0.65][beat] * (1 + chapter * 0.16),
    sides: [8, 6, 4, 10, 5, 12, 7][(chapter * 2 + beat) % 7],
    rotation: (chapter * 0.39 + beat * 0.2),
    pattern: ['hunt', 'spiral', 'flood', 'pincer', 'ritual'][(beat + chapter) % 5],
    modifier: ['none', 'gravity', 'eruption', 'tide', 'storm'][chapter % 5],
    enemies: [
      ['diamond', 'cube', 'spinner', 'mote'], ['diamond', 'prism', 'cube', 'mote'],
      ['dart', 'diamond', 'splitter', 'mote'], ['spinner', 'guard', 'prism'],
      ['cube', 'dart', 'splitter', 'mote'],
    ][(chapter + beat) % 5].map(type=>type==='splitter'&&i<15?'cube':type),
  };
});

export const BOSS_NAMES = ['AXIOM', 'HEX CORE', 'PRISM ENGINE', 'TESSERACT', 'FRACTAL', 'POLARIS', 'ORBITAL ENGINE', 'HYPERCUBE', 'SINGULARITY', 'OMEGA'];
