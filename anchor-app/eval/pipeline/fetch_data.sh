#!/usr/bin/env bash
# Downloads the public source data for one county. Re-runnable.
# Usage: bash eval/pipeline/fetch_data.sh 06037
set -euo pipefail
COUNTY="${1:-06037}"
STATE="${COUNTY:0:2}"
cd "$(dirname "$0")/../.."
mkdir -p data/raw/census data/raw/lacity data/raw/sf

# CDC PLACES 2025 release, census tract data (GIS friendly), public domain
curl -sf "https://data.cdc.gov/resource/yjkw-uj5s.json?\$select=countyname,countyfips,tractfips,totalpopulation,totalpop18plus,bphigh_crudeprev,bphigh_crude95ci,bpmed_crudeprev,bpmed_crude95ci&countyfips=${COUNTY}&\$limit=10000" \
  -o "data/raw/places_${COUNTY}.json"

# US Census cartographic boundary tracts, 2023 vintage (matches PLACES 2025), public domain
curl -sfL "https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_${STATE}_tract_500k.zip" -o "data/raw/census/cb_2023_${STATE}_tract_500k.zip"
(cd data/raw/census && unzip -o -q "cb_2023_${STATE}_tract_500k.zip")

# City of Los Angeles active business licences: barbers, salons, nails, other personal care (CC0)
if [ "$COUNTY" = "06037" ]; then
  curl -sf "https://data.lacity.org/resource/6rrh-rzua.json?\$select=location_account,business_name,dba_name,street_address,zip_code,naics,primary_naics_description,location_start_date,location_1&\$where=naics%20in('812111','812112','812113','812190')&\$limit=50000" \
    -o data/raw/lacity/hair_businesses.json
  # All candidate venue types (and bars and liquor stores, kept only as the negative-control set)
  curl -sf "https://data.lacity.org/resource/6rrh-rzua.json?\$select=location_account,business_name,dba_name,street_address,city,zip_code,council_district,naics,primary_naics_description,location_start_date,location_1&\$where=naics%20in('812111','812112','812113','812310','713940','722511','722513','722211','722110','445110','451220','722410','445310')&\$limit=60000" \
    -o data/raw/lacity/venues.json
fi
# San Francisco Registered Business Locations (data.sf.gov g8m3-pdis, ODC Public Domain Dedication).
# Active locations only. Owner names are fetched only to spot sole traders; mailing addresses are never fetched.
if [ "$COUNTY" = "06075" ]; then
  W="location_end_date%20IS%20NULL%20AND%20dba_end_date%20IS%20NULL%20AND%20city=%27San%20Francisco%27%20AND%20self_reported_naics_code%20in('812111','812112','812113','812310','713940','722511','722513','722211','722110','445110','451220','722410','445310')"
  curl -sf "https://data.sf.gov/resource/g8m3-pdis.json?\$select=uniqueid,ownership_name,dba_name,full_business_address,city,business_zip,self_reported_naics_code,location_start_date,location&\$where=${W}&\$limit=50000"     -o data/raw/sf/venues.json
fi
echo "done: data/raw for county ${COUNTY}"
