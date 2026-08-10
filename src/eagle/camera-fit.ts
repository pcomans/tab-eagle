export interface WorldBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CameraView {
  zoom: number;
  panX: number;
  panY: number;
}

export function cameraForBounds(
  bounds: WorldBounds,
  viewportWidth: number,
  viewportHeight: number,
  padding: number,
  minZoom: number,
  maxZoom: number
): CameraView {
  const boundsWidth = Math.max(1, bounds.right - bounds.left);
  const boundsHeight = Math.max(1, bounds.bottom - bounds.top);
  const availableWidth = Math.max(1, viewportWidth - padding * 2);
  const availableHeight = Math.max(1, viewportHeight - padding * 2);
  const zoom = clamp(Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight), minZoom, maxZoom);
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;

  return {
    zoom,
    panX: viewportWidth / 2 - centerX * zoom,
    panY: viewportHeight / 2 - centerY * zoom
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
