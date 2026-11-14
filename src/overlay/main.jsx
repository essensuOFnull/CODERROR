import * as THREE from 'three';

const PADDING = 64.0; // Должно совпадать с PADDING в Rust

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.z = 1;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
renderer.domElement.style.pointerEvents = 'none';
document.getElementById('overlay-root').appendChild(renderer.domElement);

const material = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  depthTest: false,
  uniforms: {
    uTime:       { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPadding:    { value: PADDING * (window.devicePixelRatio || 1) },
    uScale:      { value: window.devicePixelRatio || 1 },
  },
  vertexShader: /* glsl */`
    void main() {
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;

    uniform float uTime;
    uniform vec2  uResolution;
    uniform float uPadding;
    uniform float uScale;

    float hash11(float p){
      p = fract(p * 0.1031);
      p *= p + 33.33;
      p *= p + p;
      return fract(p);
    }
    float hash21(vec2 p){
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main(){
      vec2  uv     = gl_FragCoord.xy / uResolution;
      float aspect = uResolution.x / uResolution.y;
      float t      = uTime;

      // ============================================================
      // 1. МАСКА РАМКИ (строго по границам окна)
      // ============================================================
      float dL = gl_FragCoord.x;
      float dR = uResolution.x - gl_FragCoord.x;
      float dB = gl_FragCoord.y;
      float dT = uResolution.y - gl_FragCoord.y;
      
      float distToEdgePx = min(min(dL, dR), min(dB, dT));
      float distFromWindowPx = uPadding - distToEdgePx;

      // Если мы внутри окна (за пределами рамки) — отсекаем
      if (distFromWindowPx < 0.0) discard;

      // 0 = внутренний край (прилегает к окну), 1 = внешний край
      float depth = clamp(distFromWindowPx / uPadding, 0.0, 1.0);

      // ============================================================
      // 2. ГЛИТЧ
      // ============================================================
      float bands  = 60.0;
      float bandId = floor(uv.y * bands);
      float tick   = floor(t * 8.0);

      float bandR   = hash11(bandId * 1.37 + tick * 13.7);
      float bandOn  = step(0.70, bandR);
      float bandMag = (bandR - 0.70) / 0.30;

      float shiftX = (hash11(bandId * 2.71 + tick * 5.13) - 0.5) * 0.08 * bandOn;
      float colId  = floor(uv.x * 40.0);
      float colR   = hash11(colId * 5.1 + tick * 3.3);
      float colOn  = step(0.94, colR);
      float shiftY = (colR - 0.94) / 0.06 * 0.03 * colOn;

      vec2 gUv = uv;
      gUv.x += shiftX;
      gUv.y += shiftY + sin(uv.x * 40.0 + t * 10.0) * 0.002 * bandOn;

      vec2  gridSize = vec2(60.0 * aspect, 60.0);
      vec2  blockUv  = floor(gUv * gridSize) / gridSize;
      float blockN   = hash21(blockUv * 17.0 + t * 3.0);
      float blockOn  = step(0.80, hash11(bandId + tick * 7.0));
      gUv = mix(gUv, blockUv + (blockN - 0.5) * 0.02, blockOn * bandOn * 0.7);

      // ============================================================
      // 3. ХРОМАТИЧЕСКИЙ ШУМ
      // ============================================================
      float scale = 80.0;
      vec2  ca    = vec2(0.004, 0.0) * (0.6 + depth);
      float nr = hash21(gUv * scale + t * 2.0 + ca);
      float ng = hash21(gUv * scale + t * 2.0);
      float nb = hash21(gUv * scale + t * 2.0 - ca);
      vec3  noise = vec3(nr, ng, nb);

      // ============================================================
      // 4. ЦВЕТ
      // ============================================================
      vec3 cCyan    = vec3(0.0, 0.85, 1.0);
      vec3 cMagenta = vec3(1.0, 0.10, 0.75);
      vec3 tint     = mix(cCyan, cMagenta, 0.5 + 0.5 * sin(t * 1.3 + uv.y * 5.0));

      vec3 col = tint * (0.12 + 0.55 * noise) + noise * 0.30;
      col += bandOn * bandMag * vec3(0.5, 0.7, 1.0) * 0.5;

      // ============================================================
      // 5. СКАН-ЛИНИИ
      // ============================================================
      float scan = 0.75 + 0.25 * (0.5 + 0.5 * sin(gl_FragCoord.y * (1.6 / uScale) + t * 5.0));
      col *= scan;

      // ============================================================
      // 6. ВНУТРЕННЯЯ СВЕТЯЩАЯСЯ КРОМКА
      // ============================================================
      float rim  = exp(-depth * 14.0);
      float line = smoothstep(0.0, 0.015, depth) * (1.0 - smoothstep(0.015, 0.045, depth));
      
      col += tint     * rim  * 0.7;
      col += vec3(1.0) * line * 0.8;
      col *= 0.92 + 0.08 * sin(t * 2.2);

      // ============================================================
      // 7. АЛЬФА
      // ============================================================
      float alpha = pow(1.0 - depth, 1.2);
      alpha = max(alpha, rim  * 0.9);
      alpha = max(alpha, line);
      alpha *= 0.92 + 0.08 * hash11(floor(t * 24.0));
      alpha *= 0.9;

      gl_FragColor = vec4(col, alpha);
    }
  `,
});

const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
mesh.frustumCulled = false;
scene.add(mesh);

function updateResolution() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  
  const dpr = window.devicePixelRatio || 1;
  const drawSize = renderer.getDrawingBufferSize(new THREE.Vector2());
  
  material.uniforms.uResolution.value.copy(drawSize);
  material.uniforms.uPadding.value = PADDING * dpr; 
  material.uniforms.uScale.value = dpr;
}

updateResolution();

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  material.uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', updateResolution);