// The physical props of a sortie: array pylons that rise when deployed,
// black-box beacons, sensor gate rings, survey beams, the anomaly's swirling
// plasma ball and its paint ring, spear anchors in the Eye. Rebuilt per
// sortie; the anomaly and the rings animate every frame.

import * as THREE from 'three';
import { heightAt } from './data/zones.js';

export function createProps(scene) {
  let group = null, anomalyMesh = null, ringMesh = null, key = '';
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x37e0ff, transparent: true, opacity: 0.3, depthWrite: false });

  function build(sortie) {
    if (group) { scene.remove(group); group = null; }
    anomalyMesh = null; ringMesh = null;
    if (!sortie) return;
    group = new THREE.Group();
    const c = sortie.contract;
    const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); group.add(mesh); return mesh; };
    if (sortie.props.kind === 'nodes') {
      for (const n of sortie.props.items) {
        const pylon = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 26, 6),
          new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.5, metalness: 0.5, emissive: 0x37e0ff, emissiveIntensity: 0.15 }));
        add(pylon, n.x, heightAt(n.x, n.z) + 13, n.z);
        pylon.userData.node = n;
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 130, 10, 1, true), beamMat);
        add(beam, n.x, heightAt(n.x, n.z) + 65, n.z);
      }
    } else if (sortie.props.kind === 'boxes') {
      for (const b of sortie.props.items) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3, 4.5),
          new THREE.MeshStandardMaterial({ color: b.core ? 0xffb03a : 0x2c2f33, emissive: b.core ? 0xff8c1a : 0xff5533, emissiveIntensity: 1.2 }));
        add(crate, b.x, b.y + 2, b.z);
        crate.userData.node = b;
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 110, 8, 1, true), beamMat);
        add(beam, b.x, b.y + 55, b.z);
      }
    } else if (sortie.props.kind === 'gates') {
      for (const g of sortie.props.items) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(34, 2.4, 8, 28),
          new THREE.MeshStandardMaterial({ color: 0x39424a, emissive: 0xffc861, emissiveIntensity: 0.9 }));
        add(ring, g.x, g.y, g.z);
        ring.rotation.y = Math.PI / 2;
      }
    } else if (sortie.props.kind === 'points' || sortie.props.kind === 'anchors') {
      for (const p of sortie.props.items) {
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 190, 10, 1, true),
          new THREE.MeshBasicMaterial({ color: sortie.props.kind === 'anchors' ? 0xffc861 : 0x37e0ff, transparent: true, opacity: 0.3, depthWrite: false }));
        add(beam, p.x, heightAt(p.x, p.z) + 95, p.z);
        beam.userData.node = p;
      }
    } else if (sortie.props.kind === 'site') {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 240, 10, 1, true), beamMat);
      add(beam, c.site.x, heightAt(c.site.x, c.site.z) + 120, c.site.z);
    }
    if (c.type === 'contain') {
      anomalyMesh = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(16, 18, 14),
        new THREE.MeshStandardMaterial({ color: 0x1a0f2e, emissive: 0x9a4dff, emissiveIntensity: 1.6, roughness: 0.3 }));
      anomalyMesh.add(core);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(23, 18, 14),
        new THREE.MeshBasicMaterial({ color: 0xb47fff, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
      anomalyMesh.add(shell);
      ringMesh = new THREE.Mesh(new THREE.TorusGeometry(150, 1.8, 6, 48),
        new THREE.MeshBasicMaterial({ color: 0x37e0ff, transparent: true, opacity: 0.55 }));
      ringMesh.rotation.x = Math.PI / 2;
      anomalyMesh.add(ringMesh);
      group.add(anomalyMesh);
      for (const e of (sortie.echoes ?? [])) { /* echoes appear mid-sortie; drawn in update via sortie state */ }
    }
    scene.add(group);
  }

  return {
    set(sortie) {
      const k = sortie ? sortie.contract.id : '';
      if (k !== key) { key = k; build(sortie); }
      this._sortie = sortie;
    },
    update(dt, t) {
      const s = this._sortie;
      if (!group || !s) return;
      // Deployed/done props change material: handled by userData scan.
      for (const child of group.children) {
        const n = child.userData && child.userData.node;
        if (n && child.material && child.material.emissive) {
          child.material.emissiveIntensity = n.done ? 1.8 : 0.35 + 0.2 * Math.sin(t * 3);
        }
      }
      if (anomalyMesh && s.anomaly) {
        const a = s.anomaly;
        anomalyMesh.position.set(a.x, heightAt(a.x, a.z) + 170 + Math.sin(t * 0.8) * 12, a.z);
        anomalyMesh.rotation.y += dt * 0.7;
        const painted = s.contract.paintSec ? s.paint / s.contract.paintSec : 0;
        anomalyMesh.scale.setScalar(1 - painted * 0.45);
        if (ringMesh) ringMesh.rotation.z += dt * 0.4;
        // Echoes: small plasma balls at their positions.
        for (const e of (s.echoes ?? [])) {
          if (!e._mesh) {
            e._mesh = new THREE.Mesh(new THREE.SphereGeometry(9, 12, 10),
              new THREE.MeshStandardMaterial({ color: 0x1a0f2e, emissive: 0xff4dd2, emissiveIntensity: 1.4 }));
            group.add(e._mesh);
          }
          e._mesh.visible = !e.done;
          e._mesh.position.set(e.x, heightAt(e.x, e.z) + 170 + Math.sin(t * 1.1 + e.x) * 9, e.z);
        }
      }
    },
  };
}
