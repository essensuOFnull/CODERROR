(function patchAudioWorklet() {
  if (typeof window === 'undefined') return;
  if (window.__omniscienceWorkletPatched) return;
  window.__omniscienceWorkletPatched = true;

  // --- Диагностика окружения ---
  console.log('[wp] typeof AudioWorklet:', typeof AudioWorklet);
  console.log('[wp] typeof Worklet:', typeof Worklet);
  console.log('[wp] typeof AudioContext:', typeof AudioContext);

  function makePatchedAddModule(name) {
    return async function addModulePatched(url, options) {
      const urlStr = typeof url === 'string' ? url : String(url);
      console.log(`[wp] addModule via ${name}:`, urlStr.slice(0, 120));

      if (!urlStr || urlStr.startsWith('blob:')) {
        return origAddModule.call(this, url, options);
      }

      try {
        const res = await fetch(urlStr);
        if (!res.ok) {
          console.warn(`[wp] fetch !ok (${res.status}), fallback`);
          return origAddModule.call(this, url, options);
        }
        const code = await res.text();
        const blob = new Blob([code], { type: 'text/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        console.log(`[wp] fetch ok, ${code.length} bytes → blob`);

        try {
          return await origAddModule.call(this, blobUrl, options);
        } finally {
          setTimeout(() => {
            try { URL.revokeObjectURL(blobUrl); } catch (_) {}
          }, 1000);
        }
      } catch (err) {
        console.warn(`[wp] fetch failed (${name}), fallback:`, err);
        return origAddModule.call(this, url, options);
      }
    };
  }

  let origAddModule;

  // Атака №1: AudioWorklet.prototype.addModule
  if (typeof AudioWorklet !== 'undefined' && AudioWorklet.prototype?.addModule) {
    origAddModule = AudioWorklet.prototype.addModule;
    AudioWorklet.prototype.addModule = makePatchedAddModule('AudioWorklet.prototype');
    console.log('[wp] patched AudioWorklet.prototype.addModule');
  }

  // Атака №2: Worklet.prototype.addModule
  if (typeof Worklet !== 'undefined' && Worklet.prototype?.addModule) {
    const origW = Worklet.prototype.addModule;
    Worklet.prototype.addModule = async function (url, options) {
      const urlStr = typeof url === 'string' ? url : String(url);
      console.log('[wp] addModule via Worklet.prototype:', urlStr.slice(0, 120));
      if (!urlStr || urlStr.startsWith('blob:')) return origW.call(this, url, options);
      try {
        const res = await fetch(urlStr);
        if (!res.ok) return origW.call(this, url, options);
        const code = await res.text();
        const blob = new Blob([code], { type: 'text/javascript' });
        return await origW.call(this, URL.createObjectURL(blob), options);
      } catch (e) {
        console.warn('[wp] Worklet fetch fallback:', e);
        return origW.call(this, url, options);
      }
    };
    console.log('[wp] patched Worklet.prototype.addModule');
  }

  if (!origAddModule && !(typeof Worklet !== 'undefined' && Worklet.prototype)) {
    console.warn('[wp] NEITHER AudioWorklet nor Worklet available — patching impossible');
  }
})();

export default true;