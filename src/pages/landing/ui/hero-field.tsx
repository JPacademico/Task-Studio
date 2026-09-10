import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { NOTE_COLORS } from '@/shared/config/constants';
import { useThemePalette } from '@/shared/lib/theme-colors';

/**
 * The desk, in three dimensions, behind the introduction.
 *
 * ## Why sheets of paper and not a generic blob
 *
 * Because the page is arguing that this product behaves like paper on a desk,
 * and the first thing on it was a soft radial tint in the accent colour — a
 * gradient that could have been behind any product. What is here instead is a
 * slow field of translucent cards drifting at different depths: the same
 * objects the demos below are made of, seen from the side and out of focus.
 * It says what the page says before a word of it has been read.
 *
 * ## Why the cards do not spin
 *
 * They tilt, and only towards the pointer, and only a few degrees. A background
 * that rotates on its own is a background people look at, which is the failure
 * mode of every hero animation ever shipped: the headline is the content and
 * this is the room it is in. The whole field shares one parent that leans about
 * seven degrees at the extremes — enough that moving the mouse obviously does
 * something, far too little to follow.
 *
 * ## Why the pointer is read from the window and not from the canvas
 *
 * The canvas is behind the headline, the paragraph and two buttons, and it takes
 * no pointer events at all — it must not, or the buttons stop being clickable.
 * So it cannot receive `pointermove` itself. One passive listener on the window,
 * normalised against the viewport, is both cheaper than r3f's own raycasting
 * pointer (which this scene has no other use for) and correct while the pointer
 * is over the copy, which is where it spends most of its time.
 *
 * ## Why every value is written straight into a ref
 *
 * There is no React state in the animation at all. The pointer writes to a ref,
 * `useFrame` reads it and eases the group towards it, and nothing above the
 * canvas ever re-renders. A hero that re-rendered a React tree on `pointermove`
 * would be the most expensive idle screen in the application.
 */

/** How many cards are in the field. Enough to read as a scatter, few enough to be free. */
const CARD_COUNT = 14;

/** The furthest the whole field leans, in radians. About seven degrees. */
const MAX_LEAN = 0.12;

/** How fast the lean catches up with the pointer. Per second, frame-rate independent. */
const LEAN_EASE = 2.4;

/**
 * The colours the sheets are cut from.
 *
 * ## Why the app's own Post-it palette rather than the accent
 *
 * The field used to be three tones — the accent, its soft twin, and the page's
 * ink — which made it a monochrome drift in whatever the skin's brand colour
 * happens to be. That is a perfectly reasonable *background*, and it is not the
 * thing the page is arguing: the section underneath is a wall of paper in six
 * colours, and the introduction was showing a wall of paper in one.
 *
 * These are `NOTE_COLORS`, the same seven a note actually gets when somebody
 * sticks one on a board, minus the grey — which is the one that would add a
 * card and no colour. Using the real palette rather than a decorative
 * approximation means the introduction is made of the same material as the
 * product below it, which is the whole argument of the page.
 *
 * ## Why the accent is still in the list
 *
 * Last, and once. Without it the field is identical on all thirteen skins,
 * which would be the only thing on the page that does not answer the theme —
 * and on the skins whose whole identity is a colour (volcano, hazard, terminal)
 * that reads as a stock illustration behind a themed page.
 *
 * ## Why they stay this faint
 *
 * Because there is a headline in front of them. See `TONE_OPACITY`: the whole
 * range sits between six and eighteen percent, which is enough for the eye to
 * read "yellow sheet, blue sheet" and far too little to compete with type. The
 * page also lays a vertical scrim in its own surface colour over the top of
 * this — see `LandingPage` — so the guarantee does not rest on these numbers
 * alone.
 */
const NOTE_TONES = NOTE_COLORS.filter((colour) => colour !== '#e2e8f0');

/** How many tones a card can be cut from: the sheets, plus the skin's accent. */
const TONE_COUNT = NOTE_TONES.length + 1;

/**
 * How present a sheet is, near and far.
 *
 * Depth used to be carried by the *tone* — the first colour at 16%, the second
 * at 12.5%, the third at 9% — which worked with three colours and cannot work
 * with seven: a card's presence would be decided by which colour it happened to
 * be rather than by where it is, so a near yellow sheet and a far yellow sheet
 * would be equally strong and the field would flatten.
 *
 * So presence follows nearness, which is what it was always standing in for,
 * and the colour is free to be any of the seven at any depth.
 */
