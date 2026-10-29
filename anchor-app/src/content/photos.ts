/**
 * Photographs on the site. All from Wikimedia Commons under licences that allow
 * commercial use; each shows the world around this work (barbershops, blood
 * pressure checks), never a partner venue or a real participant. Credited in the
 * footer. Source list: anchor-app/assets/credits.json.
 */
export const PHOTOS = {
  barber: {
    src: "/images/barber-cutting-hair-with-comb-back-view.jpg",
    width: 1600,
    height: 1068,
    alt: "A barber trims a customer's hair with a comb and clippers, seen from behind.",
    credit: "Nenad Stojkovic, CC BY 2.0",
    href: "https://commons.wikimedia.org/wiki/File:Barber_cutting_hair_with_comb._Back_view_of_man_in_barber_shop.jpg",
  },
  cuff: {
    src: "/images/checking-blood-pressure-at-home.jpg",
    width: 1600,
    height: 1432,
    alt: "A person checks their blood pressure with an arm cuff and a digital monitor on a table.",
    credit: "Beendy234, CC0",
    href: "https://commons.wikimedia.org/wiki/File:Checking_blood_pressure_at_home.jpg",
  },
  pole: {
    src: "/images/cal-smith-s-barber-shop-pole-main.jpg",
    width: 1600,
    height: 2294,
    alt: "A red, white and blue barber pole against a blue sky on a small-town main street.",
    credit: "John Margolies, Library of Congress, public domain",
    href: "https://commons.wikimedia.org/wiki/File:Cal_Smith%27s_Barber_Shop_pole,_Main_Street,_Galesburg,_Illinois_LCCN2017703927.tif",
  },
  interior: {
    src: "/images/barbershop-early-20th-century-amsterdam.jpg",
    width: 1600,
    height: 1200,
    alt: "Inside an old barbershop: a red barber chair, mirrors, shelves of bottles and a wooden counter.",
    credit: "Mork, public domain",
    href: "https://commons.wikimedia.org/wiki/File:Barbershop_early_20th_century_(Amsterdam).jpg",
  },
} as const;
