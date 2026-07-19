/* ============================================================
   FRA — date de referință
   Bălțile sunt preluate din aplicația Holerga (js/data.js).
   Fiecare baltă are harta oficială + coordonatele standurilor
   (în pixelii imaginii, imgW × imgH) pentru selecție vizuală.
   ============================================================ */

const BALTI = [
  {
    id: "hermes",
    name: "Hermes Periș",
    location: "Periș (Tâncăbești), jud. Ilfov · DN1 km 29",
    species: ["Crap comun", "Crap oglindă", "Somn", "Știucă", "Caras"],
    standCount: 24,
    map: "assets/maps/hermes.jpg", imgW: 2600, imgH: 1300, hotspotR: 55,
    stands: [
      { no: 1, x: 208, y: 1027 }, { no: 2, x: 289, y: 1060 }, { no: 3, x: 384, y: 1099 }, { no: 4, x: 464, y: 1131 },
      { no: 5, x: 562, y: 1154 }, { no: 6, x: 650, y: 1180 }, { no: 7, x: 738, y: 1164 }, { no: 8, x: 828, y: 1180 },
      { no: 9, x: 1030, y: 1186 }, { no: 10, x: 1121, y: 1193 }, { no: 11, x: 1222, y: 1167 }, { no: 12, x: 1424, y: 1138 },
      { no: 13, x: 1511, y: 1102 }, { no: 14, x: 1599, y: 1089 }, { no: 15, x: 1703, y: 1066 }, { no: 16, x: 1882, y: 1076 },
      { no: 17, x: 1986, y: 1073 }, { no: 18, x: 2174, y: 991 }, { no: 19, x: 2265, y: 936 }, { no: 20, x: 2343, y: 897 },
      { no: 21, x: 2538, y: 462 }, { no: 22, x: 2519, y: 361 }, { no: 23, x: 2434, y: 189 }, { no: 24, x: 2395, y: 120 },
    ],
  },
  {
    id: "doripesco",
    name: "Doripesco — Balta 4",
    location: "Vadu Roșu, Rotbav/Măieruș, jud. Brașov",
    species: ["Crap", "Novac", "Amur", "Caras"],
    standCount: 24,
    map: "assets/maps/doripesco.jpg", imgW: 560, imgH: 950, hotspotR: 18,
    stands: [
      { no: 1, x: 230, y: 870 }, { no: 2, x: 280, y: 840 }, { no: 3, x: 328, y: 812 }, { no: 4, x: 375, y: 782 },
      { no: 5, x: 420, y: 758 }, { no: 6, x: 455, y: 738 }, { no: 7, x: 482, y: 718 },
      { no: 8, x: 525, y: 645 }, { no: 9, x: 555, y: 480 }, { no: 10, x: 478, y: 348 }, { no: 11, x: 430, y: 280 },
      { no: 12, x: 405, y: 165 },
      { no: 13, x: 360, y: 70 }, { no: 14, x: 260, y: 55 }, { no: 15, x: 160, y: 58 }, { no: 16, x: 85, y: 75 },
      { no: 17, x: 78, y: 130 }, { no: 18, x: 132, y: 218 }, { no: 19, x: 192, y: 298 }, { no: 20, x: 230, y: 385 },
      { no: 21, x: 248, y: 472 }, { no: 22, x: 174, y: 567 }, { no: 23, x: 164, y: 727 }, { no: 24, x: 184, y: 816 },
    ],
  },
  {
    id: "sacosu",
    name: "Sacoșu Turcesc — Balta 2",
    location: "com. Sacoșu Turcesc, jud. Timiș",
    species: ["Crap comun", "Crap oglindă", "Amur", "Somn", "Șalău", "Știucă"],
    standCount: 30,
    map: "assets/maps/sacosu.jpg", imgW: 900, imgH: 900, hotspotR: 24,
    stands: [
      { no: 1, x: 180, y: 800 }, { no: 2, x: 222, y: 800 }, { no: 3, x: 266, y: 800 }, { no: 4, x: 310, y: 800 },
      { no: 5, x: 353, y: 800 }, { no: 6, x: 400, y: 800 }, { no: 7, x: 443, y: 800 }, { no: 8, x: 486, y: 800 },
      { no: 9, x: 528, y: 800 }, { no: 10, x: 575, y: 800 }, { no: 11, x: 618, y: 800 }, { no: 12, x: 661, y: 800 },
      { no: 13, x: 703, y: 800 }, { no: 14, x: 742, y: 800 },
      { no: 15, x: 802, y: 675 }, { no: 16, x: 820, y: 628 },
      { no: 17, x: 705, y: 478 }, { no: 18, x: 660, y: 478 }, { no: 19, x: 612, y: 478 }, { no: 20, x: 568, y: 478 },
      { no: 21, x: 522, y: 478 }, { no: 22, x: 480, y: 478 }, { no: 23, x: 437, y: 478 }, { no: 24, x: 392, y: 478 },
      { no: 25, x: 347, y: 478 }, { no: 26, x: 302, y: 478 }, { no: 27, x: 255, y: 478 }, { no: 28, x: 205, y: 478 },
      { no: 29, x: 122, y: 625 }, { no: 30, x: 122, y: 668 },
    ],
  },
  {
    id: "bradeni",
    name: "Lacul Brădeni",
    location: "com. Brădeni, jud. Sibiu",
    species: ["Crap", "Caras", "Lin", "Plătică"],
    standCount: 29,
    map: "assets/maps/bradeni.jpg", imgW: 1012, imgH: 936, hotspotR: 26,
    stands: [
      { no: 1, x: 895, y: 135 }, { no: 2, x: 855, y: 120 }, { no: 3, x: 800, y: 105 }, { no: 4, x: 755, y: 95 },
      { no: 5, x: 700, y: 90 }, { no: 6, x: 640, y: 85 }, { no: 7, x: 455, y: 70 }, { no: 8, x: 420, y: 100 },
      { no: 9, x: 385, y: 140 }, { no: 10, x: 360, y: 185 }, { no: 11, x: 330, y: 230 }, { no: 12, x: 295, y: 275 },
      { no: 13, x: 270, y: 320 }, { no: 14, x: 235, y: 362 }, { no: 15, x: 195, y: 410 }, { no: 16, x: 150, y: 455 },
      { no: 17, x: 110, y: 500 }, { no: 18, x: 78, y: 545 }, { no: 19, x: 150, y: 680 }, { no: 20, x: 170, y: 705 },
      { no: 21, x: 195, y: 735 }, { no: 22, x: 300, y: 882 }, { no: 23, x: 330, y: 850 }, { no: 24, x: 365, y: 815 },
      { no: 25, x: 400, y: 782 }, { no: 26, x: 440, y: 748 }, { no: 27, x: 480, y: 710 }, { no: 28, x: 505, y: 665 },
      { no: 29, x: 580, y: 625 },
    ],
  },
  {
    id: "bila",
    name: "Iazul Bila 2",
    location: "sat Bila, com. Schitu, jud. Giurgiu",
    species: ["Crap", "Amur", "Sânger", "Caraș", "Șalău", "Știucă"],
    standCount: 25,
    map: null, // fără hartă oficială — selecție pe grilă de numere
    stands: null,
  },
];

