import { Rng, hashString } from './rng';
import type { Planet } from '@/sim/planet';
import type { PlanetProfile } from '@/sim/planetProfile';

export interface PlanetaryClimate {
  cloudCover: number; // 0 to 1
  humidity: number; // 0 to 1
  precipitationRate: number; // 0 to 1
  precipitationType: 'none' | 'rain' | 'snow' | 'acid_rain' | 'methane_rain';
  windSpeedKmh: number; // km/h
  windPattern: 'calm' | 'trade_winds' | 'jet_streams' | 'superrotation' | 'cyclonic_storms';
  temperatureRange: { min: number; max: number }; // Kelvin
  seasonalDeltaK: number; // Kelvin seasonal fluctuation
}

export function generatePlanetaryClimate(
  planet: Planet,
  profile: PlanetProfile,
  simTimeSeconds: number = 0
): PlanetaryClimate {
  const seed = hashString(planet.id);
  const rng = new Rng(seed ^ 0x434c494d); // 'CLIM'

  const tempK = profile.surfaceTemp;
  const press = profile.atmosphere.pressure;
  const water = profile.waterCoverage;

  // Cloud & Humidity dynamics
  let humidity = 0;
  if (press > 0.05) {
    humidity = Math.min(1, (water * 0.7 + (tempK > 270 && tempK < 350 ? 0.3 : 0.1)) * Math.min(2, press));
  }
  const cloudCover = Math.min(1, humidity * (press > 0.2 ? 1.1 : 0.5) * rng.float(0.8, 1.2));

  // Precipitation
  let precipitationRate = 0;
  let precipitationType: PlanetaryClimate['precipitationType'] = 'none';

  if (cloudCover > 0.25 && press > 0.1) {
    precipitationRate = Number((cloudCover * rng.float(0.4, 0.95)).toFixed(2));
    if (water > 0.1 || tempK > 250) {
      if (tempK < 273) {
        precipitationType = 'snow';
      } else if (tempK <= 373) {
        precipitationType = 'rain';
      } else {
        precipitationType = 'acid_rain';
      }
    } else if (tempK < 112 && tempK > 90) {
      precipitationType = 'methane_rain';
    }
  }

  // Wind & Atmospheric circulation
  // Fast rotation + thick atmosphere = superrotation / jet streams
  let windSpeedKmh = Math.round(
    (15 + (1 / Math.max(1, profile.rotationHours)) * 120 + press * 30) * rng.float(0.7, 1.4)
  );
  if (profile.tidallyLocked) {
    windSpeedKmh = Math.round(windSpeedKmh * 2.2); // Violent day/night side thermal gradient winds
  }

  let windPattern: PlanetaryClimate['windPattern'] = 'trade_winds';
  if (press < 0.02) {
    windPattern = 'calm';
    windSpeedKmh = Math.min(5, windSpeedKmh);
  } else if (profile.tidallyLocked) {
    windPattern = 'cyclonic_storms';
  } else if (press > 10 || profile.rotationHours < 12) {
    windPattern = 'superrotation';
  } else if (windSpeedKmh > 100) {
    windPattern = 'jet_streams';
  }

  // Seasonal thermal fluctuations (derived from axial tilt & orbital position)
  const orbitProgress = (simTimeSeconds / Math.max(1, planet.period)) * Math.PI * 2;
  const seasonalDeltaK = Number((profile.axialTilt * 0.8 + (1 - press) * 15).toFixed(1));
  const tempOffset = Math.sin(orbitProgress) * (seasonalDeltaK / 2);

  const min = Math.round(tempK - seasonalDeltaK / 2 + Math.min(0, tempOffset));
  const max = Math.round(tempK + seasonalDeltaK / 2 + Math.max(0, tempOffset));

  return {
    cloudCover: Number(cloudCover.toFixed(2)),
    humidity: Number(humidity.toFixed(2)),
    precipitationRate,
    precipitationType,
    windSpeedKmh,
    windPattern,
    temperatureRange: { min, max },
    seasonalDeltaK,
  };
}
