setcps(.5)
const
A=note(`<[[b3 ~]a3*3[b3 ~]c3*3[d4 ~][e4*3 ~]]*2 [[d4 ~] a3*3 [d4 ~] [c4*3] d4 b4]*2>`).s('square').slow(3).lpf(1800).room(.7).gain(.3),
B=A.gain(.28).lpf(900),
C=A.crush(5).coarse(3).lpf(2500).gain(.08).pan(.7).room(.6).delay(.4),
D=A.sometimesBy(.2,x=>x.crush(4).add(note(12))),
E=A.rev().lpf(1200).gain(.12).pan(.3).room(.8),
F=note(`<[~ c3][d3 ~][~ c3 ~][d3 ~ d3]>`).s('sawtooth').slow(3).lpf(280).gain(.55),
G=note(`<[~ c2][~ ~][~ c2 ~][~ ~ ~]>`).s('sawtooth').slow(3).lpf(150).distort(1.6).gain(.35),
H=note('c1').s('sine').slow(24).gain(.22).room(.9),
PD=`<[c3,e3,g3][a2,c3,e3][f2,a2,c3][g2,b2,d3]>`,
I=note(PD).s('triangle').slow(6).attack(2).release(3).room(.95).gain(.22).lpf(1400),
J=note(PD).s('sawtooth').slow(6).attack(2).release(3).room(.95).gain(.09).lpf(sine.range(300,1400).slow(8)).sometimesBy(.3,x=>x.crush(6)),
K=note(`<[~ ~ e4 ~][~ d4 ~ ~][~ ~ c4 ~]>`).s('triangle').slow(6).room(.9).gain(.28).pan(.35).delay(.5),
L=note(`<[~ b4 ~ ~][~ ~ ~ ~][~ ~ e5 ~][~ ~ ~ ~]>`).s('sine').slow(6).gain(.15).room(1).pan(.7).delay(.6),
M=note(`[~ ~ ~ ~][~ ~ ~ ~][~ ~ g4 ~][~ ~ ~ ~]`).s('sine').slow(3).gain(.18).room(1).delay(.7).pan(.2),
N=n(irand(12).fast(16)).scale('C:major').s('square').gain(rand.range(.02,.08)).pan(rand).room(.9).delay(.3).sometimesBy(.4,x=>x.crush(4)).sometimesBy(.3,x=>x.coarse(3)),
O=n(irand(12).fast(8)).scale('C:major').add(24).s('triangle').gain(rand.range(.01,.04)).pan(rand).room(1).delay(.6),
P=s('white*8').gain(.03).hpf(2000).room(.8).sometimesBy(.3,x=>x.gain(.07)),
Q=s('white*32').gain(.06).decay(.03).hpf(4000).degradeBy(.7).pan(rand).room(.6),
R=note('b6').s('sine').gain(.04).decay(.05).room(1).delay(.5).degradeBy(.9).pan(rand).sometimesBy(.3,x=>x.add(note(irand(3)*2))),
S=s('white').gain(.05).attack(4).release(.1).bpf(sine.range(200,5000).slow(4)).room(.9)
arrange(
[16,stack(H,J,B)],
[24,stack(H,I,A,F,O)],
[24,stack(H,I,A,F,K,N)],
[16,stack(H,J,Q,P,N,S)],
[32,stack(H,I,A,F,K,L,N,P)],
[24,stack(H,I,A,G,K,L,C,N,Q,R)],
[32,stack(H,I,J,A,D,E,F,G,K,L,M,N,O,P,Q,R)],
[16,stack(H,J,L,O,R,S)],
[16,stack(H,J,B)]
)