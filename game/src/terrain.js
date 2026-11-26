// The Stratum, built: a vertex-coloured heightfield the physics shares, a
// gradient sky dome, instanced towns/trees/turbines, cloud streets and storm
// towers over the Roar, the Eye's rotating wall, aurora ribbons for the night,
// and a lightning rig (bolt lines + flash light) the storm director fires.
// Materials are MeshStandardMaterial throughout — sun, shadow and fog do the
// Play-Store work; colours carry the zone language: emerald Calm, bruised
// Transition, ink-and-violet Roar.

import * as THREE from 'three';
import { heightAt, PADS, STORM_CELLS, LANDMARKS } from './data/zones.js';
import { TIMES } from './config.js';

const V3 = (a, b, c) => new THREE.Vector3(a, b, c);

export function createWorld(scene, timeId) {
  const time = TIMES[timeId] ?? TIMES.day;
  const group = new THREE.Group();
  scene.add(group);

  // Sky dome: gradient shader, horizon colour follows the time of day.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(15000, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(time.sky) }, bot: { value: new THREE.Color(time.fog) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 1.6 + 0.18, 0.0, 1.0); gl_FragColor = vec4(mix(bot, top, pow(h, 0.8)), 1.0); }',
    }));
  group.add(sky);

  const sun = new THREE.DirectionalLight(time.sun, time.sunI);
  sun.position.set(3000, 4200, 1800);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -420; sun.shadow.camera.right = 420;
  sun.shadow.camera.top = 420; sun.shadow.camera.bottom = -420;
  sun.shadow.camera.far = 9000;
  group.add(sun); group.add(sun.target);
  group.add(new THREE.HemisphereLight(time.sky, 0x3a4a3a, time.amb));
  scene.fog = new THREE.Fog(time.fog, time.fogNear, time.fogFar);

  // Heightfield.
  const SEG = 190, SIZE = 12600;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colours = [];
  const cCalm = new THREE.Color(0x4d7d43), cMesa = new THREE.Color(0x9a8a5a), cTrans = new THREE.Color(0x6e5a68),
    cRoar = new THREE.Color(0x3d3648), cSand = new THREE.Color(0xc2b28a), cRock = new THREE.Color(0x77706a),
    cSnow = new THREE.Color(0xd8dde2), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    if (h < 2.5) tmp.copy(cSand);
    else if (z < -600) tmp.copy(cRoar).lerp(cRock, Math.min(1, h / 500));
    else if (z < 800) tmp.copy(cTrans).lerp(cMesa, Math.max(0, 1 - Math.abs(z - 100) / 700));
    else tmp.copy(cCalm).lerp(cMesa, Math.min(1, Math.max(0, (h - 60) / 130)));
    if (h > 480) tmp.lerp(cSnow, Math.min(1, (h - 480) / 260));
    const v = 0.92 + ((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1) * 0.08;
    colours.push(tmp.r * v, tmp.g * v, tmp.b * v);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.02 }));
  ground.receiveShadow = true;
  group.add(ground);

  // Sea + Lake Vostok.
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000),
    new THREE.MeshStandardMaterial({ color: 0x14425e, roughness: 0.32, metalness: 0.25, transparent: true, opacity: 0.96 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = 0.4;
  group.add(sea);

  // Pads: cradle platform + light ring + beacon.
  const padMat = new THREE.MeshStandardMaterial({ color: 0x8b8f94, roughness: 0.6, metalness: 0.35 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc861, emissiveIntensity: 1.6 });
  for (const p of PADS) {
    const y = heightAt(p.x, p.z);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r + 4, 3, 28), padMat);
    disc.position.set(p.x, y + 0.5, p.z); disc.receiveShadow = true;
    group.add(disc);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.6, 6, 5), ringMat);
      lamp.position.set(p.x + Math.sin(a) * (p.r - 3), y + 2.6, p.z + Math.cos(a) * (p.r - 3));
      group.add(lamp);
    }
  }

  // Towns: instanced houses with lit windows near every pad.
  const houseGeo = new THREE.BoxGeometry(16, 10, 13);
  const houseMat = new THREE.MeshStandardMaterial({ color: 0xb8a888, roughness: 0.85 });
  const houses = new THREE.InstancedMesh(houseGeo, houseMat, 240);
  const winMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffb45e, emissiveIntensity: timeId === 'night' ? 2.2 : 0.25 });
  const wins = new THREE.InstancedMesh(new THREE.BoxGeometry(16.6, 3.4, 13.6), winMat, 240);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s1 = V3(1, 1, 1);
  let hi = 0;
  for (const p of PADS) {
    for (let i = 0; i < 40 && hi < 240; i++) {
      const a = (i / 40) * Math.PI * 2 + (hi % 5) * 0.35;
      const d = 95 + (i % 4) * 42 + (hi % 3) * 17;
      const x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
      const y = heightAt(x, z);
      if (y < 3) continue;
      e.set(0, a + 0.4, 0); q.setFromEuler(e);
      const sc = 0.8 + ((hi * 37) % 10) / 14;
      m4.compose(V3(x, y + 5 * sc, z), q, V3(sc, sc * (1 + ((hi * 13) % 7) / 9), sc));
      houses.setMatrixAt(hi, m4); wins.setMatrixAt(hi, m4);
      hi++;
    }
  }
  houses.count = wins.count = hi;
  houses.castShadow = true;
  group.add(houses); group.add(wins);

  // Trees across the Calm.
  const treeGeo = new THREE.ConeGeometry(7, 22, 6);
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x2e5d33, roughness: 0.9 });
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, 1100);
  let ti = 0;
  for (let i = 0; i < 5200 && ti < 1100; i++) {
    const x = Math.sin(i * 127.1) * 5900, z = 900 + ((i * 311.7) % 4200);
    const y = heightAt(x, z);
    if (y < 4 || y > 260) continue;
    if (PADS.some(p => Math.hypot(x - p.x, z - p.z) < 130)) continue;
    m4.compose(V3(x, y + 10, z), q.identity(), V3(1, 0.8 + ((i * 7) % 10) / 12, 1));
    trees.setMatrixAt(ti++, m4);
  }
  trees.count = ti;
  group.add(trees);

  // Landmarks: mirror array, the Spine stump, Weeping Spire, wreck.
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xdfe9f2, roughness: 0.12, metalness: 0.9 });
  for (let i = 0; i < 12; i++) {
    const mir = new THREE.Mesh(new THREE.PlaneGeometry(46, 30), mirrorMat);
    const x = -3050 + (i % 4) * 110, z = 2980 + Math.floor(i / 4) * 90;
    mir.position.set(x, heightAt(x, z) + 16, z);
    mir.rotation.set(-0.7, 0.4, 0);
    group.add(mir);
  }
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(9, 16, 330, 10),
    new THREE.MeshStandardMaterial({ color: 0x9aa2ab, roughness: 0.4, metalness: 0.6 }));
  spine.position.set(-2150, heightAt(-2150, 2150) + 165, 2150); spine.castShadow = true;
  group.add(spine);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(120, 300, 7),
    new THREE.MeshStandardMaterial({ color: 0x5d564e, roughness: 0.95, flatShading: true }));
  spire.position.set(1800, heightAt(1800, 100) + 60, 100); spire.castShadow = true;
  group.add(spire);
  const wreckMat = new THREE.MeshStandardMaterial({ color: 0x4a3f38, roughness: 0.8, metalness: 0.4 });
  const wreck = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(90, 16, 22), wreckMat);
  hull.rotation.z = 0.5; hull.rotation.y = 0.7; wreck.add(hull);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 60, 6), wreckMat);
  mast.position.set(10, 26, 0); mast.rotation.z = 0.4; wreck.add(mast);
  wreck.position.set(3950, 2, -950);
  group.add(wreck);
  // Shear Wall: a translucent cloud cliff in the Transition.
  const wall = new THREE.Mesh(new THREE.BoxGeometry(1900, 420, 90),
    new THREE.MeshStandardMaterial({ color: 0xcfd6de, transparent: true, opacity: 0.34, roughness: 1 }));
  wall.position.set(3300, heightAt(3300, -200) + 210, -200);
  group.add(wall);

  // Wind turbines near Mire's Edge.
  const rotors = [];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const x = -1250 + i * 130, z = 2650 + (i % 2) * 120;
    const y = heightAt(x, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.6, 64, 7), poleMat);
    pole.position.set(x, y + 32, z); group.add(pole);
    const rotor = new THREE.Group();
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.6, 26, 0.5), poleMat);
      blade.position.y = 13;
      const holder = new THREE.Group();
      holder.rotation.z = (b / 3) * Math.PI * 2;
      holder.add(blade); rotor.add(holder);
    }
    rotor.position.set(x, y + 64, z + 3);
    group.add(rotor); rotors.push(rotor);
  }

  // Clouds: instanced puffs; calm streets low, Roar towers tall and dark.
  const puffGeo = new THREE.IcosahedronGeometry(60, 1);
  const puffMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f6, roughness: 1, flatShading: true, transparent: true, opacity: 0.92 });
  const puffs = new THREE.InstancedMesh(puffGeo, puffMat, 420);
  const puffData = [];
  let pi = 0;
  const putPuff = (x, y, z, s, dark) => {
    if (pi >= 420) return;
    m4.compose(V3(x, y, z), q.identity(), V3(s * 1.7, s * 0.55, s));
    puffs.setMatrixAt(pi, m4);
    puffs.setColorAt(pi, dark ? new THREE.Color(0x4a4258) : new THREE.Color(0xffffff));
    puffData.push({ x, y, z, s });
    pi++;
  };
  for (let i = 0; i < 130; i++) {
    const x = Math.sin(i * 57.3) * 5800, z = ((i * 197.3) % 9000) - 5200;
    putPuff(x, 560 + (i % 5) * 60, z, 60 + (i % 7) * 16, z < -600);
  }
  for (const c of STORM_CELLS) {
    for (let k = 0; k < 26; k++) {
      const a = k * 2.4, d = (k % 5) * (c.r / 6);
      putPuff(c.x + Math.sin(a) * d, 300 + (k % 6) * 130, c.z + Math.cos(a) * d, 90 + (k % 4) * 30, true);
    }
  }
  puffs.count = pi;
  group.add(puffs);

  // The Eye wall: a ring of dark towers that rotates.
  const eyeWall = new THREE.Group();
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x39334a, roughness: 1, flatShading: true });
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const tower = new THREE.Mesh(new THREE.ConeGeometry(190, 900, 6), eyeMat);
    tower.position.set(Math.sin(a) * 590, 420, Math.cos(a) * 590);
    eyeWall.add(tower);
  }
  eyeWall.position.set(0, 0, -4300);
  group.add(eyeWall);

  // Aurora ribbons (night only, opacity driven by setTimeOfDay).
  const auroraMat = new THREE.MeshBasicMaterial({ color: 0x51ff9e, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false });
  const aurora = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(new THREE.PlaneGeometry(5200, 260, 24, 1), auroraMat);
    rib.position.set(-800 + i * 500, 1250 + i * 90, -3900 - i * 260);
    rib.rotation.y = 0.35 + i * 0.12;
    aurora.add(rib);
  }
  group.add(aurora);

  // Lightning rig: bolt line segments + a flash light.
  const boltMat = new THREE.LineBasicMaterial({ color: 0xd8f4ff, transparent: true, opacity: 0 });
  const boltGeo = new THREE.BufferGeometry();
  boltGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 14), 3));
  const bolt = new THREE.Line(boltGeo, boltMat);
  bolt.frustumCulled = false;
  group.add(bolt);
  const flash = new THREE.PointLight(0xbfe0ff, 0, 2600);
  group.add(flash);
  let flashT = 0;

  // Hail/rain particles around the camera.
  const pCount = 500;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xcfe4ff, size: 2.2, transparent: true, opacity: 0 }));
  particles.frustumCulled = false;
  group.add(particles);

  return {
    setTimeOfDay(id) {
      const t = TIMES[id] ?? TIMES.day;
      sky.material.uniforms.top.value.set(t.sky);
      sky.material.uniforms.bot.value.set(t.fog);
      sun.color.set(t.sun); sun.intensity = t.sunI;
      scene.fog.color.set(t.fog); scene.fog.near = t.fogNear; scene.fog.far = t.fogFar;
      auroraMat.opacity = id === 'night' ? 0.16 : 0;
    },
    flashAt(x, z, strength = 1) {
      const y0 = 480, pts = boltGeo.attributes.position.array;
      let px = x, pz = z, py = y0;
      for (let i = 0; i < 14; i++) {
        pts[i * 3] = px; pts[i * 3 + 1] = py; pts[i * 3 + 2] = pz;
        py = y0 * (1 - (i + 1) / 14);
        px += (Math.sin(i * 37.7 + x) * 26) * (i < 13 ? 1 : 0);
        pz += (Math.cos(i * 51.3 + z) * 26) * (i < 13 ? 1 : 0);
      }
      boltGeo.attributes.position.needsUpdate = true;
      boltMat.opacity = 0.95;
      flash.position.set(x, 300, z);
      flash.intensity = 900 * strength;
      flashT = 0.14;
    },
    update(dt, t, planePos, charge) {
      eyeWall.rotation.y += dt * 0.05;
      for (const r of rotors) r.rotation.z += dt * 0.9;
      if (flashT > 0) { flashT -= dt; if (flashT <= 0) { flash.intensity = 0; boltMat.opacity = 0; } }
      // Particles: streaks around the plane, denser inside charged air.
      const mat = particles.material;
      mat.opacity = charge > 0.12 ? Math.min(0.75, charge) : 0;
      if (mat.opacity > 0) {
        for (let i = 0; i < pCount; i++) {
          let y = pPos[i * 3 + 1] - dt * 340;
          if (y < planePos.y - 130 || pPos[i * 3 + 1] === 0) {
            pPos[i * 3] = planePos.x + (Math.sin(i * 91.7) * 260);
            pPos[i * 3 + 1] = planePos.y + 60 + ((i * 37) % 160);
            pPos[i * 3 + 2] = planePos.z + (Math.cos(i * 57.3) * 260);
            y = pPos[i * 3 + 1];
          }
          pPos[i * 3 + 1] = y;
        }
        pGeo.attributes.position.needsUpdate = true;
      }
      // Sun shadow follows the plane.
      sun.position.set(planePos.x + 2600, 4200, planePos.z + 1500);
      sun.target.position.copy(planePos);
    },
  };
}
