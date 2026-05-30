/**
 * Curated catalogue of NASA GIBS layers for the interactive map viewer.
 *
 * GIBS WMTS REST endpoint pattern (EPSG:4326, KVP-style):
 *   https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/<layer>/default/<date>/<tilematrixset>/{z}/{y}/{x}.<ext>
 *
 * We pick layers that look great on a map AND have value for UAP-context
 * investigation: true-color, infrared / thermal, fires, lightning,
 * night-lights, sea surface temperature, snow cover, vegetation indices,
 * cloud top temperature, sulfur dioxide (volcanic / industrial), aerosols,
 * water vapor, geocolor (geostationary).
 *
 * `tilematrixset` and image format vary per layer — see the metadata at
 * https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities
 */

export interface GibsLayer {
  /** stable id we use in URL state */
  id: string;
  /** GIBS layer identifier */
  layer: string;
  /** human display name */
  name: string;
  /** group label (for the picker) */
  group: "True color" | "Night" | "Geostationary" | "Fire & smoke" | "Thermal & IR" | "Atmosphere" | "Ocean" | "Land" | "Reference" | "Cryosphere";
  /** WMTS tile matrix set id */
  matrixSet: string;
  /** tile file extension (jpg or png) */
  ext: "jpeg" | "png";
  /** how often it updates */
  cadence: "daily" | "10min" | "twice-daily" | "monthly" | "static";
  /** resolution at native zoom */
  resolution_m?: number;
  /** short caption */
  blurb: string;
}