const TONE_OPACITY = { near: 0.18, far: 0.06 } as const;

/**
 * How much of that survives on a dark page.
 *
 * A pastel is a *light* colour: at 18% over a near-white surface it is a tint,
 * and at 18% over a near-black one it is the brightest thing in the section.
 * The same number is therefore two different amounts of contrast, and the dark
 * palettes are the ones where a background competing with a headline is
 * hardest to notice in review — because the type is bright too.
 */
const DARK_TONE_SCALE = 0.62;

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
 * The scatter, generated once from a fixed seed.
 *
 * Deterministic rather than `Math.random()` for a reason that only shows up
 * later: a layout somebody has looked at and approved should be the same layout
 * on the next load. A random scatter is a scatter nobody can tune, and about one
 * in twenty of them puts three cards in a line through the middle of the
 * headline.
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

const Field = ({ tones, fade }: { tones: string[]; fade: number }) => {
  const group = useRef<THREE.Group>(null);
  const cards = useRef<(THREE.Mesh | null)[]>([]);
  const specs = useMemo(buildField, []);

  /*
   * Where the pointer is, in −1…1, and where the field currently is.
   *
   * Two separate values so the field *chases* rather than snaps: writing the
   * target straight onto the group would make it jitter with every raw pointer
   * sample, and a background that twitches is worse than one that does nothing.
   */
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  const { size } = useThree();

  /*
   * One geometry and three materials for fourteen cards.
   *
   * `three` disposes neither automatically, and both are shared by every mesh
   * that uses them — so building one of each here rather than letting fourteen
   * `<planeGeometry>` elements each allocate their own is fourteen buffers and
   * fourteen shader programs saved. Memoised on the palette, so a theme change
   * rebuilds the materials and nothing else.
   */
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  /*
   * One material per *card*, not one per colour.
   *
   * It used to be one per tone, because presence was a property of the tone.
   * It is a property of depth now — see `TONE_OPACITY` — so two cards in the
   * same yellow at different distances need different `opacity`, and `opacity`
   * lives on the material.
   *
   * Fourteen `MeshBasicMaterial`s rather than seven sounds like the expensive
   * direction and is not: they are all the same *configuration*, so three.js
   * compiles and caches one shader program for the set and the extra cost is
   * fourteen uniform blocks. The geometry — the thing that is actually a
   * buffer on the GPU — is still shared by all of them.
   */
  const materials = useMemo(
    () =>
      specs.map((spec) => {
        const { near, far } = TONE_OPACITY;

        return new THREE.MeshBasicMaterial({
          color: new THREE.Color(tones[spec.tone % tones.length]),
          transparent: true,
          opacity: (far + (near - far) * spec.nearness) * fade,
          // Both faces, because the cards tilt past edge-on as the field
          // leans and a single-sided card simply vanishes when it does.
          side: THREE.DoubleSide,
          depthWrite: false,
        });
      }),
    [specs, tones, fade],
  );

  /*
   * `three` frees neither of those on its own.
   *
   * A geometry is a set of GPU buffers and a material is a compiled shader
   * program; dropping the JavaScript reference releases neither. This canvas
   * unmounts and remounts every time the reader scrolls the introduction out of
   * view and back — see `useCanvasBudget` — so leaking one buffer and three
   * programs per pass is a leak that runs the whole time somebody is reading
   * the page.
   */
  useEffect(
    () => () => {
      geometry.dispose();
      materials.forEach((material) => material.dispose());
    },
    [geometry, materials],
  );

  /*
   * The pointer, read from the window rather than from the canvas.
   *
   * The canvas sits behind the headline, the paragraph and two buttons and takes
   * no pointer events — it must not, or the buttons stop being clickable — so
   * r3f's own `state.pointer` never updates and the field would sit permanently
   * at rest. One passive listener, normalised against the viewport, is both
   * cheaper than the raycasting this scene has no other use for and correct
   * while the cursor is over the copy, which is where it spends most of its
   * time.
   *
   * `passive` matters: a non-passive `pointermove` listener on the window opts
   * the whole document out of the browser's fast scroll path.
   */
  useEffect(() => {
    const move = (event: PointerEvent) => {
      target.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };

    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useFrame((state, delta) => {
    if (!group.current) return;

    // Frame-rate independent easing: the same visual speed at 60Hz and 144Hz.
    // `1 - e^(-k·dt)` rather than a fixed lerp factor, which would be twice as
    // fast on a 120Hz display.
    const catchUp = 1 - Math.exp(-LEAN_EASE * delta);
    current.current.x += (target.current.x - current.current.x) * catchUp;
    current.current.y += (target.current.y - current.current.y) * catchUp;

    group.current.rotation.y = current.current.x * MAX_LEAN;
    group.current.rotation.x = -current.current.y * MAX_LEAN;
    /*
     * A little translation as well as the rotation.
     *
     * Rotation alone reads as the *page* turning. Adding a fraction of the
     * pointer's travel as a shift is what turns it into parallax — the near
     * cards visibly outrun the far ones, which is the only cue in a flat
     * projection that says the field has depth.
     */
    group.current.position.x = current.current.x * 0.6;
    group.current.position.y = current.current.y * 0.4;

    // The idle drift, which is what stops the field looking like a still image
    // whenever the pointer is not moving.
    const time = state.clock.elapsedTime;

    for (let index = 0; index < specs.length; index += 1) {
      const mesh = cards.current[index];
      if (!mesh) continue;

      const spec = specs[index];
      mesh.position.y = spec.position[1] + Math.sin(time * 0.22 + spec.phase) * spec.drift;
      mesh.rotation.z = spec.rotation[2] + Math.sin(time * 0.16 + spec.phase) * 0.06;
    }
  });

  /*
   * The field is scaled by the viewport's aspect.
   *
   * A scatter tuned on a 16:9 desktop is, on a 9:19 phone, fourteen cards in a
   * column with nothing at the sides — the horizontal spread simply falls off
   * both edges. Scaling the whole group down as the canvas narrows keeps the
   * same composition at every width, which is what "dynamic resolution
   * adaptation" means for a scene rather than for a texture.
   */
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

export const HeroField = ({ pixelRatio }: { pixelRatio: number }) => {
  const palette = useThemePalette();

  // The six sheets, plus the skin's own accent. See `NOTE_TONES`.
  const tones = useMemo(() => [...NOTE_TONES, palette.brand], [palette]);

  /*
   * Whether the page underneath is dark, read off the surface it is painted in.
   *
   * Not from `document.documentElement.classList`, and not from a second hook.
   * `useThemePalette` already re-reads on exactly the two attribute changes
   * that can move this, so the answer is in a value this component is holding
   * — and a skin can be dark without carrying the `dark` class (nothing in the
   * palette forbids it), whereas a surface that is nearly black is nearly black
   * on any skin.
   *
   * The green coefficient alone would do; the three-term form is the standard
   * one and costs a multiply.
   */
  const fade = useMemo(() => {
    const hex = palette.surface.replace('#', '');
    const channel = (at: number) => parseInt(hex.slice(at, at + 2), 16) / 255;
    const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);

    return luminance < 0.4 ? DARK_TONE_SCALE : 1;
  }, [palette]);

  return (
    <Canvas
      /*
       * `dpr` from the caller rather than r3f's default of the device's own.
       *
       * See `useCanvasPixelRatio`: a 3× phone would otherwise render nine times
       * the fragments of a 1× screen for a field of translucent rectangles
       * nobody is looking directly at.
       */
      dpr={pixelRatio}
      camera={{ position: [0, 0, 8], fov: 42 }}
      /*
       * No alpha compositing decisions, no shadow map, no tone mapping.
       *
       * Every material here is `MeshBasicMaterial` — unlit, untone-mapped flat
       * colour — so the whole lighting and colour-management pipeline is dead
       * weight. `antialias` stays on because the entire scene is the diagonal
       * edges of rotated rectangles, which is the one case where it is not
       * optional.
       */
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      /*
       * `demand` would be wrong here and `always` is what this needs: the field
       * drifts continuously, so there is no frame that does not need drawing.
       * The saving is made by not mounting the canvas at all when it is off
       * screen — see `useCanvasBudget`.
       */
      frameloop="always"
      style={{ position: 'absolute', inset: 0 }}
    >
      <Field tones={tones} fade={fade} />
    </Canvas>
  );
};

export default HeroField;
