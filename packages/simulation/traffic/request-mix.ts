export interface RequestMix {
  readRatio: number;
  writeRatio: number;
  heavyRatio: number;
  cacheableRatio: number; // static assets / public reads cacheable by CDN
}

export const DEFAULT_REQUEST_MIX: RequestMix = {
  readRatio: 0.75,
  writeRatio: 0.20,
  heavyRatio: 0.05,
  cacheableRatio: 0.35,
};

export interface DecomposedTraffic {
  totalRps: number;
  readRps: number;
  writeRps: number;
  heavyRps: number;
  cdnEligibleRps: number;
}

export function decomposeTraffic(
  totalRps: number,
  mix: RequestMix = DEFAULT_REQUEST_MIX
): DecomposedTraffic {
  const readRps = Math.floor(totalRps * mix.readRatio);
  const writeRps = Math.floor(totalRps * mix.writeRatio);
  const heavyRps = Math.max(0, totalRps - readRps - writeRps);
  const cdnEligibleRps = Math.floor(totalRps * mix.cacheableRatio);

  return {
    totalRps,
    readRps,
    writeRps,
    heavyRps,
    cdnEligibleRps,
  };
}
