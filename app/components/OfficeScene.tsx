"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import { CanvasTexture, NearestFilter, RepeatWrapping, SRGBColorSpace, Vector3, type Group } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPixelatedPass } from "three/examples/jsm/postprocessing/RenderPixelatedPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SECTIONS, EXPERTS, type Expert, type Section } from "../data/experts";

export type NearTarget =
  | { kind: "expert"; expert: Expert }
  | { kind: "vault" };

/* ================= Layout =================
   Building footprint: x in [-15, 15], z in [-10, 10]. No roof (cutaway view).
   Three rooms along the north side (z in [-10, 2]):
     Coding [-15,-5] · Science [-5,5] · Sport [5,15]
   Lobby strip along the south (z in [2, 10]) with the front door at x=0, z=10. */

const WALL_H = 2.1;
const WALL_T = 0.4;

// h = rendered height (Habbo-style cutaway: camera-facing walls are stubs,
// interior walls are half-height so you can always see inside; collision ignores h)
type WallBox = { x: number; z: number; w: number; d: number; h?: number };

const WALLS: WallBox[] = [
  // outer shell — north & west stay full (back walls), east & south are cutaway stubs
  { x: 0, z: -10, w: 30 + WALL_T, d: WALL_T }, // north
  { x: -15, z: 0, w: WALL_T, d: 20 + WALL_T }, // west
  { x: 15, z: 0, w: WALL_T, d: 20 + WALL_T, h: 0.35 }, // east (cutaway)
  { x: -8.25, z: 10, w: 13.5, d: WALL_T, h: 0.35 }, // south, left of front door (cutaway)
  { x: 8.25, z: 10, w: 13.5, d: WALL_T, h: 0.35 }, // south, right of front door (cutaway)
  // room dividers (half-height so rooms read as a cutaway dollhouse)
  { x: -5, z: -4, w: WALL_T, d: 12, h: 1.05 },
  { x: 5, z: -4, w: WALL_T, d: 12, h: 1.05 },
  // lobby wall (z=2) with a doorway into each room
  { x: -13.25, z: 2, w: 3.5, d: WALL_T, h: 1.05 },
  { x: -5, z: 2, w: 7, d: WALL_T, h: 1.05 },
  { x: 5, z: 2, w: 7, d: WALL_T, h: 1.05 },
  { x: 13.25, z: 2, w: 3.5, d: WALL_T, h: 1.05 },
];

const PLAYER_RADIUS = 0.45;
const PLAYER_SPEED = 5;
const TALK_RADIUS = 2.3;
// stand in front of the reception desk to update your memories
const RECEPTION_POS: [number, number, number] = [-5, 0, 7];
const RECEPTION_SPOT = { x: -5, z: 6 };

// solid furniture the player can't walk through
const FURNITURE_COLLIDERS: WallBox[] = [
  { x: RECEPTION_POS[0], z: RECEPTION_POS[2], w: 2.9, d: 1.1 }, // reception counter
  { x: RECEPTION_POS[0] - 1.5, z: 8.6, w: 1, d: 0.7 }, // filing cabinet
  { x: RECEPTION_POS[0] + 0.9, z: 8.7, w: 1.9, d: 0.6 }, // bookshelf
  { x: 8, z: 6.6, w: 2.6, d: 3.8 }, // lounge cluster
  // per room: desk row along the north wall, sofa on the east side, bed on the west,
  // plus the job-specific corner piece (server rack / lab bench / hoop)
  ...SECTIONS.flatMap((s) => {
    const cx = s.position[0];
    const boxes: WallBox[] = [
      { x: cx, z: -8.5, w: 8, d: 1.2 },
      { x: cx + 4.3, z: -4.5, w: 1.2, d: 2.2 },
      { x: cx - 3.8, z: -2.5, w: 2.4, d: 1.4 },
      { x: cx + 4.2, z: -8.7, w: 1.1, d: 0.9 },
    ];
    if (s.id === "sport") boxes.push({ x: cx - 3.6, z: -6, w: 1.9, d: 0.7 });
    return boxes;
  }),
];

const COLLIDERS = [...WALLS, ...FURNITURE_COLLIDERS];

function blocked(x: number, z: number) {
  return COLLIDERS.some(
    (w) =>
      Math.abs(x - w.x) < w.w / 2 + PLAYER_RADIUS &&
      Math.abs(z - w.z) < w.d / 2 + PLAYER_RADIUS
  );
}

/* ================= Behaviors =================
   Each room mixes activities so it feels alive:
   working = at their desk/computer, talking = chatting in pairs (💬),
   resting = on the sofa (💤), wandering = strolling around the room. */

type Behavior = {
  kind: "working" | "talking" | "resting" | "wandering";
  x: number;
  z: number;
  face: number;
};

function deskX(cx: number, i: number) {
  return cx + (i - 1) * 3;
}

const BEHAVIORS: Record<string, Behavior> = (() => {
  const map: Record<string, Behavior> = {};
  for (const section of SECTIONS) {
    const [cx] = section.position;
    const roomExperts = EXPERTS.filter((e) => e.sectionId === section.id);
    let talkerIndex = 0;
    roomExperts.forEach((expert, i) => {
      switch (expert.activity) {
        case "working":
          map[expert.id] = { kind: "working", x: deskX(cx, i), z: -7.65, face: Math.PI };
          break;
        case "talking": {
          const j = talkerIndex++;
          map[expert.id] = {
            kind: "talking",
            x: cx + (j === 0 ? -0.7 : 0.7),
            z: -3.2,
            face: j === 0 ? Math.PI / 2 : -Math.PI / 2,
          };
          break;
        }
        case "resting":
          map[expert.id] = { kind: "resting", x: cx + 3.75, z: -4.5, face: -Math.PI / 2 };
          break;
        case "wandering":
          map[expert.id] = { kind: "wandering", x: cx, z: -2, face: 0 };
          break;
      }
    });
  }
  return map;
})();

/* ================= Text label (canvas-texture sprite) =================
   drei's <Text> (troika) loses the WebGL context in this setup,
   so labels are drawn to a 2D canvas and shown as billboarded sprites. */

