import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { NOTE_COLORS } from '@/shared/config/constants';
import { useThemePalette } from '@/shared/lib/theme-colors';

/** The desk, in three dimensions, behind the introduction. */

/** How many cards are in the field. Enough to read as a scatter, few enough to be free. */
const CARD_COUNT = 14;

/** The furthest the whole field leans, in radians. About seven degrees. */
const MAX_LEAN = 0.12;

/** How fast the lean catches up with the pointer. Per second, frame-rate independent. */
const LEAN_EASE = 2.4;

/**
 * The colours the sheets are cut from. The field used to be three tones — the accent, its soft
 * twin, and the page's ink.
 */
const NOTE_TONES = NOTE_COLORS.filter((colour) => colour !== '#e2e8f0');

/** How many tones a card can be cut from: the sheets, plus the skin's accent. */
const TONE_COUNT = NOTE_TONES.length + 1;

/**
 * How present a sheet is, near and far, on each polarity. Depth is carried by nearness rather than
 * by tone.
 */
const TONE_OPACITY = {
  light: { near: 0.32, far: 0.12 },
  dark: { near: 0.42, far: 0.14 },
} as const;

/** One sheet's two presence values, already chosen for the current polarity. */
type Presence = (typeof TONE_OPACITY)[keyof typeof TONE_OPACITY];

/** `#rrggbb` -> `[h, s, l]`, h in 0...360, s and l in 0...1. */
const hexToHsl = (hex: string): [number, number, number] => {
  const value = hex.replace('#', '');
  const channel = (at: number) => parseInt(value.slice(at, at + 2), 16) / 255;
  const [r, g, b] = [channel(0), channel(2), channel(4)];

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return [0, 0, lightness];

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue =
    max === r
      ? 60 * (((g - b) / delta) % 6)
      : max === g
        ? 60 * ((b - r) / delta + 2)
        : 60 * ((r - g) / delta + 4);

  return [(hue + 360) % 360, saturation, lightness];
};

