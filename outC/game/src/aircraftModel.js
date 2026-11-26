// Procedural Stormwalker airframes. Four silhouettes with liveries, glass,
// collector spines and lit details — built from standard-material primitives
// with shadows on, posed after the flight model each frame. Every frame
// carries the dorsal Faraday collector: a cyan spine strip whose glow tracks
// the capacitor, the visual signature of the whole fleet.

import * as THREE from 'three';

function mat(color, rough = 0.5, metal = 0.35) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}
function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z); b.castShadow = true;
  return b;
}
function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 10) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  c.position.set(x, y, z); c.castShadow = true;
  return c;
}

function buildFrame(def) {
  const g = new THREE.Group();
  const body = mat(def.colour, 0.42, 0.45), acc = mat(def.accent, 0.5, 0.3);
  const dark = mat(0x22262c, 0.6, 0.4);
  const glass = new THREE.MeshStandardMaterial({ color: 0x101c2c, roughness: 0.12, metalness: 0.9 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x0b2b33, emissive: 0x37e0ff, emissiveIntensity: 0.4 });

  const prop = new THREE.Group();
  if (def.id === 'kestrel') {
    // High-wing trainer: long fuselage, big gentle wing, struts, taildragger stance.
    g.add(cyl(0.85, 0.5, 7.6, body, 0, 0, 0.4)).children;
    g.children[g.children.length - 1].rotation.x = Math.PI / 2;
    g.add(box(10.6, 0.28, 1.7, body, 0, 1.05, 0.6));                    // wing
    g.add(box(10.6, 0.5, 0.24, acc, 0, 1.05, 1.42));                    // accent leading edge
    g.add(box(0.18, 1.5, 0.18, dark, -2.2, 0.4, 0.6)); g.add(box(0.18, 1.5, 0.18, dark, 2.2, 0.4, 0.6)); // struts
    const can = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 9), glass);
    can.scale.set(0.9, 0.62, 1.5); can.position.set(0, 0.95, 1.1); can.castShadow = true; g.add(can);
    g.add(box(3.4, 0.22, 1.1, body, 0, 0.55, -3.6));                    // tailplane
    g.add(box(0.22, 1.7, 1.2, acc, 0, 1.15, -3.7));                     // fin
    prop.position.set(0, 0, 4.35);
  } else if (def.id === 'petrel') {
    // Penetrator: dart fuselage, swept thin wing, twin fins, jet intake chin.
    const fus = cyl(0.62, 0.34, 9.4, body, 0, 0, 0.2); fus.rotation.x = Math.PI / 2; g.add(fus);
    const wing = box(8.8, 0.16, 1.5, body, 0, -0.1, -0.4); wing.rotation.y = 0.32; g.add(wing);
    const can = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 9), glass);
    can.scale.set(0.85, 0.55, 1.9); can.position.set(0, 0.55, 2.2); g.add(can);
    g.add(box(0.16, 1.5, 1.1, acc, -1.15, 0.8, -4.2)); g.add(box(0.16, 1.5, 1.1, acc, 1.15, 0.8, -4.2));
    g.add(box(1.5, 0.7, 1.4, dark, 0, -0.62, 1.6));                     // chin intake
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), new THREE.MeshBasicMaterial({ color: 0x66d9ff }));
    glow.position.set(0, 0, -4.55); glow.rotation.y = Math.PI; g.add(glow);
  } else if (def.id === 'albatross') {
    // Heavy harvester: fat hull, twin props, capacitor pods under the wing.
    const fus = cyl(1.25, 0.8, 9.8, body, 0, 0, 0); fus.rotation.x = Math.PI / 2; g.add(fus);
    g.add(box(13.4, 0.34, 2.1, body, 0, 1.35, 0.3));
    const can = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 9), glass);
    can.scale.set(1, 0.6, 1.3); can.position.set(0, 1.15, 3.4); g.add(can);
    for (const sx of [-3.4, 3.4]) {
      const pod = cyl(0.52, 0.52, 3.6, acc, sx, 0.75, 0.5); pod.rotation.x = Math.PI / 2; g.add(pod);
      const p2 = new THREE.Group(); p2.position.set(sx, 0.75, 2.42); g.add(p2); prop.userData['p' + sx] = p2;
      const b1 = box(0.22, 3.1, 0.08, dark, 0, 0, 0); p2.add(b1);
      const b2 = box(3.1, 0.22, 0.08, dark, 0, 0, 0); p2.add(b2);
    }
    g.add(box(4.6, 0.26, 1.3, body, 0, 0.7, -4.4));
    g.add(box(0.26, 2.1, 1.4, acc, 0, 1.5, -4.5));
    prop.position.set(0, 0, 5.15);
  } else {
    // Stormpetrel: compact vectored jet, canards, single tall fin, wide stance.
    const fus = cyl(0.58, 0.4, 8.2, body, 0, 0, 0.1); fus.rotation.x = Math.PI / 2; g.add(fus);
    const wing = box(7.6, 0.15, 1.7, body, 0, -0.16, -0.9); wing.rotation.y = -0.18; g.add(wing);
    g.add(box(2.6, 0.12, 0.8, acc, 0, 0.12, 2.6));                      // canards
    const can = new THREE.Mesh(new THREE.SphereGeometry(0.68, 12, 9), glass);
    can.scale.set(0.85, 0.55, 1.8); can.position.set(0, 0.52, 1.9); g.add(can);
    g.add(box(0.18, 1.9, 1.3, acc, 0, 1.05, -3.6));
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), new THREE.MeshBasicMaterial({ color: 0x8ff2ff }));
    glow.position.set(0, 0, -4.05); glow.rotation.y = Math.PI; g.add(glow);
  }
  // Prop for the prop frames (kestrel nose; albatross uses its pod props).
  if (def.id === 'kestrel') {
    const b1 = box(0.26, 3.4, 0.09, mat(0x2c2f33, 0.5, 0.3)); prop.add(b1);
    const b2 = box(3.4, 0.26, 0.09, mat(0x2c2f33, 0.5, 0.3)); prop.add(b2);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.75, 20),
      new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.16, side: THREE.DoubleSide }));
    prop.add(disc);
    g.add(prop);
  }
  // The Faraday collector spine: every Stormwalker carries one.
  const spineStrip = box(0.34, 0.16, 4.6, glowMat, 0, 1.02, -0.5);
  g.add(spineStrip);
  // Wingtip lights.
  const tipL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff4444 }));
  const tipR = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), new THREE.MeshBasicMaterial({ color: 0x44ff77 }));
  const span = def.id === 'albatross' ? 6.7 : def.id === 'kestrel' ? 5.3 : def.id === 'petrel' ? 4.4 : 3.8;
  tipL.position.set(-span, 0.4, 0); tipR.position.set(span, 0.4, 0);
  g.add(tipL); g.add(tipR);

  return { group: g, prop, podProps: prop.userData, glowMat };
}

export function createAircraftMesh(def) {
  return buildFrame(def);
}

// Pose after the flight model: meshes are built nose +z, so yaw is pi-heading.
export function poseAircraft(mesh, state) {
  mesh.position.set(state.x, state.y + 2.1, state.z);
  mesh.rotation.set(0, 0, 0);
  mesh.rotation.order = 'YXZ';
  mesh.rotation.y = Math.PI - state.heading;
  mesh.rotation.x = -state.pitch;
  mesh.rotation.z = state.roll;
}
export function spinProps(built, state, dt) {
  const w = (2 + state.throttle * 55) * dt * (state.airborne || state.groundSpeed > 1 ? 1 : 0.25);
  if (built.prop) built.prop.rotation.z += w;
  for (const k of Object.keys(built.podProps ?? {})) built.podProps[k].rotation.z += w;
}
export function setChargeGlow(built, frac) {
  built.glowMat.emissiveIntensity = 0.35 + frac * 2.6;
}
