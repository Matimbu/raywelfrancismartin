// ============================================================
//  EDIT THIS FILE to change what the site says about you.
//  Anything marked TODO is a placeholder waiting for your details.
//  TODO items only show when you preview on your own computer; the
//  live site skips them until you replace the text.
//  Set a list to [] to hide that section.
//  In `beliefs`, wrap words in *asterisks* to make them stand out.
//  In `about`, write links as [text](https://...).
// ============================================================

const SITE = {
  firstName: "Raywel",
  lastName: "Martin",
  fullName: "Raywel Francis Martin",
  initials: "RFM",
  timezone: "Asia/Manila",
  portfolio: "https://matimbu.github.io/portfolio/", // shown as a button in the top bar

  roles: ["Student", "Builder", "Designer", "Hooper"],
  statement: "I make things on screen, on paper and on the court.",

  place: {
    label: "Based in",
    name: "Malolos, Bulacan",
    pronounced: "ma · lo · los",
    note: "Philippines",
    coords: "14.8527° N, 120.8160° E"
  },

  // Small cards floating around your name. `photo` shows a picture instead
  // of the emoji; `badge` adds a little sticker on the card's corner.
  // Web-ready pictures live in assets/. (images/ is for your original
  // photos and never gets published.)
  // Order = position: 1 top-left (tall), 2 top-right, 3 bottom-left (small
  // square), 4 bottom-right (wide). Photos face toward the name.
  floaters: [
    { emoji: "🎨", photo: "assets/me-shop.jpg", badge: "🎨" },
    { emoji: "🎮", photo: "assets/me-cafe.jpg", badge: "🎮" },
    { emoji: "🐝", photo: "assets/still-flowers.jpg", badge: "🐝" },
    { emoji: "🏀", photo: "assets/me-sofa.jpg", badge: "🏀" }
  ],

  marquee: ["C#", "Graphic design", "Basketball", "Valorant", "WinForms", "Photoshop", "Video editing", "Unity", "The Court's Coder"],

  about: [
    "I'm Raywel, also known as Matimbu. On the court, some people call me Yao Ming, The Court's Coder.",
    "My professional side lives in my [portfolio](https://matimbu.github.io/portfolio/). This page is everything else: the things I make for fun, what I do with my free time, what I believe in, and where to find me online.",
    "Off the clock, I'm on the court, in a Valorant lobby with the squad, or filming my friends. People change, memories don't, so I keep the moments on camera and cut them into videos."
  ],

  // Word walls in the About section: big words with a small note under
  // each. `top` makes one word the big italic one. Optional per word:
  // `link` (the word becomes a link), `face` (small round photo by the note),
  // `image` (larger photo that follows the cursor on hover) and `credit`
  // (required for Creative Commons photos; listed under the wall).
  // `section` picks where a wall goes (default: the About section).
  // `art` shows a picture beside the words (`glow` tints the light behind it);
  // `notice` adds a line under the wall (e.g. Riot's fan-content notice).
  // `layout: "cards"` shows each word as a photo card (`image`, `pos`, `alt`);
  // `credit` can also be a list when a card uses more than one photo.
  // Add more walls to the list and they show up in the same style.
  walls: [
    {
      label: "Also known as",
      intro: "Names people call me. Most started on the court or in a Valorant lobby, then stuck.",
      words: [
        { text: "Matimbu", note: "the OG", top: true },
        {
          text: "Yao Ming",
          note: "on the court, after the NBA legend",
          link: "https://en.wikipedia.org/wiki/Yao_Ming",
          face: "assets/aka/yao-ming-rockets-face.jpg",
          image: "assets/aka/yao-ming-rockets.jpg",
          credit: {
            subject: "Yao Ming",
            by: "Keith Allison",
            license: "CC BY-SA 3.0",
            licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
            source: "https://commons.wikimedia.org/wiki/File:YaoMingonoffense2.jpg"
          }
        },
        {
          text: "Wemby",
          note: "after the Spurs' Victor Wembanyama",
          link: "https://en.wikipedia.org/wiki/Victor_Wembanyama",
          face: "assets/aka/wemby-tall-face.jpg",
          image: "assets/aka/wemby-tall.jpg"
        },
        { text: "Jenduks", note: "Valorant · YouTube" },
        { text: "Wel", note: "from Raywel" },
        { text: "Martin", note: "the last name" }
      ],
      notice: "The Wemby photo belongs to its photographer."
    },
    {
      label: "My starting five",
      section: "hobbies",
      intro: "My all-time five, if I got to pick.",
      layout: "cards",
      words: [
        {
          pos: "PG", text: "Rondo", note: "the passer",
          link: "https://en.wikipedia.org/wiki/Rajon_Rondo",
          image: "assets/five/rondo-celtics.jpg", alt: "Rajon Rondo calling a play as he brings the ball up for the Celtics"
        },
        {
          pos: "SG", text: "Kobe", note: "Mamba mentality",
          link: "https://en.wikipedia.org/wiki/Kobe_Bryant",
          image: "assets/five/kobe-lakers.jpg", alt: "Kobe Bryant driving to the basket for the Lakers"
        },
        {
          pos: "SF", text: "MJ", note: "six rings",
          link: "https://en.wikipedia.org/wiki/Michael_Jordan",
          image: "assets/five/mj-bulls.jpg", alt: "Michael Jordan rising for a jump shot for the Bulls"
        },
        {
          pos: "PF", text: "LeBron", note: "the King",
          link: "https://en.wikipedia.org/wiki/LeBron_James",
          image: "assets/five/lebron-heat.jpg", alt: "LeBron James cocking the ball back for a dunk with the Heat"
        },
        {
          pos: "C", text: "Yao / Shaq", note: "co-starters",
          image: "assets/five/yao-shaq.jpg", alt: "Yao Ming and Shaquille O'Neal posting up",
          credit: [{ subject: "Yao Ming", by: "Keith Allison", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", source: "https://commons.wikimedia.org/wiki/File:Yao_Ming_(2310548923).jpg" }, { subject: "Shaquille O'Neal", by: "Jeramey Jannene", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", source: "https://commons.wikimedia.org/wiki/File:%22Give_Me_The_Damn_Ball%22_(73833605).jpg" }]
        }
      ],
      notice: "The Rondo, Kobe, MJ and LeBron photos belong to their photographers."
    },
    {
      label: "Agents I main",
      section: "hobbies",
      intro: "Sova main. Some of the clips are on my YouTube and TikTok.",
      art: { src: "assets/valorant/sova.webp", alt: "Official art of Sova, the Valorant agent", glow: "#355285" },
      notice: "\u201cRaywel Martin\u201d (this site) was created under Riot Games' \u201cLegal Jibber Jabber\u201d policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.",
      words: [
        { text: "Sova", note: "main · Initiator", top: true, face: "assets/valorant/sova-icon.webp" },
        { text: "Recon Bolt", note: "reveals enemies" },
        {
          text: "Owl Drone",
          note: "or my teammate, apparently",
          link: "https://www.tiktok.com/@matimbu_/video/7121951680408669442"
        },
        { text: "Shock Bolt", note: "the explosive one" },
        {
          text: "Hunter's Fury",
          note: "ultimate · hits through walls",
          link: "https://www.tiktok.com/@matimbu_/video/7032101516244782337"
        }
      ]
    }
  ],

  now: [
    "Studying BSIT at STI College Malolos",
    "Looking for OJT / junior dev roles",
    "Building Malolos Rush, my capstone game in Unity"
  ],

  // Oldest first, so the numbers read like a timeline.
  // `image` is optional (shows when you hover the row). Use a link or a
  // file in the assets/ folder, e.g. "assets/poster.png".
  crafts: [
    {
      title: "Memory videos",
      tags: ["Video", "Editing"],
      year: "2023",
      emoji: "🎬",
      image: "https://i.ytimg.com/vi/wZsDlJYYQDI/maxresdefault.jpg",
      link: "https://www.youtube.com/@Jenduks"
    },
    {
      title: "Cheesy Potato Balls",
      tags: ["Poster", "Photoshop"],
      year: "2023",
      emoji: "🎨",
      image: "https://matimbu.github.io/portfolio/images/CHEESY%20POTATO%20BALLS.png",
      link: "https://matimbu.github.io/portfolio/#featured"
    },
    {
      title: "The Hive Kiosk",
      tags: ["Code", "C#", "GDI+"],
      year: "2026",
      emoji: "🐝",
      image: "https://matimbu.github.io/portfolio/images/kiosk/01-welcome.png",
      link: "https://matimbu.github.io/portfolio/"
    },
    {
      title: "Malolos Rush",
      tags: ["Game", "Unity 3D", "Capstone"],
      year: "2026",
      emoji: "🏃",
      image: "",
      link: "" // repo is private
    }
  ],

  hobbies: [
    { emoji: "🏀", title: "Basketball", text: "Where I switch off from code. Want to talk hoops? Message me." },
    { emoji: "🖌️", title: "Graphic design", text: "Posters, layouts, and messing around in Photoshop." },
    { emoji: "🎮", title: "Valorant", text: "Playing with friends and clipping the moments worth keeping, like using a teammate as a Sova drone." },
    { emoji: "🎧", title: "Music", text: "Hip-hop on repeat, mostly Travis Scott, Drake, Mustard and Offset. Press play on my playlist below." }
  ],

  // Spotify player under the hobbies. Use the link from Share > Copy link
  // (playlists, albums, tracks and artists all work). Set to null to hide.
  playlist: {
    title: "IM BUSY",
    note: "Travis Scott, Drake, Mustard, Offset and more",
    url: "https://open.spotify.com/playlist/4Y8w4bIWDu7ryf8ejl4O5V",
    // One song you're into right now (Share > Copy song link). null hides it.
    pick: "https://open.spotify.com/track/6MWKRxEIBl14lEWFdCCVaa"
  },

  beliefs: [
    "*Learn by building.* Things stick when I make something and work out where I got stuck.",
    "*Be honest about what you know.* I'd rather say what I'm still learning than pretend I've figured it all out.",
    "*People change, memories don't.* When something moves me, I film it so I get to keep the moment."
  ],

  // Video IDs come from the URL: youtube.com/watch?v=THIS_PART or
  // youtube.com/shorts/THIS_PART. `featuredVideo` plays right on the page.
  youtube: [
    {
      name: "Matimbu",
      handle: "@Jenduks",
      url: "https://www.youtube.com/@Jenduks",
      tagline: "People change, memories don't.",
      about: "Memory videos with friends, plus Valorant clips.",
      featuredVideo: "wZsDlJYYQDI",
      videos: [
        { title: "BNF BTG PNM", note: "15:54", id: "IrMJpBgpFjY" },
        { title: "batugans 22 - 23", note: "4:06", id: "wZsDlJYYQDI" },
        { title: "BAIT MY TEAMMATE", note: "Short", id: "1QQ4ncdYBoA", short: true },
        { title: "NEVER BACK DOWN NEVER WHAT?", note: "Short", id: "lXQqb-qdOAg", short: true }
      ]
    },
    {
      // `platform: "tiktok"` plays clips in TikTok's player; IDs come from
      // tiktok.com/@you/video/THIS_PART and each needs a cover in assets/tiktok/
      platform: "tiktok",
      name: "Jenduks",
      handle: "@matimbu_",
      url: "https://www.tiktok.com/@matimbu_",
      about: "Valorant clips, mostly Sova.",
      featuredVideo: "7121951680408669442",
      videos: [
        { title: "Owl Drone", note: "Clip", id: "7121951680408669442" },
        { title: "Hunter's Fury", note: "Clip", id: "7032101516244782337" }
      ]
    }
  ],

  // "Snapshots" gallery. `file` is the name in assets/gallery/ (each photo
  // has -400, -800 and -1600 versions). `wide` photos span two columns.
  // `story` (optional) shows under the caption when the photo is opened.
  // `fit: "contain"` shows the whole image (for screenshots and notes).
  gallery: [
    {
      file: "studio-chair",
      caption: "Channel inner energy",
      alt: "Raywel sitting on an orange chair in front of a graffiti wall",
      story: "Just finding the vibe."
    },
    { file: "under-the-lights", caption: "Under the lights", alt: "Raywel looking up under a tree strung with lights at night" },
    {
      file: "custom-jersey",
      caption: "Custom jacket",
      alt: "Raywel in sunglasses holding a blue jacket with RAYWEL on it",
      story: "Made it my own."
    },
    { file: "valorant-champs", caption: "Syntax Valorant Cup champions", alt: "LED screen announcing Parokya ni Manoy as Syntax Valorant Cup champions", wide: true },
    {
      file: "senior-high",
      caption: "Senior high, 2022–2023",
      alt: "Raywel posing behind a frosted glass window",
      story: "The days you don't even think about having a bad day. You just live your life. Good times."
    },
    {
      file: "first-1x1",
      caption: "My first 1x1",
      alt: "Raywel's first 1x1 ID photo from senior high, lying on a brown envelope",
      story: "My very first 1x1, from senior high. I still use it now that I'm in college."
    },
    { file: "cat-cameo", caption: "Cat cameo", alt: "Raywel holding a black cat" },
    { file: "nubi", caption: "Nubi, my cat", alt: "Nubi, a black cat, next to a blurred bunch of sunflowers" },
    { file: "behind-the-camera", caption: "Behind the camera", alt: "A hand on a camera whose screen shows the lens" },
    { file: "the-squad", caption: "The squad", alt: "A big group selfie with friends" },
    {
      file: "sti-elevator",
      caption: "The STI elevator",
      alt: "The red floor number glowing inside a dark elevator",
      story: "Where all our STI shenanigans happened. Every laugh, every scare, every talk."
    },
    {
      file: "first-impressions",
      caption: "First impressions",
      alt: "A note of my classmates' first impressions of me: friendly, calm, nonchalant, tahimik, pwede na, saks lang, friendly, ayos lang, nice voice, tahimik parang si Mark, super friendly grabe 'di ko inexpect, palahi, friendly, mukhang tamad masipag",
      story: "My classmates' first impressions of me. Palahi means \"I like your genes, can I have some?\"",
      wide: true,
      fit: "contain"
    },
    {
      file: "synthetix",
      caption: "Synthetix",
      alt: "Raywel in sunglasses holding up a flyer at Synthetix, our senior high school expo",
      story: "Our senior high school expo."
    },
    {
      file: "fit-check",
      caption: "Maybe",
      alt: "Raywel standing in a studio with posters and a floor lamp",
      story: "It's you."
    },
    {
      file: "flower-wall",
      caption: "You noticed my favourite sweater, huh?",
      alt: "Raywel in his favourite sweater in front of a giant red flower installation",
      story: "Yeah, I wear it a lot."
    }
  ],

  links: [
    { label: "Email", value: "raywelfrancismartin@gmail.com", url: "mailto:raywelfrancismartin@gmail.com" },
    { label: "Instagram", value: "@_matimbu", url: "https://instagram.com/_matimbu" },
    { label: "YouTube", value: "@Jenduks", url: "https://www.youtube.com/@Jenduks" },
    { label: "TikTok", value: "@matimbu_", url: "https://www.tiktok.com/@matimbu_" },
    { label: "Portfolio", value: "matimbu.github.io/portfolio", url: "https://matimbu.github.io/portfolio/" },
    { label: "GitHub", value: "Matimbu", url: "https://github.com/Matimbu" },
    { label: "LinkedIn", value: "Raywel Francis Martin", url: "https://www.linkedin.com/in/raywel-francis-martin-07a73b3b8/" },
    { label: "Discord", value: "Matimbu", url: "https://discord.com/users/736265496479006811" },
    { label: "Valorant", value: "Jenduks#Tent", url: "" }
  ]
};
