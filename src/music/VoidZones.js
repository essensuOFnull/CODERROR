const MOTIF = `<
  [a4*4 b4*2 a4*4 a3*2]*2
  [[[a4 ~] [b4 ~]]*2 [[b4 ~] [a4 ~]]*2]*2
>`;

const PAD = "note('[a3, c4, e4]').s('sine').gain(0.2).room(0.85).roomsize(6).orbit(4)";
const SUB_DRONE = "note('a1').s('sine').gain(0.35).lpf(150).room(0.5).orbit(5)";
const MELODY = `note(${JSON.stringify(MOTIF)}).s('z_sawtooth').gain(0.3).lpf(perlin.range(600, 2500).slow(16)).room(0.4).orbit(1)`;
const ECHO_MELODY = `note(${JSON.stringify(MOTIF)}).s('z_triangle').gain(0.15).delay(0.3).delayfeedback(0.4).orbit(2)`;
const ARPEGGIO = `note(${JSON.stringify(MOTIF)}).s('z_tan').gain(0.08).fast(2).room(0.7).roomsize(4).orbit(3)`;
const BASS = "note('<a2 a2 e3 e3 f2 f2 g2 g2>').s('sawtooth').lpf(500).gain(0.5)";
const NOISE = "noise().gain(0.015).hpf(3000).room(0.6).orbit(6)";

function track(...layers) {
  return `setcps(0.5)\nstack(\n  ${layers.join(',\n  ')}\n)`;
}

export const VOID_ZONE_MUSIC = [
  track(PAD + '.slow(2)', SUB_DRONE + '.slow(4)'),
  track(PAD + '.slow(2)', SUB_DRONE + '.slow(4)', MELODY + '.slow(2).gain(0.18)'),
  track(BASS, PAD, MELODY, ECHO_MELODY),
  track(
    BASS,
    PAD,
    MELODY,
    ECHO_MELODY,
    ARPEGGIO,
    "note('[a4, b4]').s('sine').gain(0.05).slow(2).room(0.8)",
    "note('[a3, d#4]').s('z_triangle').gain(0.03).slow(4)",
  ),
  track(
    BASS + '.lpf(800).distort(0.3)',
    PAD + '.sometimesBy(0.3, x => x.transpose(1))',
    MELODY + '.distort(0.35)',
    ECHO_MELODY + '.distort(0.25)',
    ARPEGGIO + '.fast(2).gain(0.1)',
    "note('[a3, b3, e4]').s('sawtooth').gain(0.06).room(0.5)",
    SUB_DRONE + '.lpf(250)',
  ),
  track(
    BASS + '.fast(1).lpf(1200).distort(0.5)',
    MELODY + '.distort(0.55).sometimesBy(0.3, x => x.fast(2))',
    ECHO_MELODY + '.fast(2).distort(0.4)',
    ARPEGGIO + '.fast(2).crush(6).gain(0.1).distort(0.3)',
    "note('[a3, b3, e4, f4]').s('sawtooth').gain(0.08).distort(0.35).room(0.4)",
    "note('a1 e2').s('sawtooth').gain(0.4).lpf(300).distort(0.3)",
    "note('[a4, d#4]').s('sine').gain(0.06).fast(2).sometimesBy(0.4, x => x.rev())",
  ),
  track(
    BASS + '.fast(2).distort(0.7).lpf(2000)',
    MELODY + '.fast(2).distort(0.65).superimpose(x => x.transpose(1))',
    ECHO_MELODY + '.fast(2).distort(0.5).rev().sometimesBy(0.5, x => x.fast(2)).sometimesBy(0.3, x => x.ply(2))',
    ARPEGGIO + '.fast(4).crush(3).gain(0.12).distort(0.5).sometimesBy(0.4, x => x.rev())',
    "note('[a3, b3, e4, f4, a4, b4]').s('sawtooth').gain(0.1).distort(0.55).fast(2)",
    "note('[a4, d#4]').s('z_tan').gain(0.07).fast(4).sometimesBy(0.5, x => x.rev())",
    "note('a1 a1 e2 f2').s('sawtooth').gain(0.45).lpf(400).distort(0.4)",
    "note('a0').s('sine').gain(0.5).lpf(100)",
    "note('a5 b5 c6 b5 a5 b5 c6 d6').s('z_tan').gain(0.06).fast(4).sometimesBy(0.3, x => x.rev()).sometimesBy(0.2, x => x.transpose(1))",
    NOISE,
  ),
];
