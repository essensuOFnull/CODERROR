// src/config/cubemap.js
// Порядок для THREE.CubeTextureLoader.load(urls):
//   [+X, -X, +Y, -Y, +Z, -Z]  ==  [right, left, top, bottom, front, back]
export const CUBEMAP_FACES = {
  right:  new URL('../textures/MainMenu/cubemap/right.png', import.meta.url).href,
  left:   new URL('../textures/MainMenu/cubemap/left.png', import.meta.url).href,
  top:    new URL('../textures/MainMenu/cubemap/top.png', import.meta.url).href,
  bottom: new URL('../textures/MainMenu/cubemap/bottom.png', import.meta.url).href,
  front:  new URL('../textures/MainMenu/cubemap/front.png', import.meta.url).href,
  back:   new URL('../textures/MainMenu/cubemap/back.png', import.meta.url).href,
};

// Если у тебя файлы пока называются px.png и т.п. — просто поменяй значения выше:
//   right: BASE + 'px.png', left: BASE + 'nx.png', ... и т.д.

export function facesToArray(faces) {
  return [
    faces.right,
    faces.left,
    faces.top,
    faces.bottom,
    faces.front,
    faces.back,
  ];
}