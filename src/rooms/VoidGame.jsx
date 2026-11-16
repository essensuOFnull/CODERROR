import React, { useEffect, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import Slider from '@mui/material/Slider';
import brokenSlotTextureUrl from '../assets/broken-inventory-slot.svg';
import { useEngine } from '../context/EngineContext.jsx';
import { RoomRuntime } from './RoomRuntime.js';
import { VOID_ZONE_MUSIC } from '../music/VoidZones.js';
import voidRoom, {
  difficultyAt,
  fallRecoveryAt,
  isSafeSurfaceAt,
  surfaceAt,
  VOID_SHIELD_LAYOUT,
} from './void/index.js';

const PLAYER_HALF_WIDTH = 0.36;
const PLAYER_HALF_HEIGHT = 0.42;
const PLAYER_GLYPHS = ['目', '口', '日', '人'];
const VOID_PARTICLE_COLORS = [0x888888, 0x9b9b9b, 0xaaaaaa];
const MOVE_SPEED = 5.2;
const JUMP_SPEED = 14;
const JUMP_HOLD_GRAVITY = 14;
const JUMP_HOLD_DURATION = 0.52;
const MAX_JUMP_HEIGHT = 6;
const GRAVITY = 26;
const HORIZONTAL_ACCELERATION = 30;
const AIR_ACCELERATION = 12;
const INVENTORY_CAPACITY = 50;
const HOTBAR_SIZE = 10;
const THROWN_ITEM_SPEED = 7;
const THROWN_ITEM_GRAVITY = 18;
const worldVolumeTasks = new WeakMap();
const worldScanTasks = new WeakMap();

function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} ГиБ`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} МиБ`;
  return `${(bytes / 1024).toFixed(0)} КиБ`;
}

function mediaRandom(seed, sector, salt) {
  let value = (
    seed
    ^ Math.imul(sector | 0, 0x9e3779b1)
    ^ Math.imul(salt, 0x85ebca77)
  ) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
}

function createImageCycle(images, seed) {
  const cycle = [...images];
  for (let index = cycle.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(mediaRandom(seed, index, 11) * (index + 1));
    [cycle[index], cycle[swapIndex]] = [cycle[swapIndex], cycle[index]];
  }
  return cycle;
}

function cycleImageIndex(sector, length) {
  const sectorIndex = ((sector % length) + length) % length;
  return sectorIndex;
}

function InventoryItemVisual({ item, depth = 0 }) {
  if (!item) return null;
  const isSlot = item.type === 'broken-slot';
  const size = depth === 0 ? '100%' : `calc(100% - ${depth * 4}px)`;
  const offset = `${depth * 2}px`;

  return (
    <>
      <img
        className={`void-game__item-visual${depth > 0 ? ' is-nested' : ''}`}
        src={brokenSlotTextureUrl}
        alt=""
        data-slot-content={depth > 0 ? 'true' : undefined}
        style={{
          width: size,
          height: size,
          left: offset,
          top: offset,
        }}
        draggable="false"
      />
      {isSlot && item.content && (
        <InventoryItemVisual item={item.content} depth={depth + 1} />
      )}
    </>
  );
}

function createGroundInventorySlots(seed) {
  const items = [];
  const worldExtent = VOID_SHIELD_LAYOUT.worldRadius * 0.9;

  for (let index = 0; index < INVENTORY_CAPACITY; index++) {
    let placed = false;
    for (let attempt = 0; attempt < 4096; attempt++) {
      const random = (salt) => mediaRandom(seed, index * 4096 + attempt, salt);
      const nearPlayerOffset = 5 + random(2) * 16;
      const candidateX = index === 0
        ? 0.5 + (random(3) < 0.5 ? -1 : 1) * nearPlayerOffset
        : (random(1) * 2 - 1) * worldExtent;
      const tileX = Math.floor(candidateX);
      const x = tileX + 0.5;
      if (!isSafeSurfaceAt(tileX, seed)
        || items.some((item) => Math.abs(item.x - x) < 2.5)) continue;

      const itemId = `broken-slot-${index}`;
      items.push({
        id: `ground:${itemId}`,
        item: { id: itemId, type: 'broken-slot', content: null },
        x,
        groundY: surfaceAt(tileX, seed),
        phase: random(4) * Math.PI * 2,
      });
      placed = true;
      break;
    }

    if (!placed) {
      throw new Error(`Could not find a safe surface for inventory slot ${index + 1}`);
    }
  }
  return items;
}

function getWorldVolume(world) {
  let task = worldVolumeTasks.get(world);
  if (!task) {
    task = invoke('get_install_ntfs_volume').catch((error) => {
      if (worldVolumeTasks.get(world) === task) worldVolumeTasks.delete(world);
      throw error;
    });
    worldVolumeTasks.set(world, task);
  }
  return task;
}

function scanWorld(world, volumeId, seed, selection) {
  let task = worldScanTasks.get(world);
  if (!task) {
    task = invoke('scan_ntfs_free_space', {
      volumeId,
      worldName: world.name,
      seed,
      scanId: selection.scanId,
      startBasisPoints: selection.startBasisPoints,
      endBasisPoints: selection.endBasisPoints,
    }).catch((error) => {
      if (worldScanTasks.get(world) === task) worldScanTasks.delete(world);
      throw error;
    });
    worldScanTasks.set(world, task);
  }
  return task;
}

