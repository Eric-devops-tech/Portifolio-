const canvas = document.querySelector("#scene");
const context = canvas?.getContext("2d");

function drawScene() {
  if (!canvas || !context) return;
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = bounds.width * ratio;
  canvas.height = bounds.height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);

  const centerX = bounds.width * 0.51;
  const centerY = bounds.height * 0.48;
  const radius = Math.min(bounds.width, bounds.height) * 0.31;
  const points = [];
  const count = 420;

  for (let index = 0; index < count; index += 1) {
    const y = 1 - (index / (count - 1)) * 2;
    const ringRadius = Math.sqrt(1 - y * y);
    const angle = Math.PI * (3 - Math.sqrt(5)) * index;
    const depth = Math.sin(angle) * ringRadius;
    points.push({
      x: centerX + Math.cos(angle) * ringRadius * radius,
      y: centerY + y * radius,
      depth,
    });
  }

  points.sort((a, b) => a.depth - b.depth);
  for (const point of points) {
    const front = (point.depth + 1) / 2;
    context.beginPath();
    context.arc(point.x, point.y, 0.7 + front * 1.2, 0, Math.PI * 2);
    context.fillStyle = `rgba(238, 96, 59, ${0.12 + front * 0.7})`;
    context.fill();
  }
}

window.addEventListener("resize", drawScene);
drawScene();
