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

export function zoomAboutPoint(
  view: CameraView,
  nextZoom: number,
  anchorX: number,
  anchorY: number,
  minZoom: number,
  maxZoom: number
): CameraView {
  const zoom = clamp(nextZoom, minZoom, maxZoom);
  return {
    zoom,
    panX: anchorX - ((anchorX - view.panX) / view.zoom) * zoom,
    panY: anchorY - ((anchorY - view.panY) / view.zoom) * zoom
  };
}

export function interpolateCameraView(
  from: CameraView,
  to: CameraView,
  progress: number,
  viewportWidth: number,
  viewportHeight: number
): CameraView {
  if (progress <= 0) return { ...from };
  if (progress >= 1) return { ...to };

  const zoom = Math.exp(lerp(Math.log(from.zoom), Math.log(to.zoom), progress));
  const fromCenter = worldCenter(from, viewportWidth, viewportHeight);
  const toCenter = worldCenter(to, viewportWidth, viewportHeight);
  const centerX = lerp(fromCenter.x, toCenter.x, progress);
  const centerY = lerp(fromCenter.y, toCenter.y, progress);

  return {
    zoom,
    panX: viewportWidth / 2 - centerX * zoom,
    panY: viewportHeight / 2 - centerY * zoom
  };
}

export function cameraForResize(
  view: CameraView,
  previousWidth: number,
  previousHeight: number,
  nextWidth: number,
  nextHeight: number
): CameraView {
  const center = worldCenter(view, previousWidth, previousHeight);
  return {
    zoom: view.zoom,
    panX: nextWidth / 2 - center.x * view.zoom,
    panY: nextHeight / 2 - center.y * view.zoom
  };
}

export function detailVisibilityForZoom(
  currentlyVisible: boolean,
  zoom: number,
  fadeInZoom: number,
  fadeOutZoom: number
): boolean {
  if (currentlyVisible) return zoom > fadeOutZoom;
  return zoom >= fadeInZoom;
}

export function easeOutCubic(progress: number): number {
  const bounded = clamp(progress, 0, 1);
  return 1 - (1 - bounded) ** 3;
}

function worldCenter(view: CameraView, viewportWidth: number, viewportHeight: number): { x: number; y: number } {
  return {
    x: (viewportWidth / 2 - view.panX) / view.zoom,
    y: (viewportHeight / 2 - view.panY) / view.zoom
  };
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