function Label({
  text,
  position,
  height = 0.32,
  color = "#ffffff",
}: {
  text: string;
  position: [number, number, number];
  height?: number;
  color?: string;
}) {
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = "bold 72px 'Pixelify Sans', 'Arial', sans-serif";
    ctx.font = font;
    const pad = 24;
    canvas.width = Math.ceil(ctx.measureText(text).width) + pad * 2;
    canvas.height = 110;
    ctx.font = font; // resizing the canvas resets the context
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return { texture: tex, aspect: canvas.width / canvas.height };
  }, [text, color]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite position={position} scale={[height * aspect, height, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

/* ---- speech bubble (word-wrapped canvas sprite) ---- */

function SpeechBubble({ text, position }: { text: string; position: [number, number, number] }) {
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = "500 40px 'Geist', 'Arial', sans-serif";
    const maxWidth = 560;
    const pad = 30;
    const lineHeight = 52;
    const tail = 22;

    ctx.font = font;
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const trial = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(trial).width > maxWidth && cur) {
        lines.push(cur);
        cur = w;
        if (lines.length === 5) {
          cur += "…";
          break;
        }
      } else {
        cur = trial;
      }
    }
    if (cur) lines.push(cur);

    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    canvas.width = Math.ceil(Math.min(maxWidth, widest)) + pad * 2;
    canvas.height = lines.length * lineHeight + pad * 2 + tail;
    ctx.font = font; // resizing resets the context

    // rounded bubble + tail
    const w = canvas.width;
    const h = canvas.height - tail;
    const r = 24;
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, h, r);
    ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r);
    ctx.arcTo(0, 0, w, 0, r);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w / 2 - 18, h);
    ctx.lineTo(w / 2, h + tail);
    ctx.lineTo(w / 2 + 18, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    lines.forEach((l, i) => {
      ctx.fillText(l, pad, pad + lineHeight * i + lineHeight / 2);
    });

    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return { texture: tex, aspect: canvas.width / canvas.height };
  }, [text]);

  useEffect(() => () => texture.dispose(), [texture]);

  const height = Math.min(2.2, 0.7 + (1 / aspect) * 1.8);
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} />
    </sprite>
  );
}

/* ================= Pixel-art rendering =================
   The whole scene is rendered through three's RenderPixelatedPass:
   a low-res render target upscaled with nearest-neighbor (chunky pixels)
   plus depth/normal edge darkening (the dark sprite outlines). */

const PIXEL_SIZE = 2;

function PixelArtRenderer() {
  const { gl, scene, camera, size } = useThree();

  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    const pixelPass = new RenderPixelatedPass(PIXEL_SIZE, scene, camera);
    pixelPass.normalEdgeStrength = 0.4;
    pixelPass.depthEdgeStrength = 0.55;
    c.addPass(pixelPass);
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera]);

  useEffect(() => {
    // keep the composer in sync with the renderer's device pixel ratio so the
    // low-res buffer is upscaled 1:1 to physical pixels (no browser blur)
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
    gl.domElement.style.imageRendering = "pixelated";
  }, [composer, gl, size.width, size.height]);

  useEffect(() => () => composer.dispose(), [composer]);

  // priority 1 takes over rendering from r3f's default loop
  useFrame(() => composer.render(), 1);
  return null;
}

/* ================= Tile floor (canvas checker texture) =================
   Habbo-style tile grid: two-tone checker with darker grout lines,
   nearest-filtered so the tiles stay crisp under the pixel pass. */

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}

function TileFloor({
  position,
  size,
  color,
  tile = 1,
}: {
  position: [number, number, number];
  size: [number, number];
  color: string;
  tile?: number; // world units per tile
}) {
  const [w, d] = size;
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = shade(color, -14);
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillRect(64, 64, 64, 64);
    ctx.strokeStyle = shade(color, -36);
    ctx.lineWidth = 3;
    for (const [gx, gy] of [[0, 0], [64, 0], [0, 64], [64, 64]] as const) {
      ctx.strokeRect(gx + 1.5, gy + 1.5, 61, 61);
    }
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestFilter;
    tex.generateMipmaps = false;
    tex.repeat.set(w / (tile * 2), d / (tile * 2)); // texture holds a 2x2 checker
    return tex;
  }, [color, w, d, tile]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

/* ================= Furniture & outdoor props ================= */

function Desk({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.08, 0.9]} />
        <meshStandardMaterial color="#b08968" />
      </mesh>
      {[-0.8, 0.8].map((x) =>
        [-0.35, 0.35].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.375, z]} castShadow>
            <boxGeometry args={[0.07, 0.75, 0.07]} />
            <meshStandardMaterial color="#7f5539" />
          </mesh>
        ))
      )}
    </group>
  );
}

function Chair({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.5, 0.08, 0.5]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0, 0.7, 0.23]} castShadow>
        <boxGeometry args={[0.5, 0.55, 0.07]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.08, 0.4, 0.08]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
    </group>
  );
}

function Sofa({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.9, 0.35, 2]} />
        <meshStandardMaterial color="#b4533a" />
      </mesh>
      <mesh position={[0.38, 0.62, 0]} castShadow>
        <boxGeometry args={[0.18, 0.5, 2]} />
        <meshStandardMaterial color="#9c4530" />
      </mesh>
      {[-0.95, 0.95].map((z) => (
        <mesh key={z} position={[0, 0.5, z]} castShadow>
          <boxGeometry args={[0.9, 0.25, 0.18]} />
          <meshStandardMaterial color="#9c4530" />
        </mesh>
      ))}
    </group>
  );
}

function Monitor({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.55, 0.35, 0.04]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 0.25, 0.021]}>
        <planeGeometry args={[0.48, 0.28]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.08, 0.12, 0.08]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
    </group>
  );
}

function Flask({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <coneGeometry args={[0.12, 0.24, 16]} />
        <meshStandardMaterial color={color} transparent opacity={0.75} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.1, 12]} />
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

