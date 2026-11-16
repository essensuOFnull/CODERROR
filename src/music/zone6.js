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
  bass.fast(2).distort(0.7).lpf(2000),
  mel1.fast(2).distort(0.65).superimpose(x => x.transpose(1)),
  mel2.fast(2).distort(0.5).rev()
      .sometimesBy(0.5, x => x.fast(2))
      .sometimesBy(0.3, x => x.ply(2)),
  arp.fast(4).crush(3).gain(0.12).distort(0.5)
     .sometimesBy(0.4, x => x.rev()),
  note("[a3, b3, e4, f4, a4, b4]").s('sawtooth').gain(0.1).distort(0.55).fast(2),
  note("[a4, d#4]").s('square').gain(0.07).fast(4)
      .sometimesBy(0.5, x => x.rev()),
  note("a1 a1 e2 f2").s('sawtooth').gain(0.45).lpf(400).distort(0.4),
  note("a0").s('sine').gain(0.5).lpf(100),
  note("a5 b5 c6 b5 a5 b5 c6 d6").s('square').gain(0.06).fast(4)
      .sometimesBy(0.3, x => x.rev())
      .sometimesBy(0.2, x => x.transpose(1)),
  noise().gain(0.015).hpf(3000).room(0.6).orbit(6)
)
