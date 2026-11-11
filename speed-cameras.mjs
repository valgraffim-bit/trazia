export function cameraFeatures(dataset) {
  const seen = new Set();
  return { type: 'FeatureCollection', features: (dataset?.cameras || []).filter(camera => {
    if (!camera.id || seen.has(camera.id) || camera.status !== 'Operando' || !Number.isFinite(camera.lat) || !Number.isFinite(camera.lng) || camera.lat < -5.1 || camera.lat > 14.3 || camera.lng < -82.2 || camera.lng > -66.5) return false;
    seen.add(camera.id);
    return true;
  }).map(camera => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [camera.lng, camera.lat] }, properties: { ...camera } })) };
}

export function projectOnRoute(point, route) {
  const radians = Math.PI / 180;
  const scaleY = 6371000 * radians;
  const scaleX = scaleY * Math.cos(point.lat * radians);
  let walked = 0;
  let best = { distance: Infinity, progress: 0 };
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i];
    const ax = (a[0] - point.lng) * scaleX, ay = (a[1] - point.lat) * scaleY;
    const bx = (b[0] - point.lng) * scaleX, by = (b[1] - point.lat) * scaleY;
    const dx = bx - ax, dy = by - ay;
    const length = Math.hypot(dx, dy);
    const t = length ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (length * length))) : 0;
    const distance = Math.hypot(ax + t * dx, ay + t * dy);
    if (distance < best.distance) best = { distance, progress: walked + length * t };
    walked += length;
  }
  return best;
}

export function cameraAhead(user, route, cameras, announced = new Set()) {
  if (!user || !Array.isArray(route) || route.length < 2) return null;
  const progress = projectOnRoute(user, route);
  if (progress.distance > 60) return null;
  return cameras.filter(camera => camera.status === 'Operando' && !announced.has(camera.id) && Math.abs(camera.lat - user.lat) < 0.004 && Math.abs(camera.lng - user.lng) < 0.005)
    .map(camera => ({ camera, point: projectOnRoute(camera, route) }))
    .filter(({ point }) => point.distance <= 40 && point.progress >= progress.progress + 15 && point.progress <= progress.progress + 350)
    .sort((a, b) => a.point.progress - b.point.progress)[0]?.camera || null;
}
