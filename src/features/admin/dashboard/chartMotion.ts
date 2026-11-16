/** A fixed SVG topology lets Motion interpolate 7-day and 30-day curves without restarting them. */
export function trendPath(values: number[], width = 120, height = 32, samples = 48) {
  if (!values.length) return { line: "", area: "" };
  const clean = values.map((value) => Number.isFinite(value) ? value : 0);
  const min = Math.min(0, ...clean);
  const max = Math.max(0, ...clean);
  const span = max - min || 1;
  const points = Array.from({ length: samples }, (_, index) => {
    const position = index / (samples - 1) * (clean.length - 1);
    const left = Math.floor(position);
    const value = clean[left] + (clean[Math.min(clean.length - 1, left + 1)] - clean[left]) * (position - left);
    return [index / (samples - 1) * width, height - 2 - (value - min) / span * (height - 4)];
  });
  const line = points.map(([x, y], index) => {
    if (!index) return `M${x.toFixed(2)},${y.toFixed(2)}`;
    const [x0, y0] = points[Math.max(0, index - 2)];
    const [x1, y1] = points[index - 1];
    const [x3, y3] = points[Math.min(points.length - 1, index + 1)];
    const bound = (value: number) => Math.min(height, Math.max(0, value)).toFixed(2);
    return `C${(x1 + (x - x0) / 6).toFixed(2)},${bound(y1 + (y - y0) / 6)} ${(x - (x3 - x1) / 6).toFixed(2)},${bound(y - (y3 - y1) / 6)} ${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return { line, area: `${line} L${width},${height} L0,${height} Z` };
}

export const chartTransition = { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const };

export function bucketCounts(points: Array<{ label: string; value: number | undefined }>, limit = 30) {
  const size = Math.max(1, Math.ceil(points.length / limit));
  return Array.from({ length: Math.ceil(points.length / size) }, (_, index) => {
    const group = points.slice(index * size, (index + 1) * size);
    return {
      label: group.length === 1 ? group[0].label : `${group[0].label} – ${group[group.length - 1].label}`,
      value: group.every((point) => point.value !== undefined && Number.isFinite(point.value))
        ? group.reduce((sum, point) => sum + point.value!, 0) : undefined,
    };
  });
}
