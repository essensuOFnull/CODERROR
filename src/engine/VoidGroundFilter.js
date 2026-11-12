import { Filter, GlProgram, UniformGroup } from 'pixi.js';

const VERTEX = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`;

const FRAGMENT = /* glsl */ `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main(void) {
  vec2 uv = vTextureCoord;
  vec4 original = texture(uTexture, uv);
  float brightness = max(max(original.r, original.g), original.b);
  float terrain = smoothstep(0.045, 0.15, brightness)
    * (1.0 - smoothstep(0.48, 0.62, brightness)) * original.a;

  if (terrain < 0.01) {
    finalColor = original;
    return;
  }

  float wave = sin(uv.y * 49.0 + uTime * 1.7
    + sin(uv.x * 11.0 - uTime * 0.8) * 1.4) * 0.0018;
  float melt = sin(uv.x * 27.0 + uTime * 1.2
    + sin(uv.y * 17.0 + uTime) * 1.7) * 0.0012;
  float row = floor(uv.y * 150.0);
  float slice = step(0.986, hash(vec2(row, floor(uTime * 8.0))));
  float tear = slice * (hash(vec2(row, floor(uTime * 17.0) + 4.0)) - 0.5) * 0.035;
  vec2 offset = vec2(wave + tear, melt) * terrain;
  vec2 distortedUv = clamp(uv + offset, vec2(0.0), vec2(1.0));

  vec4 base = texture(uTexture, distortedUv);
  vec3 color = vec3(base.r, base.g, original.b);

  float cell = hash(floor(uv * vec2(112.0, 70.0))
    + vec2(floor(uTime * 1.1), floor(uTime * 0.7)));
  float rot = step(0.994, cell) * terrain;
  float pulse = 0.5 + 0.5 * sin(uTime * 2.8 + uv.x * 38.0 + uv.y * 21.0);
  vec3 rotColor = mix(vec3(0.12, 0.95, 0.72), vec3(0.94, 0.12, 0.78), pulse);
  color = mix(color, color * rotColor * 1.8, 0.24 * terrain);

  float scanline = step(0.992, hash(vec2(row, floor(uTime * 13.0)))) * terrain;
  float dissolve = max(rot * 0.9, scanline * 0.45);
  color *= 1.0 - dissolve * 0.15;
  float alpha = base.a;

  finalColor = vec4(color * alpha, alpha);
}
`;

export function createVoidGroundFilter() {
  const uniforms = new UniformGroup({
    uTime: { value: 0, type: 'f32' },
  });
  const filter = new Filter({
    glProgram: GlProgram.from({ vertex: VERTEX, fragment: FRAGMENT }),
    resources: { uniforms },
  });

  filter.padding = 8;
  return { filter, uniforms };
}
