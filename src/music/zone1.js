setcps(0.5)
const motif    = `<[a4*4 b4*2 a4*4 a3*2]*2 [[[a4 ~] [b4 ~]]*2 [[b4 ~] [a4 ~]]*2]*2>`
const pad      = note("[a3, c4, e4]").s('sine').gain(0.2).room(0.85).roomsize(6).orbit(4)
const subDrone = note("a1").s('sine').gain(0.35).lpf(150).room(0.5).orbit(5)
const mel1     = note(motif).s('sawtooth').gain(0.3)
                    .lpf(perlin.range(600, 2500).slow(16)).room(0.4).orbit(1)

stack(
  pad.slow(2),
  subDrone.slow(4),
  mel1.slow(2).gain(0.18)
)