function Ball({ position, color = "#ea580c" }: { position: [number, number, number]; color?: string }) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[0.18, 24, 24]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#9a3412" />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.46, 0.36, 0.46]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow>
        <boxGeometry args={[0.28, 0.2, 0.28]} />
        <meshStandardMaterial color="#22b357" />
      </mesh>
    </group>
  );
}

/* ---- job-specific room props ---- */

function LabBench({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.08, 0.9]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      {[-0.8, 0.8].map((x) =>
        [-0.35, 0.35].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.375, z]} castShadow>
            <boxGeometry args={[0.07, 0.75, 0.07]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
        ))
      )}
    </group>
  );
}

function Stool({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.07, 14]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 10]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
    </group>
  );
}

function Lockers({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[-0.75, 0, 0.75].map((x, i) => (
        <group key={x}>
          <mesh position={[x, 0.9, 0]} castShadow>
            <boxGeometry args={[0.7, 1.8, 0.5]} />
            <meshStandardMaterial color={i === 1 ? "#64748b" : "#7c8aa0"} />
          </mesh>
          <mesh position={[x + 0.22, 0.95, 0.26]}>
            <boxGeometry args={[0.05, 0.18, 0.03]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Treadmill({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0.2]} castShadow>
        <boxGeometry args={[0.7, 0.16, 1.6]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 0.13, 0.25]}>
        <boxGeometry args={[0.5, 0.12, 1.3]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.65, -0.55]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.06, 1.1, 0.06]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
      <mesh position={[0, 1.15, -0.7]} rotation={[0.4, 0, 0]} castShadow>
        <boxGeometry args={[0.7, 0.3, 0.06]} />
        <meshStandardMaterial color="#0f172a" emissive="#38bdf8" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function BenchPress({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.45, 0.12, 1.5]} />
        <meshStandardMaterial color="#7f1d1d" />
      </mesh>
      {[-0.55, 0.55].map((z) => (
        <mesh key={z} position={[0, 0.2, z]}>
          <boxGeometry args={[0.35, 0.4, 0.1]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.6, -0.45]} castShadow>
          <boxGeometry args={[0.1, 1.2, 0.1]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
      <mesh position={[0, 1.12, -0.45]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.7, 10]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 1.12, -0.45]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.09, 16]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}
    </group>
  );
}

function ServerRack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.9, 1.8, 0.6]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {[0.45, 0.85, 1.25].map((y, i) => (
        <group key={y}>
          <mesh position={[-0.2, y, 0.31]}>
            <boxGeometry args={[0.12, 0.06, 0.02]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.2} />
          </mesh>
          <mesh position={[0.1, y, 0.31]}>
            <boxGeometry args={[0.12, 0.06, 0.02]} />
            <meshStandardMaterial
              color={i === 1 ? "#f59e0b" : "#38bdf8"}
              emissive={i === 1 ? "#f59e0b" : "#38bdf8"}
              emissiveIntensity={1.2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function RubberDuck({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.09, 12, 10]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
      <mesh position={[0.06, 0.08, 0]}>
        <sphereGeometry args={[0.055, 12, 10]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
      <mesh position={[0.12, 0.07, 0]}>
        <boxGeometry args={[0.06, 0.03, 0.04]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
    </group>
  );
}

function Mug({ position, color = "#dc2626" }: { position: [number, number, number]; color?: string }) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[0.06, 0.05, 0.12, 12]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Microscope({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[0.3, 0.08, 0.22]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[0.05, 0.22, 0]} rotation={[0, 0, -0.5]} castShadow>
        <boxGeometry args={[0.08, 0.3, 0.08]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[-0.04, 0.34, 0]} rotation={[0, 0, 0.35]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.22, 10]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
    </group>
  );
}

function JarShelf({ position }: { position: [number, number, number] }) {
  const jarColors = ["#22d3ee", "#a78bfa", "#4ade80", "#fb7185", "#fbbf24"];
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[2, 0.07, 0.4]} />
        <meshStandardMaterial color="#74492f" />
      </mesh>
      {jarColors.map((c, i) => (
        <mesh key={c} position={[-0.8 + i * 0.4, 0.16, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.25, 12]} />
          <meshStandardMaterial color={c} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Hoop({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 2.2, 10]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0, 2.1, 0.12]} castShadow>
        <boxGeometry args={[1.1, 0.75, 0.06]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 1.85, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.03, 8, 24]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>
    </group>
  );
}

function Barbell({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.25, 0]} castShadow>
          <boxGeometry args={[0.12, 0.5, 0.4]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
      <mesh position={[0, 0.52, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.7, 10]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      {[-0.72, 0.72].map((x) => (
        <mesh key={x} position={[x, 0.52, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.1, 16]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}
    </group>
  );
}

function Trophy({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <boxGeometry args={[0.18, 0.08, 0.18]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.05, 0.22, 12]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function WaterCooler({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.4, 1, 0.4]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.4, 14]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.4, 1, 0.4]} />
        <meshStandardMaterial color="#8b5a2b" />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[1.4, 1.2, 1.4]} />
        <meshStandardMaterial color="#3f9b3f" />
      </mesh>
      <mesh position={[0, 2.3, 0]} castShadow>
        <boxGeometry args={[0.9, 0.7, 0.9]} />
        <meshStandardMaterial color="#4cb84c" />
      </mesh>
    </group>
  );
}

function Car({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.1, 0.5, 2.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.75, -0.1]} castShadow>
        <boxGeometry args={[0.9, 0.4, 1.1]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
    </group>
  );
}

/* ================= Reception desk (memory check-in) ================= */

const BOOK_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

function Reception({ active }: { active: boolean }) {
  return (
    <group position={RECEPTION_POS}>
      {/* counter */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.7, 1.1, 0.9]} />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>
      <mesh position={[0, 1.12, 0]} castShadow>
        <boxGeometry args={[2.9, 0.08, 1.05]} />
        <meshStandardMaterial color="#5e3a23" />
      </mesh>
      {/* computer for checking memories in */}
      <Monitor position={[-0.7, 1.16, 0.05]} rotation={Math.PI} />
      {/* service bell */}
      <mesh position={[0.7, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.06, 16]} />
        <meshStandardMaterial color="#b45309" />
      </mesh>
      <mesh position={[0.7, 1.28, 0]} castShadow>
        <sphereGeometry args={[0.08, 16, 12]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* guest book */}
      <mesh position={[0.1, 1.18, 0.15]} rotation={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.45, 0.06, 0.32]} />
        <meshStandardMaterial color="#7c3aed" />
      </mesh>

      {/* filing cabinet behind the desk */}
      <mesh position={[-1.5, 0.65, 1.6]} castShadow>
        <boxGeometry args={[0.9, 1.3, 0.55]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      {[0.25, 0.65, 1.05].map((y) => (
        <mesh key={y} position={[-1.5, y, 1.89]}>
          <boxGeometry args={[0.7, 0.06, 0.03]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}

      {/* memory archive bookshelf */}
      <mesh position={[0.9, 0.95, 1.7]} castShadow>
        <boxGeometry args={[1.9, 1.9, 0.45]} />
        <meshStandardMaterial color="#74492f" />
      </mesh>
      {[0.55, 1.25].map((y, row) =>
        BOOK_COLORS.map((_, i) => (
          <mesh key={`${row}-${i}`} position={[0.25 + i * 0.26, y, 1.51]}>
            <boxGeometry args={[0.18, 0.5, 0.1]} />
            <meshStandardMaterial color={BOOK_COLORS[(i + row * 2) % BOOK_COLORS.length]} />
          </mesh>
        ))
      )}

      {/* check-in spot */}
      <mesh position={[0, 0.02, -1.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.65, 32]} />
        <meshBasicMaterial color={active ? "#ffffff" : "#8b5cf6"} transparent opacity={active ? 0.9 : 0.45} />
      </mesh>
      <Label text="🛎 RECEPTION" position={[0, 2.75, 0]} height={0.62} color="#fbbf24" />
      <Label text="check in your memories" position={[0, 2.22, 0]} height={0.3} color="#e2e8f0" />
    </group>
  );
}

/* ================= Hotel furniture ================= */

function Bed({ position, rotation = 0, color }: { position: [number, number, number]; rotation?: number; color: string }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.3, 2.2]} />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>
      {/* headboard */}
      <mesh position={[0, 0.6, -1.05]} castShadow>
        <boxGeometry args={[1.2, 0.75, 0.12]} />
        <meshStandardMaterial color="#74492f" />
      </mesh>
      {/* mattress, pillow, blanket */}
      <mesh position={[0, 0.44, 0.03]} castShadow>
        <boxGeometry args={[1.05, 0.16, 1.95]} />
        <meshStandardMaterial color="#f1f5f9" />
      </mesh>
      <mesh position={[0, 0.56, -0.72]} castShadow>
        <boxGeometry args={[0.7, 0.12, 0.45]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[0, 0.53, 0.45]} castShadow>
        <boxGeometry args={[1.07, 0.1, 1.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function Lounge() {
  return (
    <group>
      <mesh position={[8, 0.012, 6.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.3, 32]} />
        <meshStandardMaterial color="#a83232" transparent opacity={0.55} />
      </mesh>
      <Sofa position={[8, 0, 5]} rotation={Math.PI / 2} />
      <Sofa position={[8, 0, 8.2]} rotation={-Math.PI / 2} />
      <mesh position={[8, 0.22, 6.6]} castShadow>
        <boxGeometry args={[1.4, 0.44, 0.8]} />
        <meshStandardMaterial color="#9c6b43" />
      </mesh>
      <Plant position={[10.5, 0, 6.6]} />
    </group>
  );
}

function Elevator() {
  return (
    <group position={[-14.55, 0, 5.5]}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[0.25, 2.2, 2.4]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      {[-0.5, 0.5].map((z) => (
        <mesh key={z} position={[0.14, 1.05, z]}>
          <boxGeometry args={[0.06, 1.9, 0.92]} />
          <meshStandardMaterial color="#aab2bd" metalness={0.5} roughness={0.35} />
        </mesh>
      ))}
      <Label text="🛗 ELEVATOR" position={[0.3, 2.62, 0]} height={0.34} color="#e2e8f0" />
      <Label text="floors 2-4 coming soon" position={[0.3, 2.26, 0]} height={0.2} color="#94a3b8" />
    </group>
  );
}

/* ================= Voxel character (shared by player & NPCs) ================= */

type Outfit = {
  shirt: string;
  pants: string;
  hair: string;
  accessory?: "headphones" | "labcoat" | "headband" | "vest";
  accent?: string;
};

const HAIR_COLORS = ["#3b2a1d", "#111827", "#92400e", "#4b5563", "#1c1917", "#7c2d12", "#0f172a", "#57534e", "#451a03"];

function outfitFor(expert: Expert, index: number): Outfit {
  const hair = HAIR_COLORS[index % HAIR_COLORS.length];
  if (expert.sectionId === "science") {
    return { shirt: "#f1f5f9", pants: "#334155", hair, accessory: "labcoat", accent: expert.color };
  }
  if (expert.sectionId === "sport") {
    return { shirt: expert.color, pants: "#0f172a", hair, accessory: "headband", accent: "#ef4444" };
  }
  return { shirt: expert.color, pants: "#1f2a44", hair, accessory: "headphones", accent: "#0ea5e9" };
}

function Character({
  outfit,
  movingRef,
  poseRef,
}: {
  outfit: Outfit;
  movingRef: React.MutableRefObject<boolean>;
  poseRef?: React.MutableRefObject<"stand" | "sit">;
}) {
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const sitting = poseRef?.current === "sit";
    const swing = !sitting && movingRef.current ? Math.sin(t * 11) * 0.7 : 0;
    if (leftLeg.current) leftLeg.current.rotation.x = sitting ? 1.5 : swing;
    if (rightLeg.current) rightLeg.current.rotation.x = sitting ? 1.5 : -swing;
    if (leftArm.current) leftArm.current.rotation.x = sitting ? 0.4 : -swing * 0.8;
    if (rightArm.current) rightArm.current.rotation.x = sitting ? 0.4 : swing * 0.8;
  });

  return (
    <group>
      {/* legs */}
      <group ref={leftLeg} position={[-0.12, 0.42, 0]}>
        <mesh position={[0, -0.21, 0]} castShadow>
          <boxGeometry args={[0.17, 0.42, 0.2]} />
          <meshStandardMaterial color={outfit.pants} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.12, 0.42, 0]}>
        <mesh position={[0, -0.21, 0]} castShadow>
          <boxGeometry args={[0.17, 0.42, 0.2]} />
          <meshStandardMaterial color={outfit.pants} />
        </mesh>
      </group>
      {/* body */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.5, 0.55, 0.3]} />
        <meshStandardMaterial color={outfit.shirt} />
      </mesh>
      {/* arms */}
      <group ref={leftArm} position={[-0.33, 0.92, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.14, 0.45, 0.16]} />
          <meshStandardMaterial color={outfit.shirt} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.33, 0.92, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.14, 0.45, 0.16]} />
          <meshStandardMaterial color={outfit.shirt} />
        </mesh>
      </group>
      {/* head + hair (chibi: oversized head, pixel eyes) */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.56, 0.5, 0.52]} />
        <meshStandardMaterial color="#fcd9b8" />
      </mesh>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 1.21, 0.27]}>
          <boxGeometry args={[0.07, 0.1, 0.02]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}
      <mesh position={[0, 1.47, -0.02]} castShadow>
        <boxGeometry args={[0.6, 0.18, 0.56]} />
        <meshStandardMaterial color={outfit.hair} />
      </mesh>

      {/* job details */}
      {outfit.accessory === "headphones" && (
        <>
          <mesh position={[0, 1.58, 0]}>
            <boxGeometry args={[0.64, 0.07, 0.14]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          {[-0.32, 0.32].map((x) => (
            <mesh key={x} position={[x, 1.22, 0]}>
              <boxGeometry args={[0.09, 0.18, 0.2]} />
              <meshStandardMaterial color={outfit.accent ?? "#111827"} />
            </mesh>
          ))}
        </>
      )}
      {outfit.accessory === "labcoat" && (
        <>
          {/* glasses */}
          <mesh position={[0, 1.26, 0.27]}>
            <boxGeometry args={[0.48, 0.08, 0.03]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          {/* colored shirt under the coat */}
          <mesh position={[0, 0.78, 0.16]}>
            <boxGeometry args={[0.16, 0.3, 0.03]} />
            <meshStandardMaterial color={outfit.accent ?? "#94a3b8"} />
          </mesh>
        </>
      )}
      {outfit.accessory === "headband" && (
        <mesh position={[0, 1.38, 0]}>
          <boxGeometry args={[0.6, 0.1, 0.58]} />
          <meshStandardMaterial color={outfit.accent ?? "#ef4444"} />
        </mesh>
      )}
      {outfit.accessory === "vest" && (
        <>
          <mesh position={[0, 0.64, 0]} castShadow>
            <boxGeometry args={[0.54, 0.42, 0.34]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          {/* tie */}
          <mesh position={[0, 0.82, 0.17]}>
            <boxGeometry args={[0.08, 0.28, 0.03]} />
            <meshStandardMaterial color={outfit.accent ?? "#8b5cf6"} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Receptionist() {
  const movingRef = useRef(false);
  return (
    <group position={[RECEPTION_POS[0], 0, 8.35]} rotation={[0, Math.PI, 0]}>
      <Character
        outfit={{ shirt: "#e2e8f0", pants: "#111827", hair: "#52525b", accessory: "vest", accent: "#8b5cf6" }}
        movingRef={movingRef}
      />
      <Label text="receptionist" position={[0, 1.84, 0]} height={0.28} color="#cbd5e1" />
    </group>
  );
}

/* ================= Expert NPC with behavior ================= */

const WORK_BUBBLE: Record<string, string> = {
  coding: "⌨️",
  science: "💻",
  sport: "🏋️",
};

function ExpertAvatar({
  expert,
  index,
  active,
  bubbleText,
  onSelect,
  positionsRef,
}: {
  expert: Expert;
  index: number;
  active: boolean;
  bubbleText: string | null;
  onSelect: (e: Expert) => void;
  positionsRef: React.MutableRefObject<Record<string, { x: number; z: number }>>;
}) {
  const behavior = BEHAVIORS[expert.id];
  const section = SECTIONS.find((s) => s.id === expert.sectionId)!;
  const cx = section.position[0];
  // safe stroll area: clear of the bed (west), workstations (north) and sofa (east)
  const bounds = { minX: cx - 1.8, maxX: cx + 2.9, minZ: -6.4, maxZ: 0.8 };

  const group = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const [atHome, setAtHome] = useState(true);
  useCursor(hovered);

  const movingRef = useRef(false);
  const poseRef = useRef<"stand" | "sit">(behavior.kind === "resting" ? "sit" : "stand");
  const pos = useRef({ x: behavior.x, z: behavior.z });
  const target = useRef({ x: behavior.x, z: behavior.z });
  const heading = useRef(behavior.face);
  const mode = useRef<"home" | "stroll" | "return">("home");
  const modeUntil = useRef(3 + Math.random() * 9);

  const lit = hovered || active;
  const outfit = useMemo(() => outfitFor(expert, index), [expert, index]);

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    let moving = false;

    const walkToward = (tx: number, tz: number) => {
      const dx = tx - pos.current.x;
      const dz = tz - pos.current.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.12) return true;
      const step = Math.min(1.4 * delta, dist);
      pos.current.x += (dx / dist) * step;
      pos.current.z += (dz / dist) * step;
      const want = Math.atan2(dx, dz);
      let diff = want - heading.current;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      heading.current += diff * Math.min(1, delta * 8);
      moving = true;
      return false;
    };

    if (!lit) {
      if (mode.current === "home") {
        // settle into the station's facing direction
        let diff = behavior.face - heading.current;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        heading.current += diff * Math.min(1, delta * 6);
        if (t > modeUntil.current) {
          mode.current = "stroll";
          modeUntil.current = t + 4 + Math.random() * 6;
          target.current = {
            x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
            z: bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ),
          };
          poseRef.current = "stand";
          setAtHome(false);
        }
      } else if (mode.current === "stroll") {
        if (walkToward(target.current.x, target.current.z)) {
          target.current = {
            x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
            z: bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ),
          };
        }
        if (t > modeUntil.current) mode.current = "return";
      } else if (walkToward(behavior.x, behavior.z)) {
        mode.current = "home";
        // wanderers barely pause at home; others settle in for a while
        modeUntil.current = t + (behavior.kind === "wandering" ? 1 + Math.random() * 2 : 7 + Math.random() * 10);
        poseRef.current = behavior.kind === "resting" ? "sit" : "stand";
        setAtHome(true);
      }
    }

    movingRef.current = moving;
    const seated = poseRef.current === "sit";
    const baseY = seated ? 0.06 : 0;
    const bob = moving ? Math.abs(Math.sin(t * 9)) * 0.05 : Math.sin(t * 2 + index) * 0.02;
    group.current.position.set(pos.current.x, baseY + (lit ? 0.06 : 0) + bob, pos.current.z);
    group.current.rotation.y = heading.current;
    positionsRef.current[expert.id] = { x: pos.current.x, z: pos.current.z };
  });

  const bubble =
    !lit && atHome
      ? behavior.kind === "talking"
        ? "💬"
        : behavior.kind === "resting"
          ? "💤"
          : behavior.kind === "working"
            ? WORK_BUBBLE[expert.sectionId]
            : null
      : null;

  return (
    <group
      ref={group}
      position={[behavior.x, 0, behavior.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(expert);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <Character outfit={outfit} movingRef={movingRef} poseRef={poseRef} />
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.42, 32]} />
        <meshBasicMaterial color={lit ? "#ffffff" : expert.color} transparent opacity={lit ? 0.9 : 0.35} />
      </mesh>
      <Label
        text={expert.name}
        position={[0, 2.05, 0]}
        height={0.42}
        color={lit ? "#ffffff" : "#e2e8f0"}
      />
      {lit && (
        <Label
          text={`${expert.priceCredits.toLocaleString()} credits · ★ ${expert.rating}`}
          position={[0, 1.64, 0]}
          height={0.34}
          color="#fbbf24"
        />
      )}
      {bubble && !bubbleText && <Label text={bubble} position={[0.32, 2.2, 0]} height={0.3} />}
      {bubbleText && <SpeechBubble text={bubbleText} position={[0, 2.7, 0]} />}
    </group>
  );
}