const hslToHex = (h: number, s: number, l: number): string => {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const second = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = l - chroma / 2;

  const sextant = Math.floor(h / 60) % 6;
  const [r, g, b] = (
    [
      [chroma, second, 0],
      [second, chroma, 0],
      [0, chroma, second],
      [0, second, chroma],
      [second, 0, chroma],
      [chroma, 0, second],
    ] as const
  )[sextant];

  return `#${[r, g, b]
    .map((part) =>
      Math.round((part + match) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
};

/** Perceived brightness, 0...1, on the sRGB curve the contrast standard uses. */
const relativeLuminance = (hex: string): number => {
  const value = hex.replace('#', '');
  const channel = (at: number) => {
    const raw = parseInt(value.slice(at, at + 2), 16) / 255;

    return raw <= 0.03928 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
};

/**
 * What a sheet's colour is rebuilt to weigh on a light page. Chosen against the composite rather
 * than in the abstract.
 */
const LIGHT_TONE_LUMINANCE = 0.22;

/**
 * The colour a sheet is actually painted, given the page it is drifting over. `NOTE_COLORS` are
 * sticky-note colours: pale, high-lightness, designed to be *written on* against a white board.
 */
const toneFor = (hex: string, isDark: boolean): string => {
  if (isDark) return hex;

  const [hue, saturation] = hexToHsl(hex);

  // Solve for the lightness that lands this hue on `LIGHT_TONE_LUMINANCE`.
  let low = 0;
  let high = 1;
  let result = hex;

  for (let step = 0; step < 16; step += 1) {
    const mid = (low + high) / 2;
    result = hslToHex(hue, saturation, mid);

    if (relativeLuminance(result) > LIGHT_TONE_LUMINANCE) high = mid;
    else low = mid;
  }

  return result;
};

/**
 * The soft sheet every card is stamped with. Presence and *loudness* are different things, and the
 * field needs the first without the second — there is a headline in front of it.
 */
const createSheetTexture = (): THREE.CanvasTexture => {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');

  if (context) {
    // Corner to corner, so the lit edge lands somewhere different on every card once the scatter
    // has rotated them.
    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.82)');
    gradient.addColorStop(1, 'rgba(255,255,255,0.55)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    // A few pixels of feather on the border. `destination-out` erases rather than paints, so this
    // thins the alpha at the edge without touching the gradient underneath.
    const feather = 6;
    context.globalCompositeOperation = 'destination-out';
    for (let step = 0; step < feather; step += 1) {
      context.strokeStyle = `rgba(0,0,0,${(1 - step / feather) * 0.5})`;
      context.lineWidth = 1;
      context.strokeRect(step + 0.5, step + 0.5, size - step * 2 - 1, size - step * 2 - 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
};

/**
 * Where the field was when it last stopped. Module state, so a remount after the reader scrolled away
 * resumes the drift instead of restarting it, and its first frame matches the still it replaces.
 */
const fieldMemory = { time: 0, lean: { x: 0, y: 0 }, target: { x: 0, y: 0 } };

interface CardSpec {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number];
  /** Which of `TONE_COUNT` colours it is cut from. */
  tone: number;
  /** 0 at the back of the field, 1 at the front. Drives size, drift and presence. */
  nearness: number;
  /** Seconds of offset into the drift, so no two cards move together. */
  phase: number;
  /** How far it drifts. Nearer cards move more, which is what reads as depth. */
  drift: number;
}

/**
 * The scatter, generated once from a fixed seed. Deterministic rather than `Math.random()` for a
 * reason that only shows up later.
 */
const seeded = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

const buildField = (): CardSpec[] => {
  const random = seeded(20260908);

  return Array.from({ length: CARD_COUNT }, (): CardSpec => {
    // Depth first: everything else is derived from it, which is what keeps the
    // near cards big and mobile and the far ones small and still.
    const z = -12 + random() * 11;
    const nearness = (z + 12) / 11;

    return {
      position: [(random() - 0.5) * 22, (random() - 0.5) * 12, z],
      rotation: [
        (random() - 0.5) * 0.5,
        (random() - 0.5) * 0.7,
        // Paper on a desk is never square to the desk.
        (random() - 0.5) * 0.9,
      ],
      scale: [1.1 + nearness * 1.8, 0.85 + nearness * 1.3],
      nearness,
      tone: Math.floor(random() * TONE_COUNT),
      phase: random() * Math.PI * 2,
      drift: 0.12 + nearness * 0.4,
    };
  });
};

const Field = ({
  tones,
  presence,
  onFirstFrame,
}: {
  tones: string[];
  presence: Presence;
  onFirstFrame: () => void;
}) => {
  const group = useRef<THREE.Group>(null);
  const cards = useRef<(THREE.Mesh | null)[]>([]);
  const specs = useMemo(buildField, []);
  const hasDrawn = useRef(false);

  // Where the pointer is, in −1…1, and where the field currently is. Two separate values so the
  // field *chases* rather than snaps. Both live in `fieldMemory`, so they survive a park.
  const target = useRef(fieldMemory.target);
  const current = useRef(fieldMemory.lean);

  const { size } = useThree();

  // One geometry and three materials for fourteen cards. `three` disposes neither automatically,
  // and both are shared by every mesh that uses them.
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  // One sheet texture for the whole field.
  const sheet = useMemo(createSheetTexture, []);

  // One material per *card*, not one per colour. It used to be one per tone, because presence was a
  // property of the tone.
  const materials = useMemo(
    () =>
      specs.map((spec) => {
        const { near, far } = presence;

        return new THREE.MeshBasicMaterial({
          color: new THREE.Color(tones[spec.tone % tones.length]),
          map: sheet,
          transparent: true,
          opacity: far + (near - far) * spec.nearness,
          // Both faces, because the cards tilt past edge-on as the field
          // leans and a single-sided card simply vanishes when it does.
          side: THREE.DoubleSide,
          depthWrite: false,
        });
      }),
    [specs, tones, presence, sheet],
  );

  // `three` frees neither of those on its own. A geometry is a set of GPU buffers and a material is
  // a compiled shader program; dropping the JavaScript reference releases neither.
  useEffect(
    () => () => {
      geometry.dispose();
      sheet.dispose();
      materials.forEach((material) => material.dispose());
    },
    [geometry, materials, sheet],
  );

  // The pointer, read from the window rather than from the canvas. The canvas sits behind the
  // headline, the paragraph and two buttons and takes no pointer events.
  useEffect(() => {
    const move = (event: PointerEvent) => {
      target.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };

    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useFrame((_, delta) => {
    if (!group.current) return;

    // The still underneath is cleared in the same frame this one is drawn, so the swap is invisible.
    if (!hasDrawn.current) {
      hasDrawn.current = true;
      onFirstFrame();
    }

    // Frame-rate independent easing: the same visual speed at 60Hz and 144Hz. `1 - e^(-k·dt)`
    // rather than a fixed lerp factor, which would be twice as fast on a 120Hz display.
    const catchUp = 1 - Math.exp(-LEAN_EASE * delta);
    current.current.x += (target.current.x - current.current.x) * catchUp;
    current.current.y += (target.current.y - current.current.y) * catchUp;

    group.current.rotation.y = current.current.x * MAX_LEAN;
    group.current.rotation.x = -current.current.y * MAX_LEAN;
    // A little translation as well as the rotation. Rotation alone reads as the *page* turning.
    // Adding a fraction of the pointer's travel as a shift is what turns it into parallax.
    group.current.position.x = current.current.x * 0.6;
    group.current.position.y = current.current.y * 0.4;

    // The idle drift, which is what stops the field looking like a still image whenever the pointer
    // is not moving. Accumulated rather than read off the clock, which restarts on every mount.
    fieldMemory.time += Math.min(delta, 0.1);
    const time = fieldMemory.time;

    for (let index = 0; index < specs.length; index += 1) {
      const mesh = cards.current[index];
      if (!mesh) continue;

      const spec = specs[index];
      mesh.position.y = spec.position[1] + Math.sin(time * 0.22 + spec.phase) * spec.drift;
      mesh.rotation.z = spec.rotation[2] + Math.sin(time * 0.16 + spec.phase) * 0.06;
    }
  });

  // The field is scaled by the viewport's aspect. A scatter tuned on a 16:9 desktop is, on a 9:19
  // phone, fourteen cards in a column with nothing at the sides.
  const fit = Math.min(1, Math.max(0.45, size.width / 1280));

  return (
    <group ref={group} scale={fit}>
      {specs.map((spec, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            cards.current[index] = mesh;
          }}
          geometry={geometry}
          material={materials[index]}
          position={spec.position}
          rotation={spec.rotation}
          scale={[spec.scale[0], spec.scale[1], 1]}
        />
      ))}
    </group>
  );
};

/**
 * Parks the field: one last frame, copied into the still canvas while the drawing buffer is still
 * valid, then the caller unmounts the WebGL context. The still costs no frames and no GPU context.
 */
const Parking = ({
  live,
  still,
  onParked,
}: {
  live: boolean;
  still: RefObject<HTMLCanvasElement | null>;
  onParked: () => void;
}) => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (live) return;

    const target = still.current;
    const source = gl.domElement;
    const width = source.clientWidth;
    const height = source.clientHeight;

    if (target && width > 0 && height > 0) {
      gl.render(scene, camera);
      // At 1x: the sheets are soft and translucent, and this is on screen for a moment at most.
      target.width = width;
      target.height = height;
      target.style.width = `${width}px`;
      target.style.height = `${height}px`;
      const context = target.getContext('2d');
      context?.clearRect(0, 0, width, height);
      context?.drawImage(source, 0, 0, width, height);
    }

    onParked();
  }, [camera, gl, live, onParked, scene, still]);

  return null;
};

/** Empties the still, which frees its backing store as well as hiding it. */
const clearHeroStill = (still: HTMLCanvasElement | null) => {
  if (!still || still.width === 0) return;
  still.width = 0;
  still.height = 0;
};

export const HeroField = ({
  pixelRatio,
  live,
  still,
  onParked,
}: {
  pixelRatio: number;
  /** False while the hero is out of view: the field parks into `still` and asks to be unmounted. */
  live: boolean;
  still: RefObject<HTMLCanvasElement | null>;
  onParked: () => void;
}) => {
  const palette = useThemePalette();

  // Whether the page underneath is dark, read off the surface it is painted in. Not from
  // `document.documentElement.classList`, and not from a second hook.
  const isDark = useMemo(() => {
    const hex = palette.surface.replace('#', '');
    const channel = (at: number) => parseInt(hex.slice(at, at + 2), 16) / 255;

    return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4) < 0.4;
  }, [palette]);

  // The six sheets plus the skin's own accent, each resolved for this polarity. The accent goes
  // through `toneFor` as well, and that is deliberate rather than incidental.
  const tones = useMemo(
    () => [...NOTE_TONES, palette.brand].map((tone) => toneFor(tone, isDark)),
    [palette, isDark],
  );

  const presence = isDark ? TONE_OPACITY.dark : TONE_OPACITY.light;

  return (
    <Canvas
      /* `dpr` from the caller rather than r3f's default of the device's own. */
      dpr={pixelRatio}
      camera={{ position: [0, 0, 8], fov: 42 }}
      /* No alpha compositing decisions, no shadow map, no tone mapping. Every material here is
         `MeshBasicMaterial` — unlit, untone-mapped flat colour. */
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      /* `demand` would be wrong here and `always` is what this needs: the field drifts
         continuously, so there is no frame that does not need drawing. */
      frameloop={live ? 'always' : 'never'}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Field tones={tones} presence={presence} onFirstFrame={() => clearHeroStill(still.current)} />
      <Parking live={live} still={still} onParked={onParked} />
    </Canvas>
  );
};

export default HeroField;
