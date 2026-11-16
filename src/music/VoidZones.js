const DRONE = "note('c1').s('sine').slow(24).gain(.22).room(.9)";
const PAD = "note(`<[c3,e3,g3][a2,c3,e3][f2,a2,c3][g2,b2,d3]>`).s('triangle').slow(6).attack(2).release(3).room(.95).gain(.2).lpf(1200)";
const BASS = "note(`<[~ c3][d3 ~][~ c3 ~][d3 ~ d3]>`).s('sawtooth').slow(3).lpf(280).gain(.45)";
const SUB = "note(`<[~ c2][~ ~][~ c2 ~][~ ~ ~]>`).s('sawtooth').slow(3).lpf(150).gain(.3)";
const ARP = "note(`<[c3,e3,g3][a2,c3,e3][f2,a2,c3][g2,b2,d3]>`).s('sawtooth').slow(6).attack(2).release(3).room(.95).gain(.08).lpf(sine.range(300,1400).slow(8))";
const NOISE = "s('white*8').gain(.03).hpf(2000).room(.8)";
const SPARKS = "s('white*32').gain(.05).decay(.03).hpf(4000).degradeBy(.7).pan(rand).room(.6)";
const MELODY = "note(`<[~ ~ e4 ~][~ d4 ~ ~][~ ~ c4 ~]>`).s('triangle').slow(6).room(.9).gain(.26).pan(.35).delay(.5)";
const HIGH_LINE = "note(`<[~ b4 ~ ~][~ ~ ~ ~][~ ~ e5 ~][~ ~ ~ ~]>`).s('sine').slow(6).gain(.13).room(1).pan(.7).delay(.6)";
const MAIN_THEME = "note(`<[[b3 ~]a3*3[b3 ~]c3*3[d4 ~][e4*3 ~]]*2 [[d4 ~] a3*3 [d4 ~] [c4*3] d4 b4]*2>`).s('square').slow(3).lpf(1800).room(.7).gain(.3)";
const RANDOM_NOTES = "n(irand(12).fast(16)).scale('C:major').s('square').gain(rand.range(.02,.06)).pan(rand).room(.9).delay(.3).sometimesBy(.4,x=>x.crush(4))";
const HIGH_RANDOM = "n(irand(12).fast(8)).scale('C:major').add(24).s('triangle').gain(rand.range(.01,.04)).pan(rand).room(1).delay(.6)";

function score(...layers) {
  return `setcps(.5)
stack(
  ${layers.join(',\n  ')}
)`;
}

export const VOID_ZONE_MUSIC = [
  score(DRONE, PAD),
  score(DRONE, PAD, BASS),
  score(DRONE, PAD, BASS, SUB, ARP),
  score(DRONE, PAD, BASS, SUB, ARP, NOISE, SPARKS),
  score(DRONE, PAD, BASS, SUB, ARP, NOISE, SPARKS, MELODY),
  score(DRONE, PAD, BASS, SUB, ARP, NOISE, SPARKS, MELODY, HIGH_LINE, RANDOM_NOTES),
  score(
    DRONE,
    PAD,
    BASS,
    SUB,
    ARP,
    NOISE,
    SPARKS,
    MELODY,
    HIGH_LINE,
    RANDOM_NOTES,
    HIGH_RANDOM,
    MAIN_THEME,
    `${MAIN_THEME}.gain(.28).lpf(900)`,
    `${MAIN_THEME}.crush(5).coarse(3).lpf(2500).gain(.08).pan(.7).room(.6).delay(.4)`,
    `${MAIN_THEME}.rev().lpf(1200).gain(.12).pan(.3).room(.8)`,
    "note(`[~ ~ ~ ~][~ ~ ~ ~][~ ~ g4 ~][~ ~ ~ ~]`).s('sine').slow(3).gain(.18).room(1).delay(.7).pan(.2)",
    "note('b6').s('sine').gain(.04).decay(.05).room(1).delay(.5).degradeBy(.9).pan(rand).sometimesBy(.3,x=>x.add(note(irand(3)*2)))",
  ),
];
