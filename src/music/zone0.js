setcps(0.5)
const pad      = note("[a3, c4, e4]").s('sine').gain(0.2).room(0.85).roomsize(6).orbit(4)
const subDrone = note("a1").s('sine').gain(0.35).lpf(150).room(0.5).orbit(5)

stack(
  pad.slow(2),
  subDrone.slow(4)
)