/* ================= Playable character ================= */

function Player({
  paused,
  bubbleText,
  positionRef,
  expertPositionsRef,
  onNearChange,
}: {
  paused: boolean;
  bubbleText: string | null;
  positionRef: React.MutableRefObject<Vector3>;
  expertPositionsRef: React.MutableRefObject<Record<string, { x: number; z: number }>>;
  onNearChange: (t: NearTarget | null) => void;
}) {
  const group = useRef<Group>(null);
  const movingRef = useRef(false);
  const keys = useRef<Set<string>>(new Set());
  const heading = useRef(Math.PI); // face the door
  const nearKey = useRef<string | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) {
        return; // don't hijack keys while typing in a form
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      keys.current.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const clear = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);

  useFrame((state, delta) => {
    if (!group.current) return;
    const pos = positionRef.current;
    const k = keys.current;

    let dx = 0;
    let dz = 0;
    if (!pausedRef.current) {
      if (k.has("w") || k.has("arrowup")) dz -= 1;
      if (k.has("s") || k.has("arrowdown")) dz += 1;
      if (k.has("a") || k.has("arrowleft")) dx -= 1;
      if (k.has("d") || k.has("arrowright")) dx += 1;
    }
    const moving = dx !== 0 || dz !== 0;

    if (moving) {
      const len = Math.hypot(dx, dz);
      const step = (PLAYER_SPEED * delta) / len;
      // axis-separated collision so you slide along walls
      const nx = pos.x + dx * step;
      if (!blocked(nx, pos.z)) pos.x = nx;
      const nz = pos.z + dz * step;
      if (!blocked(pos.x, nz)) pos.z = nz;
      // keep the player on the map
      pos.x = Math.max(-28, Math.min(28, pos.x));
      pos.z = Math.max(-18, Math.min(22, pos.z));

      const target = Math.atan2(dx, dz);
      let diff = target - heading.current;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      heading.current += diff * Math.min(1, delta * 14);
    }

    const t = state.clock.elapsedTime;
    movingRef.current = moving;
    group.current.position.set(pos.x, moving ? Math.abs(Math.sin(t * 11)) * 0.06 : 0, pos.z);
    group.current.rotation.y = heading.current;

    // proximity check for "press E" (experts move, so read live positions)
    let nearest: NearTarget | null = null;
    let best = TALK_RADIUS;
    for (const expert of EXPERTS) {
      const p = expertPositionsRef.current[expert.id];
      if (!p) continue;
      const d = Math.hypot(p.x - pos.x, p.z - pos.z);
      if (d < best) {
        best = d;
        nearest = { kind: "expert", expert };
      }
    }
    const dv = Math.hypot(RECEPTION_SPOT.x - pos.x, RECEPTION_SPOT.z - pos.z);
    if (dv < Math.min(best, 2)) nearest = { kind: "vault" };

    const key = nearest === null ? null : nearest.kind === "vault" ? "vault" : nearest.expert.id;
    if (key !== nearKey.current) {
      nearKey.current = key;
      onNearChange(nearest);
    }
  });

  return (
    <group ref={group} position={[0, 0, 13]}>
      <Character
        outfit={{ shirt: "#e3445a", pants: "#1f2a44", hair: "#3b2a1d" }}
        movingRef={movingRef}
      />
      <Label text="Me" position={[0, 2.0, 0]} height={0.42} color="#facc15" />
      {bubbleText && <SpeechBubble text={bubbleText} position={[0, 2.4, 0]} />}
      {/* marker ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.4, 32]} />
        <meshBasicMaterial color="#facc15" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// fixed isometric offset: 45° azimuth, ~27° elevation (2:1 dimetric, Habbo-style)
const ISO_OFFSET = new Vector3(16, 11.5, 16);

function FollowCamera({ positionRef }: { positionRef: React.MutableRefObject<Vector3> }) {
  const { camera } = useThree();
  const look = useRef(new Vector3());

  useFrame((_, delta) => {
    const pos = positionRef.current;
    const lerp = 1 - Math.pow(0.0001, delta);
    camera.position.lerp(
      new Vector3(pos.x + ISO_OFFSET.x, pos.y + ISO_OFFSET.y, pos.z + ISO_OFFSET.z),
      lerp
    );
    look.current.lerp(new Vector3(pos.x, pos.y + 0.5, pos.z), lerp);
    camera.lookAt(look.current);
  });

  return null;
}

/* ================= Building & grounds ================= */

function Building() {
  return (
    <group>
      {/* room + lobby floors (checker tile grid) */}
      {SECTIONS.map((s) => (
        <TileFloor key={s.id} position={[s.position[0], 0.01, -4]} size={[10, 12]} color={s.floorColor} />
      ))}
      <TileFloor position={[0, 0.01, 6]} size={[30, 8]} color="#c9a06c" />
      {/* welcome mat at the front door */}
      <mesh position={[0, 0.02, 9.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 1.4]} />
        <meshStandardMaterial color="#7c3aed" />
      </mesh>
      {/* red carpet runner: front door -> corridor along the room doors */}
      <mesh position={[0, 0.015, 6.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.7, 7]} />
        <meshStandardMaterial color="#a83232" />
      </mesh>
      <mesh position={[0, 0.015, 3.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[27, 1.7]} />
        <meshStandardMaterial color="#a83232" />
      </mesh>

      {/* walls (cutaway: rendered height varies, collision uses full footprint) */}
      {WALLS.map((w, i) => {
        const h = w.h ?? WALL_H;
        return (
          <mesh key={i} position={[w.x, h / 2, w.z]} castShadow receiveShadow>
            <boxGeometry args={[w.w, h, w.d]} />
            <meshStandardMaterial color="#e6d3ae" />
          </mesh>
        );
      })}

      {/* building sign */}
      <Label text="MEMONADS" position={[0, 3.7, 9.8]} height={0.9} color="#ffffff" />

      {/* lobby: lounge, elevator, plants */}
      <Lounge />
      <Elevator />
      <Plant position={[-13.8, 0, 8.8]} />
      <Plant position={[13.8, 0, 8.8]} />
      <Plant position={[13.8, 0, 3.2]} />
      <Plant position={[-1.8, 0, 9]} />
      <Plant position={[1.8, 0, 9]} />
    </group>
  );
}

function SectionRoom({ section }: { section: Section }) {
  const [cx] = section.position;
  return (
    <group>
      <Label
        text={section.name.toUpperCase()}
        position={[cx, 3.2, -4]}
        height={1}
        color={section.color}
      />
      {/* doorway accent strip */}
      <mesh position={[cx, 0.02, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 0.8]} />
        <meshBasicMaterial color={section.color} />
      </mesh>

      {/* hotel bed against the west wall */}
      <Bed position={[cx - 3.8, 0, -2.5]} rotation={-Math.PI / 2} color={section.color} />
      <Plant position={[cx - 4.4, 0, -0.8]} />

      {/* north-wall workstations matching the room's job */}
      {section.id === "coding" &&
        [0, 1, 2].map((i) => (
          <group key={i}>
            <Desk position={[deskX(cx, i), 0, -8.6]} />
            <Monitor position={[deskX(cx, i), 0.79, -8.7]} />
            <Chair position={[deskX(cx, i), 0, -7.6]} rotation={Math.PI} />
          </group>
        ))}
      {section.id === "science" &&
        [0, 1, 2].map((i) => (
          <group key={i}>
            <LabBench position={[deskX(cx, i), 0, -8.6]} />
            <Stool position={[deskX(cx, i), 0, -7.6]} />
          </group>
        ))}
      {section.id === "sport" && (
        <>
          <Lockers position={[cx - 3, 0, -9.1]} />
          <Treadmill position={[cx, 0, -8.4]} />
          <BenchPress position={[cx + 2.8, 0, -8.5]} />
        </>
      )}

      {/* sofa corner */}
      <Sofa position={[cx + 4.2, 0, -4.5]} />
      <Plant position={[cx + 4.3, 0, -6.3]} />

      {/* job-specific interior */}
      {section.id === "coding" && (
        <>
          {/* dual monitors everywhere, server rack humming in the corner */}
          <Monitor position={[deskX(cx, 0) + 0.55, 0.79, -8.65]} rotation={0.25} />
          <Monitor position={[deskX(cx, 1) + 0.55, 0.79, -8.65]} rotation={0.25} />
          <Monitor position={[deskX(cx, 2) + 0.55, 0.79, -8.65]} rotation={0.25} />
          <ServerRack position={[cx + 4.2, 0, -8.7]} />
          <RubberDuck position={[deskX(cx, 1) - 0.6, 0.87, -8.45]} />
          <Mug position={[deskX(cx, 0) - 0.6, 0.89, -8.4]} />
          <Mug position={[deskX(cx, 2) - 0.6, 0.89, -8.4]} color="#2563eb" />
          {/* code poster on the north wall */}
          <mesh position={[cx - 4, 1.4, -9.62]}>
            <planeGeometry args={[1.3, 0.9]} />
            <meshStandardMaterial color="#0c4a6e" emissive="#0ea5e9" emissiveIntensity={0.25} />
          </mesh>
          <Label text="</>" position={[cx - 4, 1.45, -9.5]} height={0.55} color="#7dd3fc" />
        </>
      )}
      {section.id === "science" && (
        <>
          {/* lab gear: flasks, microscope, specimen shelf, formula board */}
          <Flask position={[deskX(cx, 1) - 0.55, 0.79, -8.5]} color="#22d3ee" />
          <Flask position={[deskX(cx, 1) + 0.55, 0.79, -8.55]} color="#a78bfa" />
          <Flask position={[deskX(cx, 2) - 0.5, 0.79, -8.5]} color="#4ade80" />
          <Microscope position={[deskX(cx, 0), 0.83, -8.55]} />
          <JarShelf position={[cx + 2.8, 1.6, -9.55]} />
          {/* specimen fridge */}
          <mesh position={[cx + 4.2, 0.85, -8.7]} castShadow>
            <boxGeometry args={[0.9, 1.7, 0.7]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
          <mesh position={[cx + 4.2, 1.1, -8.32]}>
            <boxGeometry args={[0.5, 0.06, 0.05]} />
            <meshStandardMaterial color="#64748b" />
          </mesh>
          <mesh position={[cx - 4.8, 1.3, -4]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[2, 1.1, 0.08]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <Label text="E = mc²" position={[cx - 4.6, 1.5, -4]} height={0.34} color="#334155" />
        </>
      )}
      {section.id === "sport" && (
        <>
          {/* mini court corner: hoop, balls, weights, mats, trophies, cooler */}
          <Hoop position={[cx + 4.2, 0, -8.8]} />
          <Ball position={[cx + 3.4, 0.18, -7.6]} />
          <Ball position={[cx - 3.5, 0.18, -7.3]} color="#facc15" />
          <Barbell position={[cx - 3.6, 0, -6]} />
          <mesh position={[cx - 4, 0.04, -4.8]} rotation={[-Math.PI / 2, 0, 0.3]}>
            <planeGeometry args={[1, 2]} />
            <meshStandardMaterial color="#7c3aed" />
          </mesh>
          <mesh position={[cx - 2.9, 0.04, -5.4]} rotation={[-Math.PI / 2, 0, -0.2]}>
            <planeGeometry args={[1, 2]} />
            <meshStandardMaterial color="#06b6d4" />
          </mesh>
          {/* trophy dresser */}
          <mesh position={[cx + 4.2, 0.4, -1]} castShadow>
            <boxGeometry args={[0.5, 0.8, 1.2]} />
            <meshStandardMaterial color="#74492f" />
          </mesh>
          <Trophy position={[cx + 4.2, 0.84, -1.3]} />
          <Trophy position={[cx + 4.2, 0.84, -0.7]} scale={0.8} />
          <WaterCooler position={[cx + 4.35, 0, -7.3]} />
        </>
      )}
    </group>
  );
}

function Grounds() {
  return (
    <group>
      {/* grass (big soft checker like a mowed lawn) */}
      <TileFloor position={[0, -0.01, 0]} size={[64, 48]} color="#74bd58" tile={2} />
      {/* path from the front door */}
      <TileFloor position={[0, 0, 13.5]} size={[3, 7]} color="#b9b3a4" />
      {/* parking lot */}
      <TileFloor position={[23, 0, 6]} size={[12, 12]} color="#8c8c8c" tile={2} />
      <Car position={[20.5, 0, 3]} color="#3b5bd6" />
      <Car position={[23.5, 0, 3]} color="#d63b3b" />
      <Car position={[26.5, 0, 3]} color="#3bd66e" />
      {/* trees */}
      <Tree position={[-20, 0, 12]} />
      <Tree position={[-23, 0, 2]} />
      <Tree position={[-19, 0, -8]} />
      <Tree position={[20, 0, -7]} />
      <Tree position={[24, 0, -3]} />
      <Tree position={[-6, 0, 14.5]} />
      <Tree position={[7, 0, 14.5]} />
    </group>
  );
}

/* ================= Scene root ================= */

export default function OfficeScene({
  selectedId,
  paused,
  playerBubble,
  expertBubble,
  onSelectExpert,
  onNearChange,
}: {
  selectedId: string | null;
  paused: boolean;
  playerBubble: string | null;
  expertBubble: { id: string; text: string } | null;
  onSelectExpert: (e: Expert | null) => void;
  onNearChange: (t: NearTarget | null) => void;
}) {
  const playerPos = useRef(new Vector3(0, 0, 13));
  const expertPositions = useRef<Record<string, { x: number; z: number }>>({});
  const [near, setNear] = useState<NearTarget | null>(null);
  // labels are drawn to canvas textures once, so wait for the pixel font first
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.race([
      document.fonts.load("bold 72px 'Pixelify Sans'"),
      new Promise((r) => setTimeout(r, 1500)),
    ]).then(() => {
      if (alive) setFontsReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const nearExpertId = near?.kind === "expert" ? near.expert.id : null;
  const nearVault = near?.kind === "vault";

  if (!fontsReady) return null;

  return (
    <Canvas
      orthographic
      flat
      dpr={[1, 2]}
      gl={{ antialias: false }}
      camera={{ zoom: 50, position: [16, 11.5, 29], near: 0.1, far: 300 }}
      onPointerMissed={() => onSelectExpert(null)}
    >
      <color attach="background" args={["#f3f0e7"]} />

      {/* flat sprite-style lighting: strong ambient + one directional so each
          box face gets its own uniform tone (no shadows, no gradients) */}
      <ambientLight intensity={0.85} />
      <directionalLight position={[8, 14, 5]} intensity={0.7} />

      <Grounds />
      <Building />
      {SECTIONS.map((section) => (
        <SectionRoom key={section.id} section={section} />
      ))}
      <Reception active={nearVault} />
      <Receptionist />
      {EXPERTS.map((expert, i) => (
        <ExpertAvatar
          key={expert.id}
          expert={expert}
          index={i}
          active={selectedId === expert.id || nearExpertId === expert.id}
          bubbleText={expertBubble?.id === expert.id ? expertBubble.text : null}
          onSelect={onSelectExpert}
          positionsRef={expertPositions}
        />
      ))}

      <Player
        paused={paused}
        bubbleText={playerBubble}
        positionRef={playerPos}
        expertPositionsRef={expertPositions}
        onNearChange={(t) => {
          setNear(t);
          onNearChange(t);
        }}
      />
      <FollowCamera positionRef={playerPos} />
      <PixelArtRenderer />
    </Canvas>
  );
}
