setcps(0.5)
const motif    = `<[a4*4 b4*2 a4*4 a3*2]*2 [[[a4 ~] [b4 ~]]*2 [[b4 ~] [a4 ~]]*2]*2>`
const mel1     = note(motif).s('sawtooth').gain(0.3)
                    .lpf(perlin.range(600, 2500).slow(16)).room(0.4).orbit(1)
const mel2     = note(motif).s('triangle').gain(0.15)
                    .delay(0.3).delayfeedback(0.4).orbit(2)
const arp      = note(motif).s('square').gain(0.08)
                    .room(0.7).roomsize(4).orbit(3)
const bass     = note(`<a2 a2 e3 e3 f2 f2 g2 g2>`).s('sawtooth').lpf(500).gain(0.5)

stack(
  bass.fast(1).lpf(1200).distort(0.5),
  mel1.distort(0.55).sometimesBy(0.3, x => x.fast(2)),
  mel2.fast(2).distort(0.4),
  arp.fast(2).crush(6).gain(0.1).distort(0.3),
  note("[a3, b3, e4, f4]").s('sawtooth').gain(0.08).distort(0.35).room(0.4),
  note("a1 e2").s('sawtooth').gain(0.4).lpf(300).distort(0.3),
  note("[a4, d#4]").s('sine').gain(0.06).fast(2).sometimesBy(0.4, x => x.rev())
)
