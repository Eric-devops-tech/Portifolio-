const canvas = document.querySelector("#scene");
const scene = document.querySelector("#scene-wrap");
const context = canvas?.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (canvas && scene && context) {
  const points = [];
  const latitudeCount = 15;
  const pointCount = 760;
  const rotation = { x: -0.18, y: 0.15 };
  const pointer = { x: 0, y: 0, down: false, lastX: 0, lastY: 0 };
  let width = 0;
  let height = 0;
  let radius = 0;
  let animationFrame = 0;
  let previousTime = 0;

  for (let index = 0; index < pointCount; index += 1) {
    const y = 1 - (index / (pointCount - 1)) * 2;
    const ringRadius = Math.sqrt(1 - y * y);
    const angle = Math.PI * (3 - Math.sqrt(5)) * index;
    points.push({
      x: Math.cos(angle) * ringRadius,
      y,
      z: Math.sin(angle) * ringRadius,
      size: 0.5 + ((index * 17) % 10) / 18,
    });
  }

  function resize() {
    const bounds = scene.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    width = bounds.width;
    height = bounds.height;
    radius = Math.min(width, height) * 0.335;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function rotatePoint(point) {
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);
    const turnedX = point.x * cosY - point.z * sinY;
    const turnedZ = point.x * sinY + point.z * cosY;
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    return {
      x: turnedX,
      y: point.y * cosX - turnedZ * sinX,
      z: point.y * sinX + turnedZ * cosX,
    };
  }

  function project(point) {
    const perspective = 3.2 / (3.2 - point.z * 0.72);
    return {
      x: width * 0.5 + point.x * radius * perspective,
      y: height * 0.48 + point.y * radius * perspective,
      z: point.z,
      scale: perspective,
    };
  }

  function drawWireframe() {
    const longitudeCount = 12;
    const segments = 64;
    context.lineWidth = 0.7;

    for (let longitude = 0; longitude < longitudeCount; longitude += 1) {
      const meridian = [];
      const angle = (longitude / longitudeCount) * Math.PI;
      for (let segment = 0; segment <= segments; segment += 1) {
        const latitude = -Math.PI / 2 + (segment / segments) * Math.PI;
        meridian.push(rotatePoint({
          x: Math.cos(latitude) * Math.cos(angle),
          y: Math.sin(latitude),
          z: Math.cos(latitude) * Math.sin(angle),
        }));
      }
      strokeCurve(meridian, 0.27);
    }

    for (let latitudeIndex = 1; latitudeIndex < latitudeCount; latitudeIndex += 1) {
      const latitude = -Math.PI / 2 + (latitudeIndex / latitudeCount) * Math.PI;
      const ring = [];
      for (let segment = 0; segment <= segments; segment += 1) {
        const angle = (segment / segments) * Math.PI * 2;
        ring.push(rotatePoint({
          x: Math.cos(latitude) * Math.cos(angle),
          y: Math.sin(latitude),
          z: Math.cos(latitude) * Math.sin(angle),
        }));
      }
      strokeCurve(ring, 0.19);
    }
  }

  function strokeCurve(curve, opacity) {
    context.beginPath();
    let started = false;
    for (const point of curve) {
      const screen = project(point);
      if (!started) {
        context.moveTo(screen.x, screen.y);
        started = true;
      } else {
        context.lineTo(screen.x, screen.y);
      }
    }
    context.strokeStyle = `rgba(72, 103, 84, ${opacity})`;
    context.stroke();
  }

  function draw(time) {
    animationFrame = window.requestAnimationFrame(draw);
    const elapsed = previousTime ? Math.min(time - previousTime, 40) : 16;
    previousTime = time;
    const seconds = elapsed / 1000;
    if (!pointer.down && !reducedMotion.matches) rotation.y += seconds * 0.16;
    rotation.y += (pointer.x * 0.24 - rotation.y * 0.02) * seconds;
    rotation.x += (-pointer.y * 0.14 - rotation.x * 0.02) * seconds;

    context.clearRect(0, 0, width, height);
    const glow = context.createRadialGradient(width * 0.5, height * 0.48, radius * 0.05, width * 0.5, height * 0.48, radius * 1.45);
    glow.addColorStop(0, "rgba(239, 96, 59, 0.15)");
    glow.addColorStop(1, "rgba(239, 96, 59, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    drawWireframe();
    const visiblePoints = points.map((point) => project(rotatePoint(point)));
    visiblePoints.sort((a, b) => a.z - b.z);
    for (const point of visiblePoints) {
      const frontLight = (point.z + 1) / 2;
      const alpha = 0.12 + frontLight * 0.78;
      const dotSize = point.scale * (0.55 + frontLight * 1.1);
      context.beginPath();
      context.arc(point.x, point.y, dotSize, 0, Math.PI * 2);
      context.fillStyle = `rgba(239, 96, 59, ${alpha})`;
      context.fill();
    }

    // A tilted orbit gives the sphere a second depth cue.
    context.beginPath();
    context.ellipse(width * 0.5, height * 0.48, radius * 1.38, radius * 0.43, -0.42 + rotation.y * 0.25, 0, Math.PI * 2);
    context.strokeStyle = "rgba(239, 96, 59, 0.32)";
    context.lineWidth = 1;
    context.stroke();

    const markerAngle = time * 0.00045 + rotation.y;
    const markerX = width * 0.5 + Math.cos(markerAngle) * radius * 1.38;
    const markerY = height * 0.48 + Math.sin(markerAngle) * radius * 0.43;
    context.beginPath();
    context.arc(markerX, markerY, 3.2, 0, Math.PI * 2);
    context.fillStyle = "#ef603b";
    context.fill();
  }

  scene.addEventListener("pointermove", (event) => {
    const bounds = scene.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    pointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    if (pointer.down) {
      rotation.y += (event.clientX - pointer.lastX) * 0.008;
      rotation.x += (event.clientY - pointer.lastY) * 0.008;
      pointer.lastX = event.clientX;
      pointer.lastY = event.clientY;
    }
  });

  scene.addEventListener("pointerdown", (event) => {
    pointer.down = true;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    scene.setPointerCapture(event.pointerId);
  });
  scene.addEventListener("pointerup", () => { pointer.down = false; });
  scene.addEventListener("pointercancel", () => { pointer.down = false; });
  scene.addEventListener("pointerleave", () => {
    if (!pointer.down) {
      pointer.x = 0;
      pointer.y = 0;
    }
  });
  reducedMotion.addEventListener?.("change", () => {
    if (reducedMotion.matches) {
      rotation.y = 0.15;
      rotation.x = -0.18;
    }
  });

  new ResizeObserver(resize).observe(scene);
  resize();
  animationFrame = window.requestAnimationFrame(draw);
  window.addEventListener("pagehide", () => window.cancelAnimationFrame(animationFrame), { once: true });
}
