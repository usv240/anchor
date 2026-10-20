/**
 * Landing page copy that is long enough to keep out of the component.
 * Source: anchor/UX_AND_CONTENT.md, section 4.
 */

export const FAQ: { q: string; a: string }[] = [
  { q: "Is Anchor free?", a: "Yes. It is free to use and open source under the MIT licence." },
  { q: "Do I need an account?", a: "No. The app works without signing up. Developers can create a free API key with one click." },
  {
    q: "What is Qloo?",
    a: "A company that knows what people like across music, film, food, places and more, built from large-scale anonymous data. Anchor uses it to learn which local places a group of people loves.",
  },
  {
    q: "Does Anchor use anyone's personal information?",
    a: "No. It works with neighbourhoods, age groups and venues, never individuals. It does not collect names, health records or location tracking.",
  },
  {
    q: "Why can't I target by race or ethnicity?",
    a: "Guessing race from people's tastes is unreliable and can harm communities. Need data already shows where help is needed most, so Anchor plans by neighbourhood need, age and gender.",
  },
  {
    q: "How do you know the places are real?",
    a: "Barbershops and salons come from the City of Los Angeles business licence list. Community places come from Qloo's place data, and Anchor shows which ones also match a city licence. Places that cannot be confirmed are marked clearly.",
  },
  {
    q: "Why barbershops?",
    a: "A 2018 study found that pairing barbers with pharmacists helped far more men get their blood pressure under control. Anchor also finds other kinds of trusted places, because every community is different.",
  },
  {
    q: "Can I use my own data?",
    a: "Yes. You can add your own partner list, area numbers, service area or team locations. Files are checked on your device first, and files about individual people are refused.",
  },
  {
    q: "Which places does it cover?",
    a: "Any US county, because CDC data covers every county. Our worked example is Los Angeles County, where the barbershop study took place.",
  },
  {
    q: "Can Anchor be used for other health goals?",
    a: "Yes. The same approach can plan cancer screening, vaccine or diabetes outreach. The research for those is on the Research page.",
  },
];

export type Reference = { id: number; text: string; href: string };

export const REFERENCES: Reference[] = [
  {
    id: 1,
    text: "Victor RG, Lynch K, Li N, et al. A cluster-randomized trial of blood-pressure reduction in Black barbershops. N Engl J Med. 2018;378(14):1291-1301.",
    href: "https://doi.org/10.1056/NEJMoa1717250",
  },
  {
    id: 2,
    text: "Ettehad D, Emdin CA, Kiran A, et al. Blood pressure lowering for prevention of cardiovascular disease and death: a systematic review and meta-analysis. Lancet. 2016;387(10022):957-967.",
    href: "https://doi.org/10.1016/S0140-6736(15)01225-8",
  },
  {
    id: 3,
    text: "Kohrman N, Rashid M, Flores R, et al. A qualitative analysis of post-hoc interviews with multilevel participants of a randomized controlled trial (Los Angeles Barbershop Blood Pressure Study). PLoS One. 2024;19(5):e0303075.",
    href: "https://doi.org/10.1371/journal.pone.0303075",
  },
  {
    id: 4,
    text: "Chong S, Huynh B, Wong S, et al. Preferences and perspectives of Black male barbershop patrons on receiving health care in nontraditional settings. Health Equity. 2023;7(1):835-842.",
    href: "https://doi.org/10.1089/heq.2023.0157",
  },
  {
    id: 5,
    text: "Centers for Disease Control and Prevention. High Blood Pressure Facts.",
    href: "https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html",
  },
  {
    id: 6,
    text: "Centers for Disease Control and Prevention. PLACES: Local Data for Better Health, Census Tract Data (GIS Friendly Format), 2025 release.",
    href: "https://data.cdc.gov/d/yjkw-uj5s",
  },
  {
    id: 7,
    text: "City of Los Angeles Office of Finance. Listing of Active Businesses (public domain).",
    href: "https://data.lacity.org/d/6rrh-rzua",
  },
  {
    id: 8,
    text: "Tsai J, McCann NA. Health interventions in non-traditional business settings in the United States: a scoping review. PLoS One. 2025.",
    href: "https://doi.org/10.1371/journal.pone.0317815",
  },
  {
    id: 9,
    text: "Sprague BN, Forster AK. Multilevel blood pressure interventions: a rapid review. Healthcare (Basel). 2025;13(12):1397.",
    href: "https://doi.org/10.3390/healthcare13121397",
  },
  {
    id: 10,
    text: "Yusuf IA, Alozie I, Okwah MN, et al. Effects of community health worker-led interventions on cardiometabolic outcomes in vulnerable populations: a systematic review and meta-analysis. PLOS Global Public Health. 2026.",
    href: "https://doi.org/10.1371/journal.pgph.0007191",
  },
  {
    id: 11,
    text: "Allington RL, McGill-Franzen A, Camilli G, et al. Addressing summer reading setback among economically disadvantaged elementary students. Reading Psychology. 2010;31(5):411-427.",
    href: "https://doi.org/10.1080/02702711.2010.505165",
  },
  {
    id: 12,
    text: "Barbershop Books. Program overview and independent evaluation.",
    href: "https://barbershopbooks.org/",
  },
];

/** Published voices from people in the field, used in place of a practitioner quote. Exact short quotes only. */
export const VOICES: { who: string; quote?: string; finding: string; source: string; href: string }[] = [
  {
    who: "Barbers, customers and the pharmacist from the barbershop study, interviewed afterwards (31 people)",
    quote: "the trust diad, comprising the familiar environment and respected community member",
    finding: "Every group named the trusted place and the trusted person as what made the programme work, and said spreading it depends on finding those places.",
    source: "Kohrman et al., PLoS One, 2024",
    href: "https://doi.org/10.1371/journal.pone.0303075",
  },
  {
    who: "Black barbershop customers in a small survey (17 people)",
    finding: "47% would welcome health care in a barbershop, 56% in a pharmacy and 53% at home. One kind of venue does not suit everyone, which is why Anchor finds each group's own trusted places.",
    source: "Chong et al., Health Equity, 2023",
    href: "https://doi.org/10.1089/heq.2023.0157",
  },
  {
    who: "Community health worker programmes: 30 randomised trials, 15,295 people",
    finding: "Programmes led by community health workers lowered systolic blood pressure by 3.7 points on average, with results varying widely between studies (low certainty). These are the workers Anchor is built for.",
    source: "Yusuf et al., PLOS Global Public Health, 2026",
    href: "https://doi.org/10.1371/journal.pgph.0007191",
  },
];
