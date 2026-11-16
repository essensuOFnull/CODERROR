setcps(0.5)
const motif    = `<[a4*4 b4*2 a4*4 a3*2]*2 [[[a4 ~] [b4 ~]]*2 [[b4 ~] [a4 ~]]*2]*2>`
const pad      = note("[a3, c4, e4]").s('sine').gain(0.2).room(0.85).roomsize(6).orbit(4)
const mel1     = note(motif).s('sawtooth').gain(0.3)
                    .lpf(perlin.range(600, 2500).slow(16)).room(0.4).orbit(1)
const mel2     = note(motif).s('triangle').gain(0.15)
                    .delay(0.3).delayfeedback(0.4).orbit(2)
const arp      = note(motif).s('square').gain(0.08)
                    .room(0.7).roomsize(4).orbit(3)
const bass     = note(`<a2 a2 e3 e3 f2 f2 g2 g2>`).s('sawtooth').lpf(500).gain(0.5)

stack(
  bass, pad, mel1, mel2, arp,
  note("[a4, b4]").s('sine').gain(0.05).slow(2).room(0.8),
  note("[a3, d#4]").s('triangle').gain(0.03).slow(4)
)
