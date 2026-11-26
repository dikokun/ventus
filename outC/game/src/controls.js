// Keyboard controls. Pitch/roll are held-stick values; throttle is a target the
// pilot walks up and down with Q/E (X cuts it, Z slams it). Space is contextual:
// brake on the ground, arc cannon in the air. V vents the capacitor, B drops
// ballast (latched, one decision), C changes camera.

export function createControls() {
  const held = new Set();
  const latched = new Set();
  let throttle = 0;
  const down = (e) => {
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    if (!held.has(e.code)) latched.add(e.code);
    held.add(e.code);
    if (e.code === 'KeyX') throttle = 0;
    if (e.code === 'KeyZ') throttle = 1;
  };
  const up = (e) => held.delete(e.code);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);

  return {
    sample(dt) {
      if (held.has('KeyE')) throttle = Math.min(1, throttle + dt * 0.55);
      if (held.has('KeyQ')) throttle = Math.max(0, throttle - dt * 0.55);
      const pitch = (held.has('ArrowDown') || held.has('KeyS') ? 1 : 0) - (held.has('ArrowUp') || held.has('KeyW') ? 1 : 0);
      const roll = (held.has('ArrowRight') || held.has('KeyD') ? 1 : 0) - (held.has('ArrowLeft') || held.has('KeyA') ? 1 : 0);
      const out = {
        pitch, roll, throttle,
        brake: held.has('Space'),
        firing: held.has('Space'),
        vent: held.has('KeyV'),
        ballastPressed: latched.has('KeyB'),
        cameraPressed: latched.has('KeyC'),
      };
      latched.clear();
      return out;
    },
    setThrottle(v) { throttle = v; },
    dispose() { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); },
  };
}
