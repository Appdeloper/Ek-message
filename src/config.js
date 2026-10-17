/* ════════════════════════════════════════════════════════════════════════════
   CONFIG — every personal detail lives here. Edit freely, then: node tools/build.mjs
   Photos are in the PHOTOS block below (keys p1…p8, letter, baby).
     p1 peek-a-boo · p2 asleep on the maths book · p3 hands-over-head laugh · p4 exam stress
     p5 hiding from the camera · p6 motion blur · p7 tiny her in sunglasses · p8 tiny her posing
     letter = tiny her with the peace sign · baby = tiny her smiling (hidden easter egg)
   ════════════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  name: "MANASWI",
  nickname: "Manav",
  from: "DZ",
  age: 16, // the finale forms this number
  birthdayLabel: "",
  birthISO: null, // add e.g. "2010-10-20T06:30:00+05:30" to switch on the live age counter
  birthYear: 2010,

  heroPhoto: "p1",
  letterPhoto: "letter",
  babyPhoto: "baby",

  // Scene 4 — Multiverse gallery: one funny "universe" label per photo
  gallery: [
    { photo: "p1", label: "Variant: Peek-a-Boo Sorceress — face hidden, smile leaked" },
    { photo: "p2", label: "Variant: Sleepy Sorcerer — learning Maths & Stats by osmosis" },
    { photo: "p3", label: "Variant: Paparazzi-Proof — zero clear photos since 2010" },
    { photo: "p4", label: "Variant: Exam Mode — calculating the probability of passing" },
    { photo: "p5", label: "Variant: Ninja Mode — vanishes the second a phone comes out" },
    { photo: "p6", label: "Variant: Speedster — moved faster than the shutter" },
    { photo: "p7", label: "Variant: Original Timeline (Mini) — attitude since birth" },
    { photo: "p8", label: "Variant: Tiny Dancer — the drama started early" },
  ],

  // Scene 5 — photos on the 3D mirror-dimension ring (6–8 keys)
  mirror: ["p1", "p7", "p3", "p8", "p2", "p5", "p4", "p6"],

  // Scene 6 — Archives
  memories: [
    { year: "2010", title: "The Origin Story", story: "A tiny sorceress arrives. The house has not been quiet since.", photo: "p7" },
    { year: "Childhood", title: "The Pose Era", story: "Before she learned to hide from cameras, she posed for every single one. The evidence is on file.", photo: "p8" },
    { year: "Std XI", title: "The Maths & Stats Saga", story: "Book open, eyes closed, phone under the desk. A masterclass in multitasking.", photo: "p2" },
  ],

  // Scene 7 — the spell lock (answer is case-insensitive)
  spell: "abracadabra",
  spellAlts: ["abra ka dabra", "abrakadabra"],
  hint1: "Hint: the oldest magic word in every kid's book.",
  hint2: "Big hint: abra… you finish it.",

  // Scene 8 — the letter (one string per paragraph)
  letter: [
    "Oye Manav,",
    "Sixteen. Officially. Saal bhar tujhe tang karna mera kaam hai, aur main apna kaam bahut seriously leta hoon — but aaj ek din ki chhutti.",
    "Tu camera dekhte hi chehra chhupa leti hai, par sach ye hai ki tu jitni hai na, utni hi perfect hai. Jitne bhi universes hain, har ek mein main tera hi bhai banna choose karunga. Even the one where you steal the remote.",
    "Is saal tujhe sab mile: khushi, sukoon, achhe marks (Maths & Stats bhi!), aur ek full night ki neend. Happy 16th Birthday, Sorcerer Supreme.",
  ],
  signoff: "— Tera permanent pain-in-the-neck bhai, DZ",

  // Scene 9 — "which variant" quiz
  quiz: [
    { q: "It's 2 AM. What is she doing?", a: [["Ordering snacks 'for later'", "snacks"], ["Watching one more episode", "owl"], ["Replaying an argument from 2019", "drama"], ["Adding things to cart", "shop"]] },
    { q: "Someone takes out a camera. She…", a: [["Asks for a snack bribe first", "snacks"], ["Is already asleep on the desk", "owl"], ["Hides her face like it's a crime scene", "drama"], ["Wants it only if the outfit is new", "shop"]] },
    { q: "Pick a superpower.", a: [["Infinite fridge", "snacks"], ["Never needing an alarm", "owl"], ["Winning every argument", "drama"], ["Unlimited card limit", "shop"]] },
    { q: "Her ideal birthday?", a: [["All-you-can-eat buffet", "snacks"], ["Sleeping till 2 PM", "owl"], ["Being the main character all day", "drama"], ["A mall + no budget", "shop"]] },
    { q: "A Maths & Stats class starts. She…", a: [["Opens the tiffin", "snacks"], ["Uses the textbook as a pillow", "owl"], ["Sighs loud enough for the whole class", "drama"], ["Checks sale notifications under the desk", "shop"]] },
  ],

  // Scene 10 — Council of Wishes. Family can also add theirs live with the box on the page.
  wishes: [
    { name: "DZ", text: "Happy 16th, Manav! Remote abhi bhi mera hai. Baaki sab tera." },
  ],

  // Scene 11 — easter egg (d): type this word anywhere (or in the spell box) to see a hidden childhood photo
  secretWord: "multiverse",
};
