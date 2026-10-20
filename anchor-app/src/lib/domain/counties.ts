/**
 * Counties Anchor has data for. Need data (CDC PLACES) exists for every US
 * county; what limits coverage is an open business register for the
 * barbershop and salon half of each plan. Adding a county: one entry here,
 * one source in eval/pipeline/build_venues.py, then `npm run data -- <fips>`.
 */

export const COUNTIES = {
  "06037": {
    name: "Los Angeles County, CA",
    short: "Los Angeles County",
    qlooCity: "Los Angeles",
    harnessArea: "Los Angeles, CA",
    licence: "City of Los Angeles business licence",
    dataset: "data.lacity.org 6rrh-rzua",
    licenceSource: "City of Los Angeles business licences (CC0)",
    coverageGap: "Business data comes from businesses registered with the City of Los Angeles (active licences), which covers the city and some neighbouring areas; some businesses may have closed.",
    skippedReason: "they are outside the City of Los Angeles",
  },
  "06075": {
    name: "San Francisco County, CA",
    short: "San Francisco",
    qlooCity: "San Francisco",
    harnessArea: "San Francisco, CA",
    licence: "San Francisco business registration",
    dataset: "data.sf.gov g8m3-pdis",
    licenceSource: "San Francisco Registered Business Locations (ODC public domain)",
    coverageGap: "Business data comes from San Francisco's register of active business locations. Industry codes are reported by each business, so a few may be filed under the wrong type; some businesses may have closed.",
    skippedReason: "no registered businesses of the right kinds are there",
  },
} as const;

export type CountyFips = keyof typeof COUNTIES;
export const COUNTY_FIPS = Object.keys(COUNTIES) as [CountyFips, ...CountyFips[]];
export const DEFAULT_COUNTY: CountyFips = "06037";

export function county(fips: string) {
  return COUNTIES[(fips in COUNTIES ? fips : DEFAULT_COUNTY) as CountyFips];
}
