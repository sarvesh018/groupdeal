/**
 * Car details used by the demo catalogue: variant names, colours and a photo.
 *
 * Variant and colour names are indicative (as commonly sold in India in 2025–26)
 * and change often; check the carmaker's site before relying on them.
 *
 * Photos are freely licensed images from Wikimedia Commons, loaded from Commons
 * and credited on screen with a link to the file page, which states the licence.
 * Models without a suitable free photo show a drawn outline instead.
 */

export type CarPhoto = { file: string; author?: string; licence?: string };
export type CarDetails = { variants: string[]; colours: string[]; photo?: CarPhoto };

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const YT = "CC BY 3.0";

export const CAR_DETAILS: Record<string, CarDetails> = {
  "tata-punch": {
    variants: ["Pure", "Adventure", "Accomplished", "Creative"],
    colours: ["Orcus White", "Daytona Grey", "Tropical Mist", "Calypso Red", "Atomic Orange"],
    photo: { file: "2021 Tata Punch Creative (India) front view 01.png", author: "Athira Murali", licence: YT },
  },
  "tata-nexon": {
    variants: ["Smart", "Pure", "Creative", "Fearless"],
    colours: ["Pristine White", "Daytona Grey", "Flame Red", "Ocean Blue", "Pure Grey"],
    photo: { file: "2023 Tata Nexon XZA+ front view.jpg", author: "Dairokkan9" },
  },
  "tata-curvv": {
    variants: ["Smart", "Pure", "Creative", "Accomplished"],
    colours: ["Pristine White", "Daytona Grey", "Gold Essence", "Flame Red", "Pure Grey"],
  },
  "tata-harrier": {
    variants: ["Smart", "Pure", "Adventure", "Fearless"],
    colours: ["Lunar White", "Seaweed Green", "Ash Grey", "Coral Red", "Oberon Black"],
  },
  "tata-tiago": {
    variants: ["XE", "XM", "XT", "XZ+"],
    colours: ["Opal White", "Arizona Blue", "Flame Red", "Daytona Grey", "Tornado Blue"],
    photo: { file: "2022 Tata Tiago XZA+ front 20230512.jpg" },
  },
  "hyundai-creta": {
    variants: ["E", "EX", "S", "SX", "SX(O)"],
    colours: ["Atlas White", "Titan Grey", "Abyss Black", "Fiery Red", "Robust Emerald"],
    photo: { file: "2024 Hyundai Creta 1.5 MPi SX(O) (India) front view.png", licence: YT },
  },
  "hyundai-venue": {
    variants: ["E", "S", "SX", "SX(O)"],
    colours: ["Atlas White", "Titan Grey", "Abyss Black", "Fiery Red", "Typhoon Silver"],
    photo: { file: "2020-21 Hyundai Venue 1.6 Red colour front view in Brunei (cropped).jpg" },
  },
  "hyundai-exter": {
    variants: ["EX", "S", "SX", "SX(O)"],
    colours: ["Atlas White", "Ranger Khaki", "Cosmic Blue", "Fiery Red", "Titan Grey"],
    photo: { file: "2023 Hyundai Exter SX (O).png", author: "Connect2Sam", licence: YT },
  },
  "hyundai-i20": {
    variants: ["Era", "Magna", "Sportz", "Asta", "Asta (O)"],
    colours: ["Atlas White", "Typhoon Silver", "Fiery Red", "Starry Night", "Amazon Grey"],
    photo: { file: "2020 Hyundai i20 1.5 Asta (O) Diesel (India) front view.png", licence: YT },
  },
  "hyundai-verna": {
    variants: ["EX", "S", "SX", "SX(O)"],
    colours: ["Atlas White", "Typhoon Silver", "Fiery Red", "Starry Night", "Abyss Black"],
    photo: { file: "Hyundai Verna SX Turbo 03.jpg", author: "Siddharth Antre", licence: YT },
  },
  "maruti-suzuki-swift": {
    variants: ["LXi", "VXi", "ZXi", "ZXi+"],
    colours: ["Pearl Arctic White", "Splendid Silver", "Sizzling Red", "Luster Blue", "Novel Orange"],
    photo: { file: "Suzuki Swift (2024) hybrid DSC 7922.jpg", licence: "CC BY-SA 4.0" },
  },
  "maruti-suzuki-baleno": {
    variants: ["Sigma", "Delta", "Zeta", "Alpha"],
    colours: ["Arctic White", "Splendid Silver", "Grandeur Grey", "Nexa Blue", "Opulent Red"],
    photo: { file: "2022 Maruti Suzuki Baleno Alpha (India) front view.jpg", author: "Milind Kwatra", licence: YT },
  },
  "maruti-suzuki-brezza": {
    variants: ["LXi", "VXi", "ZXi", "ZXi+"],
    colours: ["Pearl Arctic White", "Splendid Silver", "Magma Grey", "Brave Khaki", "Sizzling Red"],
    photo: { file: "2022 Maruti Suzuki Brezza ZXi+ (India) front view 02.png", author: "DriveSpark", licence: YT },
  },
  "maruti-suzuki-grand-vitara": {
    variants: ["Sigma", "Delta", "Zeta", "Alpha"],
    colours: ["Arctic White", "Splendid Silver", "Grandeur Grey", "Nexa Blue", "Opulent Red"],
    photo: { file: "2022 Maruti Suzuki Grand Vitara Zeta Smart Hybrid (India) front view.jpg", author: "Siddharth Antre", licence: YT },
  },
  "maruti-suzuki-dzire": {
    variants: ["LXi", "VXi", "ZXi", "ZXi+"],
    colours: ["Arctic White", "Splendid Silver", "Magma Grey", "Gallant Red", "Alluring Blue"],
    photo: { file: "2026 Suzuki Dzire GL in Arctic White Pearl 01.jpg" },
  },
  "maruti-suzuki-ertiga": {
    variants: ["LXi", "VXi", "ZXi", "ZXi+"],
    colours: ["Pearl Arctic White", "Splendid Silver", "Magma Grey", "Auburn Red", "Pearl Midnight Black"],
    photo: { file: "2024 Suzuki Ertiga 1.5 GLX Hybrid in Brave Khaki Pearl, front right.jpg" },
  },
  "mahindra-xuv-3xo": {
    variants: ["MX1", "MX3", "AX5", "AX7", "AX7L"],
    colours: ["Everest White", "Galaxy Grey", "Tango Red", "Citrine Yellow", "Stealth Black"],
    photo: { file: "Mahindra XUV 3XO 2025.jpg", author: "Sreedit" },
  },
  "mahindra-thar": {
    variants: ["AX(O)", "LX"],
    colours: ["Everest White", "Galaxy Grey", "Red Rage", "Deep Forest", "Stealth Black"],
  },
  "mahindra-scorpio-n": {
    variants: ["Z2", "Z4", "Z6", "Z8", "Z8L"],
    colours: ["Everest White", "Dazzling Silver", "Red Rage", "Deep Forest", "Napoli Black"],
  },
  "mahindra-xuv700": {
    variants: ["MX", "AX3", "AX5", "AX7", "AX7L"],
    colours: ["Everest White", "Dazzling Silver", "Red Rage", "Midnight Black", "Electric Blue"],
    photo: { file: "2023 Mahindra XUV700 AX7L front.jpg" },
  },
  "kia-sonet": {
    variants: ["HTE", "HTK", "HTK+", "HTX", "GTX+"],
    colours: ["Glacier White Pearl", "Gravity Grey", "Intense Red", "Imperial Blue", "Aurora Black Pearl"],
    photo: { file: "Kia Sonet front view (India) 01.png", author: "DriveSpark", licence: YT },
  },
  "kia-seltos": {
    variants: ["HTE", "HTK", "HTX", "GTX+", "X-Line"],
    colours: ["Glacier White Pearl", "Gravity Grey", "Pewter Olive", "Intense Red", "Aurora Black Pearl"],
    photo: { file: "Kia Seltos car Htx model (cropped).jpg", author: "Thesureshg" },
  },
  "kia-carens": {
    variants: ["Premium", "Prestige", "Prestige+", "Luxury", "Luxury+"],
    colours: ["Glacier White Pearl", "Gravity Grey", "Imperial Blue", "Intense Red", "Aurora Black Pearl"],
  },
  "toyota-glanza": {
    variants: ["E", "S", "G", "V"],
    colours: ["Café White", "Enticing Silver", "Gaming Grey", "Insta Blue", "Sportin Red"],
  },
  "toyota-urban-cruiser-hyryder": {
    variants: ["E", "S", "G", "V"],
    colours: ["Café White", "Enticing Silver", "Speedy Blue", "Cave Black", "Sportin Red"],
    photo: { file: "2022 Toyota Urban Cruiser Hyryder V Hybrid (India) front view.jpg", author: "DriveSpark", licence: YT },
  },
  "toyota-innova-hycross": {
    variants: ["G", "GX", "VX", "ZX", "ZX(O)"],
    colours: ["Platinum White Pearl", "Silver Metallic", "Attitude Black", "Blackish Ageha Glass Flake", "Sparkling Black Crystal Shine"],
    photo: { file: "Toyota Zenix 2.0 V 2023 (2).jpg" },
  },
  "honda-amaze": {
    variants: ["V", "VX", "ZX"],
    colours: ["Platinum White Pearl", "Lunar Silver", "Meteoroid Grey", "Obsidian Blue", "Radiant Red"],
  },
  "honda-city": {
    variants: ["SV", "V", "VX", "ZX"],
    colours: ["Platinum White Pearl", "Lunar Silver", "Meteoroid Grey", "Obsidian Blue", "Radiant Red"],
    photo: { file: "2022 Honda City ZX i-VTEC (India) front view (cropped).jpg" },
  },
  "honda-elevate": {
    variants: ["SV", "V", "VX", "ZX"],
    colours: ["Platinum White Pearl", "Lunar Silver", "Phoenix Orange", "Obsidian Blue", "Golden Brown"],
    photo: { file: "2023 Honda Elevate VX (India) front view.jpg", author: "Hulchul TV", licence: YT },
  },
  "mg-astor": {
    variants: ["Sprint", "Shine", "Select", "Sharp Pro", "Savvy Pro"],
    colours: ["Candy White", "Starry Black", "Glaze Red", "Aurora Silver", "Havana Grey"],
  },
  "mg-windsor-ev": {
    variants: ["Excite", "Exclusive", "Essence"],
    colours: ["Pearl White", "Starburst Black", "Clay Beige", "Turquoise Green"],
  },
  "mg-hector": {
    variants: ["Style", "Shine Pro", "Select Pro", "Smart Pro", "Sharp Pro", "Savvy Pro"],
    colours: ["Candy White", "Starry Black", "Glaze Red", "Aurora Silver", "Havana Grey"],
    photo: { file: "MG(Morris Garages) Hector SUV in Jamshedpur, Jharkhand, India (Ank Kumar, Infosys Limited)) 02.jpg", author: "Ank Kumar" },
  },
};

const fileTitle = (file: string) => file.replace(/ /g, "_");

/** Where to load and credit the photo of a model, or null if there's no photo. */
export function carPhoto(brand: string, model: string, width = 960) {
  const p = CAR_DETAILS[slugify(`${brand} ${model}`)]?.photo;
  if (!p) return null;
  const title = encodeURIComponent(fileTitle(p.file));
  return {
    src: `https://commons.wikimedia.org/wiki/Special:FilePath/${title}?width=${width}`,
    page: `https://commons.wikimedia.org/wiki/File:${title}`,
    credit: [p.author, p.licence].filter(Boolean).join(", "),
  };
}
