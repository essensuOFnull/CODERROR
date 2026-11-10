import * as THREE from 'three';

export class ThreeBackground {
  constructor({ canvas, fov = 75, speedX = 0, speedY = 0 }) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(1);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 1000);
    this.camera.position.set(0, 0, 0);
    this.camera.rotation.order = 'YXZ';

    this.speedX = speedX;
    this.speedY = speedY;
    this._yaw = 0;
    this._xaw = 0;
    this._raf = null;
    this._running = false;
    this._lastT = 0;
    this._cubeTex = null;
  }

  async loadCubemap(faces) {
    const loader = new THREE.CubeTextureLoader().setPath(faces.base);
    const tex = await new Promise((resolve, reject) => {
      loader.load(
        [faces.right, faces.left, faces.top, faces.bottom, faces.front, faces.back],
        resolve, undefined, reject,
      );
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    this._cubeTex = tex;
    this.scene.background = tex;
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastT = performance.now();

    const tick = (now) => {
      if (!this._running) return;
      const dt = Math.min((now - this._lastT) / 1000, 0.1);
      this._lastT = now;

      this._yaw += this.speedX * dt;
      this.camera.rotation.y = this._yaw;
      this._xaw += this.speedY * dt;
      this.camera.rotation.x = this._xaw;

      this.renderer.render(this.scene, this.camera);
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  destroy() {
    this.stop();
    this._cubeTex?.dispose();
    if (this.scene.background?.isTexture) this.scene.background.dispose();
    this.renderer.dispose();
  }
}