// Catalogue
export const GIBS_LAYERS: GibsLayer[] = [
  // -- True color (daily) --
  { id: "viirs-noaa20-tc", layer: "VIIRS_NOAA20_CorrectedReflectance_TrueColor", name: "VIIRS NOAA-20 · True Color", group: "True color", matrixSet: "250m", ext: "jpeg", cadence: "daily", resolution_m: 250, blurb: "Daily global mosaic from NOAA-20." },
  { id: "viirs-snpp-tc",   layer: "VIIRS_SNPP_CorrectedReflectance_TrueColor",   name: "VIIRS Suomi NPP · True Color", group: "True color", matrixSet: "250m", ext: "jpeg", cadence: "daily", resolution_m: 250, blurb: "Daily global mosaic from Suomi NPP." },
  { id: "modis-terra-tc",  layer: "MODIS_Terra_CorrectedReflectance_TrueColor",  name: "MODIS Terra · True Color", group: "True color", matrixSet: "250m", ext: "jpeg", cadence: "daily", resolution_m: 250, blurb: "Morning overpass." },
  { id: "modis-aqua-tc",   layer: "MODIS_Aqua_CorrectedReflectance_TrueColor",   name: "MODIS Aqua · True Color", group: "True color", matrixSet: "250m", ext: "jpeg", cadence: "daily", resolution_m: 250, blurb: "Afternoon overpass." },
  // -- False color --
  { id: "viirs-noaa20-fc721", layer: "VIIRS_NOAA20_CorrectedReflectance_BandsM11-I2-I1", name: "VIIRS NOAA-20 · Bands M11-I2-I1 (Fires)", group: "True color", matrixSet: "250m", ext: "jpeg", cadence: "daily", resolution_m: 375, blurb: "False-color band combo that highlights active fire and burn scars." },
  { id: "modis-terra-fc721",  layer: "MODIS_Terra_CorrectedReflectance_Bands721",       name: "MODIS Terra · Bands 7-2-1", group: "True color", matrixSet: "250m", ext: "jpeg", cadence: "daily", resolution_m: 250, blurb: "False color — soils/burns red, vegetation green, water dark." },

  // -- Night & lights --
  { id: "viirs-noaa20-dnb", layer: "VIIRS_NOAA20_DayNightBand_ENCC", name: "VIIRS NOAA-20 · Day/Night Band", group: "Night", matrixSet: "500m", ext: "png",  cadence: "daily", resolution_m: 750, blurb: "City lights, gas flares, fires, ship lights." },
  { id: "viirs-snpp-dnb",   layer: "VIIRS_SNPP_DayNightBand_ENCC",   name: "VIIRS Suomi NPP · Day/Night Band", group: "Night", matrixSet: "500m", ext: "png", cadence: "daily", resolution_m: 750, blurb: "City lights at night." },
  { id: "earth-at-night",   layer: "VIIRS_Black_Marble",             name: "VIIRS · Black Marble (composite)", group: "Night", matrixSet: "500m", ext: "png", cadence: "static", resolution_m: 500, blurb: "Cloud-free night-lights composite." },

  // -- Geostationary (GOES + Himawari) --
  { id: "goes-east-geo", layer: "GOES-East_ABI_GeoColor",       name: "GOES-East · GeoColor", group: "Geostationary", matrixSet: "2km", ext: "png", cadence: "10min", resolution_m: 1000, blurb: "Americas full-disc true-color composite, ~10-minute cadence." },
  { id: "goes-west-geo", layer: "GOES-West_ABI_GeoColor",       name: "GOES-West · GeoColor", group: "Geostationary", matrixSet: "2km", ext: "png", cadence: "10min", resolution_m: 1000, blurb: "Pacific full-disc true-color, ~10-minute cadence." },
  { id: "himawari-geo",  layer: "Himawari_AHI_True_Color",      name: "Himawari · True Color", group: "Geostationary", matrixSet: "2km", ext: "png", cadence: "10min", resolution_m: 2000, blurb: "Japan/Asia/Pacific geostationary, ~10-minute cadence." },

  // -- Fire & smoke --
  { id: "fires-viirs-noaa20",  layer: "VIIRS_NOAA20_Thermal_Anomalies_375m_Day",  name: "VIIRS NOAA-20 · Active Fires (Day, 375m)", group: "Fire & smoke", matrixSet: "2km", ext: "png", cadence: "daily", resolution_m: 375, blurb: "Active-fire detections, day pass." },
  { id: "fires-viirs-snpp",    layer: "VIIRS_SNPP_Thermal_Anomalies_375m_Day",    name: "VIIRS Suomi NPP · Active Fires (Day, 375m)", group: "Fire & smoke", matrixSet: "2km", ext: "png", cadence: "daily", resolution_m: 375, blurb: "Active-fire detections." },
  { id: "fires-modis-terra",   layer: "MODIS_Terra_Thermal_Anomalies_All",        name: "MODIS Terra · Thermal Anomalies", group: "Fire & smoke", matrixSet: "2km", ext: "png", cadence: "daily", resolution_m: 1000, blurb: "Thermal hot-spots / fires." },
  { id: "fires-modis-aqua",    layer: "MODIS_Aqua_Thermal_Anomalies_All",         name: "MODIS Aqua · Thermal Anomalies", group: "Fire & smoke", matrixSet: "2km", ext: "png", cadence: "daily", resolution_m: 1000, blurb: "Thermal hot-spots / fires." },

  // -- Thermal & IR --
  { id: "ir-noaa20",  layer: "VIIRS_NOAA20_Brightness_Temp_BandI5_Day", name: "VIIRS NOAA-20 · Brightness Temp I5 (Day)", group: "Thermal & IR", matrixSet: "1km", ext: "png", cadence: "daily", resolution_m: 750, blurb: "Thermal IR — cold cloud tops bright, hot surface dark." },
  { id: "ctt-modis-aqua", layer: "MODIS_Aqua_Cloud_Top_Temp_Day", name: "MODIS Aqua · Cloud Top Temperature", group: "Thermal & IR", matrixSet: "2km", ext: "png", cadence: "daily", resolution_m: 1000, blurb: "Identifies tall convective storms." },

  // -- Atmosphere --
  { id: "wv-modis-aqua",   layer: "MODIS_Aqua_Water_Vapor_5km_Day",   name: "MODIS Aqua · Water Vapor (5 km)", group: "Atmosphere", matrixSet: "2km", ext: "png", cadence: "daily", resolution_m: 5000, blurb: "Total column water vapor." },
  { id: "so2-omi",         layer: "OMI_SO2_Lower_Troposphere",         name: "OMI · SO₂ (Lower Troposphere)", group: "Atmosphere", matrixSet: "2km", ext: "png", cadence: "daily", blurb: "Sulfur dioxide — volcanic eruptions, heavy industry." },
  { id: "aerosol-modis",   layer: "MODIS_Combined_Value_Added_AOD",   name: "MODIS · Aerosol Optical Depth", group: "Atmosphere", matrixSet: "2km", ext: "png", cadence: "daily", blurb: "Smoke + dust + pollution column." },

  // -- Ocean --
  { id: "sst-modis-aqua",   layer: "MODIS_Aqua_Sea_Surface_Temp_4km_Day", name: "MODIS Aqua · Sea Surface Temperature", group: "Ocean", matrixSet: "2km", ext: "png", cadence: "daily", resolution_m: 4000, blurb: "SST (day) — currents, eddies, upwellings." },
  { id: "chlor-a-modis",    layer: "MODIS_Aqua_Chlorophyll_A",            name: "MODIS Aqua · Chlorophyll-a", group: "Ocean", matrixSet: "2km", ext: "png", cadence: "daily", resolution_m: 4000, blurb: "Phytoplankton concentration." },

  // -- Land --
  { id: "ndvi-modis",   layer: "MODIS_Terra_NDVI_8Day", name: "MODIS Terra · NDVI (8-Day)", group: "Land", matrixSet: "1km", ext: "png", cadence: "monthly", resolution_m: 250, blurb: "Vegetation greenness." },
  { id: "lst-modis",    layer: "MODIS_Terra_Land_Surface_Temp_Day", name: "MODIS Terra · Land Surface Temp (Day)", group: "Land", matrixSet: "2km", ext: "png", cadence: "daily", resolution_m: 1000, blurb: "Daytime land skin temperature." },

  // -- Cryosphere --
  { id: "snow-modis-terra", layer: "MODIS_Terra_NDSI_Snow_Cover", name: "MODIS Terra · Snow Cover", group: "Cryosphere", matrixSet: "1km", ext: "png", cadence: "daily", resolution_m: 500, blurb: "Daily snow cover index." },
  { id: "sea-ice-amsr",     layer: "AMSRU2_Sea_Ice_Concentration_12km", name: "AMSR2 · Sea Ice Concentration", group: "Cryosphere", matrixSet: "2km", ext: "png", cadence: "daily", resolution_m: 12000, blurb: "Polar sea-ice fraction." },

  // -- Reference layers (always overlay-friendly) --
  { id: "coastlines", layer: "Coastlines_15m", name: "Coastlines (reference)", group: "Reference", matrixSet: "15.625m", ext: "png", cadence: "static", blurb: "Vector coastlines overlay." },
  { id: "borders",    layer: "Reference_Features_15m", name: "Country borders (reference)", group: "Reference", matrixSet: "15.625m", ext: "png", cadence: "static", blurb: "Country / admin borders." },
  { id: "labels",     layer: "Reference_Labels_15m", name: "Place names (reference)", group: "Reference", matrixSet: "15.625m", ext: "png", cadence: "static", blurb: "City & feature labels." },
];

// Helpers
export function getLayer(id: string): GibsLayer | undefined {
  return GIBS_LAYERS.find((l) => l.id === id);
}

export function gibsTileUrl(layer: GibsLayer, date: string): string {
  // EPSG:4326 WMTS REST
  return `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${layer.layer}/default/${date}/${layer.matrixSet}/{z}/{y}/{x}.${layer.ext}`;
}

// Default visible state on first load: VIIRS True Color base + Coastlines overlay
export const DEFAULT_BASE_LAYER = "viirs-noaa20-tc";
export const DEFAULT_OVERLAYS = ["coastlines"];

// Layer groups in display order
export const LAYER_GROUPS = [
  "True color",
  "Geostationary",
  "Night",
  "Fire & smoke",
  "Thermal & IR",
  "Atmosphere",
  "Ocean",
  "Land",
  "Cryosphere",
  "Reference",
] as const;