async function createMediaAsset(media, index) {
  const binary = atob(media.dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: media.mimeType }));

  try {
    if (media.mimeType.startsWith('image/')) {
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
      await image.decode();
      return {
        id: `recovered-media:${index}`,
        element: image,
        url,
        width: image.naturalWidth,
        height: image.naturalHeight,
        mimeType: media.mimeType,
        offset: media.offset,
      };
    }

    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;
    await new Promise((resolve, reject) => {
      video.addEventListener('loadedmetadata', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error('Фрагмент не удалось декодировать как видео.')), {
        once: true,
      });
      video.load();
    });
    await video.play();
    return {
      id: `recovered-media:${index}`,
      element: video,
      url,
      width: video.videoWidth,
      height: video.videoHeight,
      mimeType: media.mimeType,
      offset: media.offset,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export default function VoidGame({ cellWidth, cellHeight, world, onExit }) {
  const engine = useEngine();
  const [notice, setNotice] = useState('');
  const [inventory, setInventory] = useState(() => ({
    slots: Array(INVENTORY_CAPACITY).fill(null),
    cursorItem: null,
  }));
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [selectedHotbarIndex, setSelectedHotbarIndex] = useState(0);
  const [showActTitle, setShowActTitle] = useState(false);
  const [scanPhase, setScanPhase] = useState('checking');
  const [scanStatus, setScanStatus] = useState('');
  const [scanProgress, setScanProgress] = useState(null);
  const [scanVolume, setScanVolume] = useState(null);
  const [scanStartBasisPoints, setScanStartBasisPoints] = useState(0);
  const [scanEndBasisPoints, setScanEndBasisPoints] = useState(10_000);
  const [scanSelection, setScanSelection] = useState(null);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const roomRef = useRef(null);
  const terrainDirtyRef = useRef(false);
  const scanReadyRef = useRef(false);
  const mediaAssetsRef = useRef([]);
  const imageAssetsRef = useRef([]);
  const imageCycleRef = useRef([]);
  const videoAssetsRef = useRef([]);
  const brokenSlotImageRef = useRef(null);
  const keys = useRef(new Set());
  const jumpRequested = useRef(false);
  const noticeTimer = useRef(null);
  const activeScanIdRef = useRef(null);
  const onExitRef = useRef(onExit);
  const inventoryRef = useRef(inventory);
  const inventoryOpenRef = useRef(false);
  const playerRef = useRef(null);
  const cameraPositionRef = useRef({ x: 0, y: 0 });
  const dropCursorItemRef = useRef(null);
  const gameSeedRef = useRef(null);
  const groundItemsRef = useRef({ seed: null, items: [] });
  const droppedItemSequenceRef = useRef(0);
  const pointerPositionRef = useRef({ x: 0, y: 0 });
  onExitRef.current = onExit;

  const publishInventory = () => {
    const current = inventoryRef.current;
    setInventory({ slots: [...current.slots], cursorItem: current.cursorItem });
  };

  const interactWithInventorySlot = (index, targetIsContents = false) => {
    const current = inventoryRef.current;
    const slotItem = current.slots[index];
    if (!slotItem) {
      if (!current.cursorItem) return;
      current.slots[index] = current.cursorItem;
      current.cursorItem = null;
      inventoryRef.current = current;
      publishInventory();
      return;
    }

    const contents = slotItem.type === 'broken-slot' ? slotItem.content : null;
    if (targetIsContents && contents) {
      slotItem.content = current.cursorItem;
      current.cursorItem = contents;
      inventoryRef.current = current;
      publishInventory();
      return;
    }

    if (current.cursorItem) {
      if (slotItem.type === 'broken-slot') {
        slotItem.content = current.cursorItem;
      } else {
        current.slots[index] = current.cursorItem;
      }
      current.cursorItem = contents;
    } else {
      current.slots[index] = null;
      current.cursorItem = slotItem;
    }
    inventoryRef.current = current;
    publishInventory();
  };

  const dropCursorItem = (event) => {
    const current = inventoryRef.current;
    if (!current.cursorItem || !playerRef.current || gameSeedRef.current === null) return;
    const item = current.cursorItem;
    const player = playerRef.current;
    const canvas = engine.pixiGrid?.canvas;
    const canvasBounds = canvas?.getBoundingClientRect();
    const pointerWorldX = event && canvasBounds
      ? cameraPositionRef.current.x + (event.clientX - canvasBounds.left) / cellWidth
      : player.x + 1;
    const pointerWorldY = event && canvasBounds
      ? cameraPositionRef.current.y + (event.clientY - canvasBounds.top) / cellHeight
      : player.y;
    let directionX = pointerWorldX - player.x;
    let directionY = pointerWorldY - player.y;
    const directionLength = Math.hypot(directionX, directionY);
    if (directionLength < 0.001) {
      directionX = 1;
      directionY = 0;
    } else {
      directionX /= directionLength;
      directionY /= directionLength;
    }
    const x = player.x + directionX * 0.65;
    const y = player.y + directionY * 0.65;
    groundItemsRef.current.items.push({
      id: `dropped-slot-${droppedItemSequenceRef.current++}-${item.id}`,
      item,
      x,
      y,
      groundY: surfaceAt(Math.floor(x), gameSeedRef.current),
      vx: directionX * THROWN_ITEM_SPEED,
      vy: directionY * THROWN_ITEM_SPEED,
      airborne: true,
      pickupDelay: 1,
      phase: Math.random() * Math.PI * 2,
    });
    current.cursorItem = null;
    inventoryRef.current = current;
    publishInventory();
  };
  dropCursorItemRef.current = dropCursorItem;

  const setInventoryVisibility = (open) => {
    inventoryOpenRef.current = open;
    setInventoryOpen(open);
    if (open) keys.current.clear();
  };

  const beginScan = () => {
    setScanSelection({
      scanId: crypto.randomUUID(),
      startBasisPoints: scanStartBasisPoints,
      endBasisPoints: scanEndBasisPoints,
    });
  };

  const stopScan = async () => {
    const scanId = activeScanIdRef.current;
    if (!scanId || cancelRequested) return;
    setCancelRequested(true);
    setScanStatus('Останавливаем сканирование и сохраняем уже найденное…');
    try {
      await invoke('cancel_disk_scan', { scanId });
    } catch (error) {
      setCancelRequested(false);
      setScanStatus(`Не удалось остановить сканирование: ${String(error)}`);
    }
  };

  useEffect(() => () => {
    for (const asset of mediaAssetsRef.current) {
      if (asset.element instanceof HTMLVideoElement) {
        asset.element.pause();
        asset.element.removeAttribute('src');
        asset.element.load();
      }
      URL.revokeObjectURL(asset.url);
    }
    mediaAssetsRef.current = [];
    imageAssetsRef.current = [];
    imageCycleRef.current = [];
    videoAssetsRef.current = [];
  }, []);

  useEffect(() => {
    const trackPointer = (event) => {
      pointerPositionRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener('pointermove', trackPointer);
    return () => window.removeEventListener('pointermove', trackPointer);
  }, []);

  useEffect(() => {
    if (!inventory.cursorItem) return undefined;
    const trackHeldItem = (event) => {
      setCursorPosition({ x: event.clientX, y: event.clientY });
    };
    setCursorPosition(pointerPositionRef.current);
    window.addEventListener('pointermove', trackHeldItem);
    return () => window.removeEventListener('pointermove', trackHeldItem);
  }, [inventory.cursorItem]);

  useEffect(() => {
    if (scanPhase !== 'ready') return undefined;
    setShowActTitle(true);
    const timer = setTimeout(() => setShowActTitle(false), 5000);
    return () => clearTimeout(timer);
  }, [scanPhase]);

  useEffect(() => {
    const seed = world?.seed
      ?? gameSeedRef.current
      ?? Math.floor(Math.random() * 0x100000000);
    const worldKey = `${world?.name ?? 'world'}:${seed}`;
    gameSeedRef.current = seed;
    if (groundItemsRef.current.worldKey !== worldKey) {
      groundItemsRef.current = { seed, worldKey, items: createGroundInventorySlots(seed) };
      const nextInventory = {
        slots: Array(INVENTORY_CAPACITY).fill(null),
        cursorItem: null,
      };
      inventoryRef.current = nextInventory;
      setInventory(nextInventory);
      setInventoryVisibility(false);
      setSelectedHotbarIndex(0);
    }
    if (!brokenSlotImageRef.current) {
      const image = new Image();
      image.onload = () => {
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = image.naturalWidth;
        textureCanvas.height = image.naturalHeight;
        const context = textureCanvas.getContext('2d');
        if (!context) {
          console.error('[VoidGame] Could not create a canvas for the broken slot texture.');
          return;
        }
        context.drawImage(image, 0, 0);
        brokenSlotImageRef.current = textureCanvas;
        terrainDirtyRef.current = true;
      };
      image.onerror = () => {
        console.error('[VoidGame] Failed to load broken inventory slot texture.');
      };
      image.src = brokenSlotTextureUrl;
    }
    const glyphs = Array.from(engine.pixiGrid?.textures?.keys() ?? [])
      .filter((char) => Array.from(char).length === 1 && !/[\p{C}\p{M}\p{Z}]/u.test(char));
    const playerGlyphs = PLAYER_GLYPHS.filter((char) => engine.pixiGrid?.textures?.has(char));
    if (playerGlyphs.length !== PLAYER_GLYPHS.length) {
      throw new Error('The font atlas is missing square CJK glyphs for the player');
    }
    const room = new RoomRuntime(voidRoom, seed, glyphs, {
      recoveredFragments: [],
      scanCompleted: false,
    });
    roomRef.current = room;
    const player = {
      x: 0.5,
      y: surfaceAt(0, seed) - PLAYER_HALF_HEIGHT - 0.001,
      vx: 0,
      vy: 0,
      grounded: false,
      jumpHoldTime: 0,
      jumpHoldActive: false,
      jumpStartY: 0,
    };
    playerRef.current = player;
    const emit = (event) => {
      if (event.type !== 'notice') return;
      setNotice(event.text);
      clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(''), 3500);
    };

    const isSolidAt = (x, y) => room.isSolid(Math.floor(x), Math.floor(y));
    const overlapsSolid = (x, y) => (
      isSolidAt(x - PLAYER_HALF_WIDTH, y - PLAYER_HALF_HEIGHT)
      || isSolidAt(x + PLAYER_HALF_WIDTH, y - PLAYER_HALF_HEIGHT)
      || isSolidAt(x - PLAYER_HALF_WIDTH, y + PLAYER_HALF_HEIGHT - 0.001)
      || isSolidAt(x + PLAYER_HALF_WIDTH, y + PLAYER_HALF_HEIGHT - 0.001)
    );
    const moveAxis = (amount, axis) => {
      const steps = Math.max(1, Math.ceil(Math.abs(amount) / 0.12));
      const step = amount / steps;
      for (let i = 0; i < steps; i++) {
        const next = player[axis] + step;
        const hit = axis === 'x'
          ? overlapsSolid(next, player.y)
          : isSolidAt(player.x - PLAYER_HALF_WIDTH, next + (step > 0 ? PLAYER_HALF_HEIGHT : -PLAYER_HALF_HEIGHT))
            || isSolidAt(player.x + PLAYER_HALF_WIDTH, next + (step > 0 ? PLAYER_HALF_HEIGHT : -PLAYER_HALF_HEIGHT));

        if (hit) {
          if (axis === 'y') {
            if (step > 0) player.grounded = true;
            player.vy = 0;
          } else {
            player.vx = 0;
          }
          return;
        }
        player[axis] = next;
        if (axis === 'y') player.grounded = false;
      }
    };

    let visibleCols = Math.max(1, engine.width - 2);
    let visibleRows = Math.max(1, engine.height - 2);
    const unsubscribeResize = engine.on('resize', ({ width, height }) => {
      visibleCols = Math.max(1, width - 2);
      visibleRows = Math.max(1, height - 2);
      terrainDirtyRef.current = true;
    });
    let cameraX = Math.floor(player.x - visibleCols / 2);
    let cameraY = Math.floor(player.y - visibleRows / 2);
    let lastCameraX = Number.NaN;
    let lastCameraY = Number.NaN;
    let activePlayerOverlays = new Set();
    let activeMediaOverlays = new Set();
    let activeGroundSlotOverlays = new Set();
    let activeVoidParticleOverlays = new Set();
    let activeDifficulty = difficultyAt(player.x, player.y);
    let dead = false;
    const voidParticles = [];
    let voidParticleSequence = 0;
    const isParticleInAir = (x, y, size) => {
      const halfSize = size / 2;
      const left = Math.floor(x - halfSize);
      const right = Math.floor(x + halfSize - 0.001);
      const top = Math.floor(y - halfSize);
      const bottom = Math.floor(y + halfSize - 0.001);
      for (let tileY = top; tileY <= bottom; tileY++) {
        for (let tileX = left; tileX <= right; tileX++) {
          if (room.isSolid(tileX, tileY)) return false;
        }
      }
      return true;
    };
    engine.pixiGrid?.setVoidEffects(voidRoom.effects?.ground === 'corruption');
    engine.music.transitionTo(VOID_ZONE_MUSIC[activeDifficulty]).catch((error) => {
      console.error('[VoidGame] Failed to transition zone music:', error);
    });
    const drawTerrain = (cameraX, cameraY) => {
      engine.batch(() => {
        for (let screenY = 0; screenY < engine.height; screenY++) {
          for (let screenX = 0; screenX < engine.width; screenX++) {
            const tile = room.getCell(cameraX + screenX, cameraY + screenY);
            engine.setCell(screenX, screenY, {
              char: tile.char ?? ' ',
              fg: tile.fg ?? 0xc3d0d5,
              alpha: 1,
              bg: tile.bg ?? voidRoom.backgroundColor,
              bgAlpha: tile.bgAlpha ?? 1,
            });
          }
        }
      });
      lastCameraX = cameraX;
      lastCameraY = cameraY;
    };

    const unsubscribeTick = engine.onTick((deltaMs) => {
      if (!scanReadyRef.current || dead || inventoryOpenRef.current) return;
      const dt = Math.min(deltaMs / 1000, 0.04);

      const left = keys.current.has('ArrowLeft') || keys.current.has('KeyA');
      const right = keys.current.has('ArrowRight') || keys.current.has('KeyD');
      const direction = Number(right) - Number(left);
      const acceleration = player.grounded ? HORIZONTAL_ACCELERATION : AIR_ACCELERATION;
      const targetVelocity = direction * MOVE_SPEED;
      player.vx += (targetVelocity - player.vx) * Math.min(1, acceleration * dt);

      if (jumpRequested.current && player.grounded) {
        player.vy = -JUMP_SPEED;
        player.grounded = false;
        player.jumpHoldTime = 0;
        player.jumpHoldActive = true;
        player.jumpStartY = player.y;
      }
      jumpRequested.current = false;

      const jumpHeld = keys.current.has('Space')
        || keys.current.has('ArrowUp')
        || keys.current.has('KeyW');
      const jumpBoosting = player.jumpHoldActive
        && jumpHeld
        && player.vy < 0
        && player.jumpHoldTime < JUMP_HOLD_DURATION;
      if (jumpBoosting) {
        player.jumpHoldTime = Math.min(JUMP_HOLD_DURATION, player.jumpHoldTime + dt);
      } else if (!jumpHeld || player.vy >= 0 || player.jumpHoldTime >= JUMP_HOLD_DURATION) {
        player.jumpHoldActive = false;
      }
      player.vy = Math.min(
        player.vy + (jumpBoosting ? JUMP_HOLD_GRAVITY : GRAVITY) * dt,
        18,
      );

      moveAxis(player.vx * dt, 'x');
      moveAxis(player.vy * dt, 'y');
      if (player.vy < 0 && player.jumpStartY - player.y >= MAX_JUMP_HEIGHT) {
        player.y = player.jumpStartY - MAX_JUMP_HEIGHT;
        player.vy = 0;
        player.jumpHoldActive = false;
      }

      const difficulty = difficultyAt(player.x, player.y);
      if (difficulty !== activeDifficulty) {
        activeDifficulty = difficulty;
        engine.music.transitionTo(VOID_ZONE_MUSIC[difficulty]).catch((error) => {
          console.error('[VoidGame] Failed to transition zone music:', error);
        });
      }

      const footCell = room.getCell(
        Math.floor(player.x),
        Math.floor(player.y + PLAYER_HALF_HEIGHT + 0.01),
      );
      if (footCell.hazard === 'spike' && !dead) {
        dead = true;
        onExitRef.current();
        return;
      }

      const recovery = fallRecoveryAt(player.x, player.y, seed);
      if (recovery) {
        player.x = recovery.x;
        player.y = recovery.y - PLAYER_HALF_HEIGHT - 0.001;
        player.vx = 0;
        player.vy = 0;
        player.grounded = false;
        emit({ type: 'notice', text: 'Срыв! Участок паркура начинается заново.' });
      }

      const groundItems = groundItemsRef.current.items;
      const inventoryState = inventoryRef.current;
      const hasPlacedSlots = inventoryState.slots.some(Boolean);
      const emptyContainerIndex = inventoryState.slots.findIndex(
        (slot) => slot?.type === 'broken-slot' && !slot.content,
      );
      const emptySlotIndex = inventoryState.slots.findIndex((slot) => !slot);
      const playerFootY = player.y + PLAYER_HALF_HEIGHT;
      const thrownItemHalfHeight = Math.min(cellWidth, cellHeight) * 1.15
        / (2 * cellHeight);
      for (const groundItem of groundItems) {
        if (groundItem.pickupDelay > 0) {
          groundItem.pickupDelay = Math.max(0, groundItem.pickupDelay - dt);
        }
        if (!groundItem.airborne) continue;

        groundItem.vy += THROWN_ITEM_GRAVITY * dt;
        groundItem.x += groundItem.vx * dt;
        groundItem.y += groundItem.vy * dt;
        const worldEdge = VOID_SHIELD_LAYOUT.worldRadius - 1;
        if (Math.abs(groundItem.x) > worldEdge) {
          groundItem.x = Math.sign(groundItem.x) * worldEdge;
          groundItem.vx = 0;
        }
        groundItem.groundY = surfaceAt(Math.floor(groundItem.x), seed);
        if (groundItem.y >= groundItem.groundY - thrownItemHalfHeight - 0.02) {
          groundItem.airborne = false;
          groundItem.y = undefined;
          groundItem.vx = 0;
          groundItem.vy = 0;
        }
      }

      for (let index = 0; index < groundItems.length; index++) {
        const groundItem = groundItems[index];
        if (groundItem.pickupDelay > 0) continue;
        const itemCenterY = groundItem.airborne
          ? groundItem.y
          : groundItem.groundY - thrownItemHalfHeight - 0.02;
        if (Math.hypot(
          player.x - groundItem.x,
          playerFootY - itemCenterY,
        ) > 1.15) continue;

        if (!hasPlacedSlots && !inventoryState.cursorItem) {
          inventoryState.cursorItem = groundItem.item;
        } else if (emptyContainerIndex >= 0) {
          inventoryState.slots[emptyContainerIndex].content = groundItem.item;
        } else if (hasPlacedSlots && emptySlotIndex >= 0) {
          inventoryState.slots[emptySlotIndex] = groundItem.item;
        } else if (emptySlotIndex >= 0) {
          inventoryState.slots[emptySlotIndex] = groundItem.item;
        } else if (!inventoryState.cursorItem) {
          inventoryState.cursorItem = groundItem.item;
        } else {
          continue;
        }

        groundItems.splice(index, 1);
        inventoryRef.current = inventoryState;
        publishInventory();
        break;
      }

      room.update({ player, delta: dt, emit });
    });

    const unsubscribeRender = engine.onRender((deltaMs, grid) => {
      const renderedX = Math.round(player.x * 2) / 2;
      const renderedY = Math.round(player.y * 2) / 2;
      const cameraFloatX = renderedX - visibleCols / 2;
      const cameraFloatY = renderedY - visibleRows / 2;
      cameraX = Math.floor(cameraFloatX);
      cameraY = Math.floor(cameraFloatY);
      cameraPositionRef.current = { x: cameraX, y: cameraY };
      const fractionX = cameraFloatX - cameraX;
      const fractionY = cameraFloatY - cameraY;

      grid.setCameraOffset(-fractionX * cellWidth, -fractionY * cellHeight);
      grid.setVoidShieldView({
        ...VOID_SHIELD_LAYOUT,
        cameraX,
        cameraY,
        centerY: 0,
      });
      if (terrainDirtyRef.current || cameraX !== lastCameraX || cameraY !== lastCameraY) {
        drawTerrain(cameraX, cameraY);
        terrainDirtyRef.current = false;
      }

      const nextVoidParticleOverlays = new Set();
      if (scanReadyRef.current) {
        const particleDelta = Math.min(Math.max(deltaMs, 0) / 1000, 0.1);
        const particleTarget = Math.min(
          64,
          Math.max(28, Math.floor(engine.width * engine.height / 320)),
        );
        let spawnAttempts = 0;
        while (voidParticles.length < particleTarget && spawnAttempts < particleTarget * 24) {
          const index = voidParticleSequence++;
          const random = (salt) => mediaRandom(seed, index, salt);
          const size = 0.28 + random(7) * 0.16;
          const x = cameraX + 0.5 + random(1) * Math.max(0, visibleCols - 1);
          const y = cameraY + 0.5 + random(2) * Math.max(0, visibleRows - 1);
          spawnAttempts++;
          if (!isParticleInAir(x, y, size)) continue;
          const angle = random(3) * Math.PI * 2;
          const speed = 0.12 + random(4) * 0.28;
          voidParticles.push({
            id: `void-particle:${index}`,
            sequence: index,
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            age: 0,
            lifetime: 7 + random(5) * 10,
            turnIn: 0.4 + random(6) * 1.6,
            turnCount: 0,
            phase: random(8) * Math.PI * 2,
            size,
            color: VOID_PARTICLE_COLORS[
              Math.floor(random(9) * VOID_PARTICLE_COLORS.length)
            ],
          });
        }

        for (let index = voidParticles.length - 1; index >= 0; index--) {
          const particle = voidParticles[index];
          particle.age += particleDelta;
          particle.turnIn -= particleDelta;
          if (particle.turnIn <= 0) {
            const random = (salt) => mediaRandom(
              seed,
              particle.sequence,
              100 + particle.turnCount * 8 + salt,
            );
            const angle = random(0) * Math.PI * 2;
            const speed = 0.12 + random(1) * 0.28;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.turnIn = 0.4 + random(2) * 1.6;
            particle.turnCount++;
          }
          const nextX = particle.x + particle.vx * particleDelta;
          const nextY = particle.y + particle.vy * particleDelta;
          if (isParticleInAir(nextX, nextY, particle.size)) {
            particle.x = nextX;
            particle.y = nextY;
          } else {
            particle.turnIn = 0;
          }
          if (particle.age >= particle.lifetime
            || particle.x < cameraX - 3
            || particle.x > cameraX + visibleCols + 3
            || particle.y < cameraY - 3
            || particle.y > cameraY + visibleRows + 3) {
            grid.removeOverlay(particle.id);
            voidParticles.splice(index, 1);
            continue;
          }

          const fade = Math.min(1, particle.age / 0.8, (particle.lifetime - particle.age) / 1.5);
          const shimmer = 0.65 + 0.35 * (
            0.5 + 0.5 * Math.sin(particle.age * 2.4 + particle.phase)
          );
          grid.setRectOverlay(particle.id, {
            x: (particle.x - particle.size / 2 - cameraX) * cellWidth,
            y: (particle.y - particle.size / 2 - cameraY) * cellHeight,
            width: cellWidth * particle.size,
            height: cellHeight * particle.size,
            color: particle.color,
            alpha: Math.max(0, fade * shimmer * 0.9),
          });
          nextVoidParticleOverlays.add(particle.id);
        }
      }
      for (const id of activeVoidParticleOverlays) {
        if (!nextVoidParticleOverlays.has(id)) grid.removeOverlay(id);
      }
      activeVoidParticleOverlays = nextVoidParticleOverlays;

      const nextGroundSlotOverlays = new Set();
      const brokenSlotImage = brokenSlotImageRef.current;
      if (scanReadyRef.current && brokenSlotImage) {
        const animationTime = performance.now() / 1000;
        for (const groundItem of groundItemsRef.current.items) {
          const bob = groundItem.airborne
            ? 0
            : Math.sin(animationTime * 1.8 + groundItem.phase) * 0.14;
          const pulse = 0.94 + Math.sin(animationTime * 1.2 + groundItem.phase) * 0.06;
          const width = Math.min(cellWidth, cellHeight) * 1.15 * pulse;
          const height = width;
          const centerY = groundItem.airborne
            ? groundItem.y
            : groundItem.groundY - height / (2 * cellHeight) - 0.02;
          grid.setMediaOverlay(groundItem.id, {
            source: brokenSlotImage,
            x: (groundItem.x - cameraX) * cellWidth - width / 2,
            y: (centerY + bob - cameraY) * cellHeight - height / 2,
            width,
            height,
            alpha: 0.96,
          });
          nextGroundSlotOverlays.add(groundItem.id);
        }
      }
      for (const id of activeGroundSlotOverlays) {
        if (!nextGroundSlotOverlays.has(id)) grid.removeOverlay(id);
      }
      activeGroundSlotOverlays = nextGroundSlotOverlays;

      const left = renderedX - PLAYER_HALF_WIDTH;
      const right = renderedX + PLAYER_HALF_WIDTH;
      const top = renderedY - PLAYER_HALF_HEIGHT;
      const bottom = renderedY + PLAYER_HALF_HEIGHT;
      const cells = [];

      for (let worldY = Math.floor(top * 2); worldY < Math.ceil(bottom * 2); worldY++) {
        for (let worldX = Math.floor(left * 2); worldX < Math.ceil(right * 2); worldX++) {
          const subLeft = worldX / 2;
          const subTop = worldY / 2;
          if (left >= subLeft + 0.5 || right <= subLeft || top >= subTop + 0.5 || bottom <= subTop) continue;

          const id = `player:${worldX}:${worldY}`;
          cells.push(id);
          grid.setOverlay(id, {
            char: playerGlyphs[((worldY & 1) * 2 + (worldX & 1))],
            x: (subLeft - cameraX) * cellWidth,
            y: (subTop - cameraY) * cellHeight,
            width: cellWidth / 2,
            height: cellHeight / 2,
            fg: 0xffd36a,
          });
        }
      }

      const nextPlayerOverlays = new Set(cells);
      for (const id of activePlayerOverlays) {
        if (!nextPlayerOverlays.has(id)) grid.removeOverlay(id);
      }
      activePlayerOverlays = nextPlayerOverlays;

      const nextMediaOverlays = new Set();
      const imageCycle = imageCycleRef.current;
      const videoAssets = videoAssetsRef.current;
      const recoveredFragments = room.data.recoveredFragments ?? [];
      const recoveredDataCount = room.data.recoveredDataCount ?? recoveredFragments.length;
      const sectorSize = Math.max(
        14,
        48 - Math.floor(Math.log2(recoveredDataCount + 1) * 6),
      );
      const maxImageWidthCells = imageCycle.reduce(
        (max, image) => Math.max(max, image.width / cellWidth),
        0,
      );
      const firstSector = Math.floor((cameraX - maxImageWidthCells) / sectorSize);
      const lastSector = Math.floor((cameraX + engine.width + 8) / sectorSize);
      for (let sector = firstSector; sector <= lastSector; sector++) {
        if (imageCycle.length > 0) {
          const image = imageCycle[cycleImageIndex(sector, imageCycle.length)];
          const worldX = sector * sectorSize
            + mediaRandom(seed, sector, 6) * sectorSize;
          const maxScale = Math.min(
            1,
            (engine.width * cellWidth) / image.width,
            (engine.height * cellHeight) / image.height,
          );
          const baseScale = maxScale * (0.2 + mediaRandom(seed, sector, 8) * 0.75);
          const pulse = 0.975 + 0.025 * (
            1 + Math.sin(performance.now() / 900 + sector * 1.7)
          ) / 2;
          const scale = Math.min(maxScale, baseScale * pulse);
          const width = image.width * scale;
          const height = image.height * scale;
          const worldY = surfaceAt(worldX, seed) + 1
            + mediaRandom(seed, sector, 7) * 12;
          const x = (worldX - cameraX) * cellWidth - (image.width * (baseScale - scale)) / 2;
          const y = (worldY - cameraY) * cellHeight;
          if (x + width >= 0 && y + height >= 0
            && x <= engine.width * cellWidth && y <= engine.height * cellHeight) {
            const overlayId = `${image.id}:stratum:${sector}`;
            grid.setMediaOverlay(overlayId, {
              source: image.element,
              x,
              y,
              width,
              height,
              alpha: 0.76,
            });
            nextMediaOverlays.add(overlayId);
          }
        }

        if (videoAssets.length === 0) continue;
        const asset = videoAssets[
          Math.floor(mediaRandom(seed, sector, 0) * videoAssets.length)
        ];
        const ratio = asset.width / asset.height;
        const maxWidth = cellWidth * 6;
        const maxHeight = cellHeight * 4;
        let width = maxWidth;
        let height = width / ratio;
        if (height > maxHeight) {
          height = maxHeight;
          width = height * ratio;
        }
        const worldX = sector * sectorSize + 4
          + mediaRandom(seed, sector, 1) * (sectorSize - 14);
        const worldY = surfaceAt(worldX, seed) - height / cellHeight - 1
          - mediaRandom(seed, sector, 2) * 2.5;
        const x = (worldX - cameraX) * cellWidth;
        const y = (worldY - cameraY) * cellHeight;
        if (x + width < 0 || y + height < 0 || x > engine.width * cellWidth || y > engine.height * cellHeight) {
          continue;
        }
        const overlayId = `${asset.id}:sector:${sector}`;
        grid.setMediaOverlay(overlayId, {
          source: asset.element,
          x,
          y,
          width,
          height,
          alpha: 0.88,
        });
        nextMediaOverlays.add(overlayId);
      }
      for (const id of activeMediaOverlays) {
        if (!nextMediaOverlays.has(id)) grid.removeOverlay(id);
      }
      activeMediaOverlays = nextMediaOverlays;
    });

    voidRoom.hooks?.onEnter?.({ room, player, emit, seed });
    drawTerrain(
      Math.floor(player.x - Math.max(1, engine.width - 2) / 2),
      Math.floor(player.y - Math.max(1, engine.height - 2) / 2),
    );

    return () => {
      unsubscribeTick();
      unsubscribeRender();
      unsubscribeResize();
      engine.music.transitionTo(engine.music.code).catch((error) => {
        console.error('[VoidGame] Failed to restore menu music:', error);
      });
      clearTimeout(noticeTimer.current);
      keys.current.clear();
      for (const id of activePlayerOverlays) engine.pixiGrid?.removeOverlay(id);
      for (const id of activeMediaOverlays) engine.pixiGrid?.removeOverlay(id);
      for (const id of activeVoidParticleOverlays) engine.pixiGrid?.removeOverlay(id);
      for (const id of activeGroundSlotOverlays) engine.pixiGrid?.removeOverlay(id);
      engine.pixiGrid?.clearVoidShieldView();
      engine.pixiGrid?.setCameraOffset(0, 0);
      engine.pixiGrid?.setVoidEffects(false);
      room.dispose();
      roomRef.current = null;
      playerRef.current = null;
      engine.batch(() => {
        for (let y = 0; y < engine.height; y++) {
          for (let x = 0; x < engine.width; x++) {
            engine.setCell(x, y, { char: ' ', fg: null, alpha: 1, bg: null, bgAlpha: 0 });
          }
        }
      });
    };
  }, [cellHeight, cellWidth, engine, world?.name, world?.seed]);

  useEffect(() => {
    let cancelled = false;
    let unlisten;

    const initializeWorld = async () => {
      if (!isTauri()) {
        throw new Error('Создание и загрузка миров доступны только в настольном приложении.');
      }

      const room = roomRef.current;
      if (!room) throw new Error('Игровая комната ещё не готова принять данные мира.');

      let report = world?.report;
      if (report) {
        setScanPhase('loading');
        setScanStatus('Загружаем сохранённые данные мира…');
      }
      if (!report) {
        setScanPhase('checking');
        setScanStatus('Определяем диск установки…');
        const volume = await getWorldVolume(world);
        if (cancelled) return;
        setScanVolume(volume);
        if (!scanSelection) {
          setScanPhase('selecting');
          setScanStatus('');
          return;
        }

        setScanPhase('scanning');
        setScanStatus(
          `Проверяем выбранный диапазон диска ${volume.id} `
          + `(${(scanSelection.startBasisPoints / 100).toFixed(2)}–`
          + `${(scanSelection.endBasisPoints / 100).toFixed(2)}%)…`,
        );
        setScanProgress({
          bytesProcessed: 0,
          totalBytes: Math.floor(
            volume.totalBytes
            * (scanSelection.endBasisPoints - scanSelection.startBasisPoints)
            / 10_000,
          ),
          bytesRead: 0,
        });
        const stopListening = await listen('disk-scan-progress', (event) => {
          if (!cancelled) setScanProgress(event.payload);
        });
        if (cancelled) {
          stopListening();
          return;
        }
        unlisten = stopListening;
        activeScanIdRef.current = scanSelection.scanId;
        setCancelRequested(false);
        try {
          report = await scanWorld(world, volume.id, room.seed, scanSelection);
        } finally {
          if (activeScanIdRef.current === scanSelection.scanId) {
            activeScanIdRef.current = null;
          }
          setCancelRequested(false);
        }
        if (cancelled) return;
        setScanPhase('loading');
        setScanStatus(report.scanCompleted === false
          ? 'Сканирование остановлено. Сохраняем найденные данные мира…'
          : 'Сканирование завершено. Подготавливаем данные мира…');
      }

      if (!Array.isArray(report.fragments) || !Array.isArray(report.media)) {
        throw new Error('Файл мира не содержит корректные списки восстановленных данных.');
      }
      const availableGlyphs = new Set(room.glyphs);
      const recoveredFragments = report.fragments.map(({ text, offset }) => ({
        text,
        offset,
        terrainChars: Array.from(text).filter((character) => (
          !/\s/u.test(character) && availableGlyphs.has(character)
        )),
      }));
      const mediaAssets = [];
      let undecodableMedia = 0;
      let undecodableVideo = 0;
      for (const [index, media] of report.media.entries()) {
        try {
          mediaAssets.push(await createMediaAsset(media, index));
        } catch {
          undecodableMedia++;
          if (media.mimeType.startsWith('video/')) undecodableVideo++;
        }
        if (cancelled) {
          for (const asset of mediaAssets) {
            if (asset.element instanceof HTMLVideoElement) asset.element.pause();
            URL.revokeObjectURL(asset.url);
          }
          return;
        }
      }

      mediaAssetsRef.current = mediaAssets;
      imageAssetsRef.current = mediaAssets.filter((asset) => asset.mimeType.startsWith('image/'));
      imageCycleRef.current = createImageCycle(imageAssetsRef.current, room.seed);
      videoAssetsRef.current = mediaAssets.filter((asset) => asset.mimeType.startsWith('video/'));
      if (undecodableMedia > 0) {
        console.warn('[VoidGame] Some recovered media could not be decoded:', {
          total: undecodableMedia,
          videos: undecodableVideo,
        });
      }
      room.setData({
        recoveredFragments,
        recoveredDataCount: recoveredFragments.length + mediaAssets.length,
        scanCompleted: true,
      });
      terrainDirtyRef.current = true;
      scanReadyRef.current = true;
      setScanStatus('');
      setScanPhase('ready');
    };

    initializeWorld().catch((error) => {
      if (cancelled) return;
      setScanStatus(`Не удалось создать или открыть мир: ${String(error)}`);
      setScanPhase('error');
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [retryToken, scanSelection, world]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        if (scanPhase === 'ready') {
          setInventoryVisibility(!inventoryOpenRef.current);
        } else if (scanPhase === 'error') {
          onExit();
        }
        return;
      }
      if (inventoryOpenRef.current) return;
      if (/^Digit[0-9]$/.test(event.code)) {
        const digit = Number(event.code.slice(-1));
        setSelectedHotbarIndex(digit === 0 ? HOTBAR_SIZE - 1 : digit - 1);
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      keys.current.add(event.code);
      if (['Space', 'ArrowUp', 'KeyW'].includes(event.code) && !event.repeat) {
        jumpRequested.current = true;
      }
    };
    const onKeyUp = (event) => keys.current.delete(event.code);
    const clearKeys = () => keys.current.clear();
    const onWheel = (event) => {
      if (scanPhase !== 'ready' || inventoryOpenRef.current) return;
      event.preventDefault();
      if (event.deltaY === 0) return;
      const direction = event.deltaY > 0 ? 1 : -1;
      setSelectedHotbarIndex((current) => (
        (current + direction + HOTBAR_SIZE) % HOTBAR_SIZE
      ));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('blur', clearKeys);
    };
  }, [onExit, scanPhase]);

  useEffect(() => {
    const handleContextMenu = (event) => {
      event.preventDefault();
      const target = event.target;
      const clickedButton = target instanceof Element && target.closest('button');
      if (scanReadyRef.current && !inventoryOpenRef.current
        && inventoryRef.current.cursorItem && !clickedButton) {
        dropCursorItemRef.current(event);
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  return (
    <section
      className="void-game"
      aria-label="Локация Пустота"
      onContextMenu={(event) => {
        if (!inventory.cursorItem || inventoryOpenRef.current
          || event.target.closest('button')) return;
        dropCursorItem(event);
      }}
    >
      {showActTitle && scanPhase === 'ready' && (
        <div className="void-game__act-title" role="status" aria-live="polite">
          <span>АКТ 1:</span>
          <span>ВЫЖИВАНИЕ</span>
        </div>
      )}
      {notice && <div className="void-game__notice" role="status">{notice}</div>}
      {scanPhase === 'ready'
        && (inventory.cursorItem || inventory.slots.some(Boolean))
        && (
          <div className="void-game__hotbar" aria-label="Панель быстрого доступа">
            {inventory.slots.slice(0, HOTBAR_SIZE).map((slotItem, index) => (
              <button
                type="button"
                key={index}
                className={`void-game__inventory-cell${selectedHotbarIndex === index ? ' is-selected' : ''}`}
                aria-label={`Ячейка быстрого доступа ${index + 1}${slotItem ? ', сломанный слот' : ', пусто'}`}
                onClick={(event) => {
                  setSelectedHotbarIndex(index);
                  interactWithInventorySlot(
                    index,
                    Boolean(event.target.closest('[data-slot-content="true"]')),
                  );
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (!slotItem && inventoryRef.current.cursorItem) {
                    dropCursorItem(event);
                  }
                }}
              >
                <InventoryItemVisual item={slotItem} />
                <span>{index === HOTBAR_SIZE - 1 ? '0' : index + 1}</span>
              </button>
            ))}
          </div>
        )}
      {scanPhase === 'ready' && (
        <div className="void-game__controls">
          A / D или ← / → — движение&nbsp; · &nbsp;Space / W / ↑ — прыжок
          <button type="button" onClick={() => setInventoryVisibility(true)}>
            Инвентарь (Esc)
          </button>
        </div>
      )}
      {inventoryOpen && scanPhase === 'ready' && (
        <div
          className="void-game__inventory"
          role="dialog"
          aria-modal="true"
          aria-labelledby="void-inventory-title"
          onContextMenu={(event) => {
            const target = event.target;
            const clickedCell = target.closest('.void-game__inventory-cell');
            const clickedButton = target.closest('button');
            if (!clickedCell && !clickedButton && inventoryRef.current.cursorItem) {
              dropCursorItem(event);
            }
          }}
        >
          <div className="void-game__inventory-panel">
            <div className="void-game__inventory-heading">
              <h2 id="void-inventory-title">ИНВЕНТАРЬ</h2>
              <button type="button" onClick={() => setInventoryVisibility(false)}>
                Закрыть (Esc)
              </button>
            </div>
            <p className="void-game__inventory-help">
              ЛКМ — использовать предмет или переложить его. ПКМ по пустому месту — выбросить предмет.
            </p>
            <div className="void-game__inventory-grid" aria-label="Инвентарь: 50 ячеек">
              {inventory.slots.map((slotItem, index) => (
                <button
                  type="button"
                  key={index}
                  className={`void-game__inventory-cell${index < HOTBAR_SIZE ? ' is-hotbar' : ''}${selectedHotbarIndex === index ? ' is-selected' : ''}`}
                  aria-label={`Ячейка инвентаря ${index + 1}${slotItem ? ', сломанный слот' : ', пусто'}`}
                  onClick={(event) => interactWithInventorySlot(
                    index,
                    Boolean(event.target.closest('[data-slot-content="true"]')),
                  )}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    if (!slotItem && inventoryRef.current.cursorItem) {
                      dropCursorItem(event);
                    }
                  }}
                >
                  <InventoryItemVisual item={slotItem} />
                  {index < HOTBAR_SIZE && (
                    <span>{index === HOTBAR_SIZE - 1 ? '0' : index + 1}</span>
                  )}
                </button>
              ))}
            </div>
            <p className="void-game__inventory-warning">
              Несохраненные данные будут утеряны.
            </p>
            <button
              type="button"
              className="void-game__inventory-exit"
              onClick={() => {
                if (window.confirm('Несохраненные данные будут утеряны. Выйти в меню?')) {
                  onExit();
                }
              }}
            >
              В меню
            </button>
          </div>
        </div>
      )}
      {inventory.cursorItem && (
        <div
          className="void-game__cursor-item"
          aria-hidden="true"
          style={{ left: cursorPosition.x + 12, top: cursorPosition.y + 12 }}
        >
          <InventoryItemVisual item={inventory.cursorItem} />
        </div>
      )}
      {scanPhase !== 'ready' && (
        <div className="void-game__gate" role="dialog" aria-modal="true" aria-labelledby="void-gate-title">
          <div className="void-game__gate-panel">
            <h2 id="void-gate-title">ВХОД В ПУСТОТУ</h2>
            {scanPhase === 'checking' && <p>Определяем диск, на котором установлена игра…</p>}
            {scanPhase === 'loading' && <p>{scanStatus}</p>}
            {scanPhase === 'selecting' && scanVolume && (
              <>
                <p>
                  Выбери границы участка диска {scanVolume.id}, который нужно проверить.
                  По умолчанию выбран весь диск; будет прочитано только свободное пространство.
                </p>
                <div className="void-game__range">
                  <span>
                    Начать с {(scanStartBasisPoints / 100).toFixed(2)}%
                    {' · '}{formatBytes(scanVolume.totalBytes * scanStartBasisPoints / 10_000)}
                  </span>
                  <Slider
                    min={0}
                    max={10_000}
                    step={1}
                    value={[scanStartBasisPoints, scanEndBasisPoints]}
                    onChange={(_, value) => {
                      if (Array.isArray(value)) {
                        setScanStartBasisPoints(value[0]);
                        setScanEndBasisPoints(value[1]);
                      }
                    }}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${(value / 100).toFixed(2)}%`}
                    disableSwap
                    getAriaLabel={(index) => (
                      index === 0 ? 'Начало диапазона сканирования' : 'Конец диапазона сканирования'
                    )}
                    sx={{
                      color: '#72aeb5',
                      padding: '13px 0',
                      '& .MuiSlider-rail': {
                        backgroundColor: '#8195a5',
                        opacity: 0.35,
                      },
                      '& .MuiSlider-track': { border: 0 },
                      '& .MuiSlider-thumb': {
                        width: 16,
                        height: 16,
                        backgroundColor: '#ffd36a',
                        border: '2px solid #080d16',
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: '0 0 0 7px #ffd36a33',
                        },
                      },
                      '& .MuiSlider-valueLabel': {
                        border: '1px solid #8195a5',
                        backgroundColor: '#080d16',
                        color: '#ffdca0',
                      },
                    }}
                  />
                  <span>
                    Закончить на {(scanEndBasisPoints / 100).toFixed(2)}%
                    {' · '}{formatBytes(scanVolume.totalBytes * scanEndBasisPoints / 10_000)}
                  </span>
                </div>
                <div className="void-game__gate-actions">
                  <button type="button" onClick={beginScan}>Начать сканирование</button>
                  <button type="button" onClick={onExit}>В меню</button>
                </div>
              </>
            )}
            {scanPhase === 'scanning' && (
              <>
                <p>
                  Сканируем свободное пространство выбранного диапазона. Данные читаются только
                  для восстановления и сохраняются в файл этого мира.
                </p>
                <p>{scanStatus}</p>
                {scanProgress && (
                  <>
                    <progress
                      className="void-game__progress"
                      max="100"
                      value={scanProgress.totalBytes
                        ? Math.min(100, scanProgress.bytesProcessed / scanProgress.totalBytes * 100)
                        : 100}
                      aria-label="Прогресс сканирования диска"
                    />
                    <p className="void-game__progress-label">
                      Обработано {formatBytes(scanProgress.bytesProcessed)} из {formatBytes(scanProgress.totalBytes)}
                      {' · '}прочитано {formatBytes(scanProgress.bytesRead)} свободных данных
                    </p>
                  </>
                )}
                <div className="void-game__gate-actions">
                  <button type="button" onClick={stopScan} disabled={cancelRequested}>
                    {cancelRequested ? 'Останавливаем…' : 'бля хватит'}
                  </button>
                </div>
              </>
            )}
            {scanPhase === 'error' && (
              <>
                <p>{scanStatus}</p>
                <div className="void-game__gate-actions">
                  <button type="button" onClick={() => {
                    setScanStatus('');
                    setScanPhase('checking');
                    setScanProgress(null);
                    setScanSelection(null);
                    setScanStartBasisPoints(0);
                    setScanEndBasisPoints(10_000);
                    setRetryToken((token) => token + 1);
                  }}>Повторить</button>
                  <button type="button" onClick={onExit}>В меню</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
