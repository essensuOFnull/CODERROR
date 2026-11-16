import { useEffect } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';

export default function NativeCursor() {
  useEffect(() => {
    if (!isTauri()) return undefined;

    let active = false;
    let pending = Promise.resolve();

    const setActive = (nextActive) => {
      if (active === nextActive) return;
      active = nextActive;

      pending = pending
        .then(() => invoke('set_native_cursor', { active: nextActive }))
        .catch((error) => {
          console.error('Failed to update the Windows cursor scheme:', error);
          if (active === nextActive) active = !nextActive;
        });
    };

    const handlePointerMove = (event) => {
      if (!event.pointerType || event.pointerType === 'mouse') {
        setActive(true);
      }
    };

    const handlePointerOut = (event) => {
      if (!event.relatedTarget) setActive(false);
    };

    const handleBlur = () => setActive(false);

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerout', handlePointerOut);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerout', handlePointerOut);
      window.removeEventListener('blur', handleBlur);
      setActive(false);
    };
  }, []);

  return null;
}