/* ---- liste de opțiuni pentru monturi ---- */
const MONTURA_TIPURI = [
  { id: "bag",      label: "Bag",     emoji: "🎒" },
  { id: "half",     label: "Half",    emoji: "◑"  },
  { id: "boilies",  label: "Boilies", emoji: "🔴" },
  { id: "plastice", label: "Plastice",emoji: "🫧" },
  { id: "snowman",  label: "Snowman", emoji: "⛄" },
];

// ce se pune la cârlig într-un bag
const BAG_HOOKBAIT = ["Plastic", "Pop-up", "Dumbel half", "Boilies"];

const DIAMETRE = ["16", "20", "24"];              // mm — bag, half, boilies, snowman
const DIAMETRE_PLASTIC = ["16", "20", "24", "Altul"]; // plasticele pot avea alt diametru

const CULORI = [
  { id: "galben",     label: "Galben",     hex: "#f2c200" },
  { id: "roz",        label: "Roz",        hex: "#f56fb0" },
  { id: "portocaliu", label: "Portocaliu", hex: "#f07a1c" },
  { id: "alb",        label: "Alb",        hex: "#f4f4f0" },
  { id: "alta",       label: "Altă culoare", hex: null },
];

// sugestii de producători (autocomplete; se completează din ce introduci tu)
const PRODUCATORI_SEED = [
  "Nash", "Mainline", "CC Moore", "Sticky Baits", "DNA Baits", "Select Baits",
  "Nutrabaits", "Bait-Tech", "Rod Hutchinson", "Carp Zoom", "Benzar", "Dynamite Baits",
  "ESP", "Korda", "Enterprise Tackle",
];

// cârlige
const CARLIG_TIPURI = [
  "Wide Gape", "Curve Shank", "Long Shank", "Chod", "Krank", "Continental Mugga",
  "Beaked Point", "Claw", "Stiff Rig",
];
const CARLIG_PRODUCATORI_SEED = ["Korda", "Nash", "Gardner", "ESP", "Fox", "Kamasan", "Owner", "Guru"];

// specii pentru capturi (se completează și din baltă)
const SPECII_SEED = ["Crap comun", "Crap oglindă", "Crap fantomă", "Amur", "Novac", "Sânger", "Caras", "Somn", "Știucă", "Șalău", "Lin", "Plătică"];
