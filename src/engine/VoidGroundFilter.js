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
uniform float uDifficulty;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 biomeTint(float difficulty) {
  if (difficulty < 0.5) return vec3(0.82, 0.85, 0.9);
  if (difficulty < 1.5) return vec3(1.0, 0.82, 0.28);
  if (difficulty < 2.5) return vec3(1.0, 0.3, 0.88);
  if (difficulty < 3.5) return vec3(1.0, 0.32, 0.28);
  if (difficulty < 4.5) return vec3(0.25, 0.9, 1.0);
  if (difficulty < 5.5) return vec3(0.35, 1.0, 0.34);
  return vec3(0.32, 0.48, 1.0);
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
  color = mix(color, color * biomeTint(uDifficulty), 0.2 * terrain);
  float alpha = base.a;

  finalColor = vec4(color * alpha, alpha);
}
`;

export function createVoidGroundFilter() {
  const uniforms = new UniformGroup({
    uTime: { value: 0, type: 'f32' },
    uDifficulty: { value: 0, type: 'f32' },
  });
  const filter = new Filter({
    glProgram: GlProgram.from({ vertex: VERTEX, fragment: FRAGMENT }),
    resources: { uniforms },
  });

  filter.padding = 8;
  return { filter, uniforms };
}

const SHIELD_FRAGMENT = /* glsl */ `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uCameraX;
uniform float uCameraY;
uniform float uViewportWidth;
uniform float uViewportHeight;
uniform float uCenterY;
uniform float uCellAspect;
uniform float uSafeRadius;
uniform float uBarrierSpacing;
uniform float uWorldRadius;

vec3 shieldColor(float zone) {
  if (zone < 0.5) return vec3(1.0);
  if (zone < 1.5) return vec3(1.0, 1.0, 0.0);
  if (zone < 2.5) return vec3(1.0, 0.0, 1.0);
  if (zone < 3.5) return vec3(1.0, 0.0, 0.0);
  if (zone < 4.5) return vec3(0.0, 1.0, 1.0);
  if (zone < 5.5) return vec3(0.0, 1.0, 0.0);
  if (zone < 6.5) return vec3(0.0, 0.0, 1.0);
  return vec3(0.02, 0.025, 0.04);
}

void main(void) {
  vec4 original = texture(uTexture, vTextureCoord);
  vec2 worldPosition = vec2(
    uCameraX + vTextureCoord.x * uViewportWidth,
    uCameraY + vTextureCoord.y * uViewportHeight
  );
  vec2 worldOffset = vec2(
    worldPosition.x,
    (worldPosition.y - uCenterY) * uCellAspect
  );
  float distanceFromCenter = length(worldOffset);
  float angle = atan(worldOffset.y, worldOffset.x);
  vec3 accumulatedColor = vec3(0.0);
  float accumulatedAlpha = 0.0;
  vec3 lightDirection = normalize(vec3(-0.42, -0.55, 0.72));

  for (int index = 0; index < 8; index++) {
    float barrier = float(index);
    float radius = uSafeRadius + barrier * uBarrierSpacing;
    if (radius > uWorldRadius) continue;

    float radialGap = abs(distanceFromCenter - radius);
    if (radialGap > 18.0) continue;

    vec3 tint = shieldColor(barrier);
    float normalizedRadius = distanceFromCenter / radius;
    float sphereDepth = sqrt(max(0.0, 1.0 - normalizedRadius * normalizedRadius));
    vec3 normal = normalize(vec3(worldOffset / radius, sphereDepth));
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float fresnel = pow(1.0 - sphereDepth, 3.0);

    float rotation = angle * (22.0 + barrier * 2.1) - uTime * (1.5 + barrier * 0.17);
    float pulse = 0.5 + 0.5 * sin(angle * 4.0 - uTime * 1.8 + barrier * 0.8);
    float runes = pow(max(0.0, sin(rotation)), 10.0);
    float thickness = mix(0.8, 8.0, barrier / 7.0);
    float shell = 1.0 - smoothstep(thickness * 0.32, thickness, radialGap);
    float auraWidth = mix(2.0, 15.0, barrier / 7.0);
    float aura = exp(-radialGap / auraWidth);
    float filamentOffset = 4.5 + 2.0 * sin(angle * 6.0 + uTime * 1.1 + barrier);
    float filament = exp(-abs(distanceFromCenter - radius + filamentOffset) * mix(0.6, 0.22, barrier / 7.0));
    float echoOffset = 5.0 + 1.6 * sin(angle * 4.0 - uTime * 0.9 + barrier * 1.5);
    float echo = exp(-abs(distanceFromCenter - radius - echoOffset) * mix(0.65, 0.25, barrier / 7.0));
    float fill = 1.0 - smoothstep(radius - 20.0, radius - 3.0, distanceFromCenter);

    float layerAlpha = shell * (0.52 + fresnel * 0.18 + pulse * 0.16 + runes * 0.38)
      + aura * (0.075 + pulse * 0.06)
      + filament * 0.22
      + echo * 0.18
      + fill * 0.018;
    layerAlpha = min(layerAlpha, 0.95) * original.a;
    vec3 highlight = vec3(1.0) * (fresnel * 0.36 + runes * 0.82 + diffuse * 0.16);
    vec3 layerColor = min(tint * (0.72 + diffuse * 0.72 + pulse * 0.2) + highlight, vec3(1.0));

    accumulatedColor = layerColor * layerAlpha
      + accumulatedColor * (1.0 - layerAlpha);
    accumulatedAlpha = layerAlpha + accumulatedAlpha * (1.0 - layerAlpha);
  }

  finalColor = vec4(accumulatedColor, accumulatedAlpha);
}
`;

export function createVoidShieldFilter() {
  const uniforms = new UniformGroup({
    uTime: { value: 0, type: 'f32' },
    uCameraX: { value: 0, type: 'f32' },
    uCameraY: { value: 0, type: 'f32' },
    uViewportWidth: { value: 1, type: 'f32' },
    uViewportHeight: { value: 1, type: 'f32' },
    uCenterY: { value: 0, type: 'f32' },
    uCellAspect: { value: 1, type: 'f32' },
    uSafeRadius: { value: 50, type: 'f32' },
    uBarrierSpacing: { value: 256, type: 'f32' },
    uWorldRadius: { value: 1842, type: 'f32' },
  });
  const filter = new Filter({
    glProgram: GlProgram.from({ vertex: VERTEX, fragment: SHIELD_FRAGMENT }),
    resources: { uniforms },
  });
  filter.padding = 0;
  return { filter, uniforms };
}
