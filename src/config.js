/* ════════════════════════════════════════════════════════════════════════════
   CONFIG — every personal detail lives here. Anything marked [PLACEHOLDER] is a
   working default: the site runs as-is, but replace it with the real thing.
   Photos are in the PHOTOS block below (keys p1…p8, letter, baby).
   ════════════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  name: "MANASWI",
  nickname: "Manaswi", // [NICKNAME]
  from: "DZ", // [MY NAME]
  age: null, // [AGE] e.g. 21 — the finale forms this number (null → ∞)
  birthdayLabel: "", // [BIRTHDAY DATE] e.g. "20 October 2026"
  birthISO: null, // [BIRTH DATE + TIME, IST] e.g. "2005-10-20T06:30:00+05:30" — powers the live age counter
  birthYear: null, // [BIRTH YEAR] e.g. 2005

  // Scene 2 + hero photo, letter photo, hidden childhood photo (keys into PHOTOS)
  heroPhoto: "p1", // [PHOTO_1]
  letterPhoto: "letter", // [PHOTO_LETTER]
  babyPhoto: "baby", // [PHOTO_BABY]

  // Scene 4 — Multiverse gallery: one funny "universe" label per photo  [PHOTO_n + labels]
  gallery: [
    { photo: "p1", label: "Variant: Sleepy Sorcerer — Threat level: Do Not Disturb" },
    { photo: "p2", label: "Variant: Selfie Sorceress — 47 takes, 1 approved" },
    { photo: "p3", label: "Variant: Snack Summoner — the fridge fears her" },
    { photo: "p4", label: "Variant: Remote Guardian — TV is hers, accept it" },
    { photo: "p5", label: "Variant: Drama Dimension — Oscar pending" },
    { photo: "p6", label: "Variant: Night-Owl Mystic — sleeps at 4, wakes at 'kya hai'" },
    { photo: "p7", label: "Variant: Shopping Sorceress — cart has 37 items, budget has 0" },
    { photo: "p8", label: "Variant: Original Timeline — the real one, unfortunately for us" },
  ],

  // Scene 5 — photos on the 3D mirror-dimension ring (6–8 keys)
  mirror: ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"],

  // Scene 6 — Archives  [MEMORY 1-3]
  memories: [
    { year: "[YEAR]", title: "The First Portal", story: "Placeholder memory. Write the year, a title and a 2-line story here — the day it all started.", photo: "p2" },
    { year: "[YEAR]", title: "The Great Remote War", story: "Placeholder memory. The fight nobody won, which she still claims she won.", photo: "p4" },
    { year: "[YEAR]", title: "The Midnight Snack Heist", story: "Placeholder memory. Replace with a real story only the two of you know.", photo: "p3" },
  ],

  // Scene 7 — the spell lock  [SECRET SPELL WORD] [ALT SPELLINGS] [HINT 1] [HINT 2]
  spell: "abracadabra",
  spellAlts: ["abra ka dabra", "abrakadabra"],
  hint1: "Hint: the oldest magic word in every kid's book. (Placeholder hint)",
  hint2: "Big hint: abra… you finish it. (Placeholder hint)",

  // Scene 8 — the letter  [PERSONAL MESSAGE] [SIGN-OFF]
  letter: [
    "Oye Manaswi,",
    "Placeholder letter — replace this with your own words. Saal bhar tujhe tang karna mera official kaam hai, aur main apna kaam bahut seriously leta hoon.",
    "But sach bolu toh — jitne bhi universes hain, har ek mein main tera hi bhai banna choose karunga. Even the one where you hide the remote.",
    "Is saal tujhe sab mile: khushi, sukoon, success, aur ek full night ki neend. Happy Birthday, Sorcerer Supreme.",
  ],
  signoff: "— Tera permanent pain-in-the-neck bhai, DZ", // [SIGN-OFF]

  // Scene 9 — quiz built from inside jokes  [INSIDE JOKE 1-3]
  quiz: [
    { q: "It's 2 AM. What is she doing?", a: [["Ordering snacks 'for later'", "snacks"], ["Watching one more episode", "owl"], ["Replaying an argument from 2019", "drama"], ["Adding things to cart", "shop"]] },
    { q: "Pick a superpower.", a: [["Infinite fridge", "snacks"], ["Never needing an alarm", "owl"], ["Winning every argument", "drama"], ["Unlimited card limit", "shop"]] },
    { q: "Her reaction when someone touches her stuff:", a: [["Eats their snack in revenge", "snacks"], ["Stays calm, plots at night", "owl"], ["Full movie scene, background music included", "drama"], ["Buys a better one, shows it off", "shop"]] },
    { q: "Her ideal birthday?", a: [["All-you-can-eat buffet", "snacks"], ["Sleeping till 2 PM", "owl"], ["Being the main character all day", "drama"], ["A mall + no budget", "shop"]] },
    { q: "The word family uses for her most:", a: [["Bhukkad", "snacks"], ["Ullu", "owl"], ["Drama queen", "drama"], ["Shopaholic", "shop"]] },
  ],

  // Scene 10 — Council of Wishes  [FAMILY WISHES]
  wishes: [
    { name: "Mummy", text: "Placeholder wish — ask Mummy for one line!" },
    { name: "Papa", text: "Placeholder wish — Papa's one-liner goes here." },
    { name: "DZ", text: "Happy Birthday! Remote abhi bhi mera hai. Placeholder." },
    { name: "Best friend", text: "Placeholder wish from her best friend." },
  ],

  // Scene 11 — easter egg (d): type this word anywhere (or in the spell box)  [CUSTOM WORD]
  secretWord: "multiverse",
};
