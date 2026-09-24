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
  motto: "Focus on what I can control.", // signs off the footer

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
    { emoji: "📷", photo: "assets/me-camera.jpg", badge: "📷" },
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
  // Sova's wall also uses `pick` (click: the game's agent select comes up
  // under the picture, with the wall's `ign` as the player; LOCK IN replays
  // the lock-in and Sova fires his bow), `drone` (tap to launch the Owl Drone), `ping` (hover
  // or tap: a Recon Bolt ping that reveals the other words), `shock` (hover or
  // tap: a Shock Bolt burst of sparks), `beam` (hover or tap: Hunter's Fury
  // on the real ult's timing) and `hud` (hover: the Owl Drone's HUD around the
  // cursor for a few seconds), all in Sova's blue. `key` shows a keycap and
  // makes that key use the ability while the wall is on screen, like the game.
  // `desc` (Riot's own wording) shows in the agent select when you hover the
  // ability's key there.
  // `section` picks where a wall goes (default: the About section).
  // `art` shows a picture beside the words (`glow` tints the light behind it;
  // `lockIn: true` scans it in behind a line of blue, like locking in an agent);
  // `notice` adds a line under the wall (e.g. Riot's fan-content notice).
  // `layout: "cards"` shows each word as a photo card (`image`, `pos`, `alt`);
  // `credit` can also be a list when a card uses more than one photo.
  // `specs` lists small settings under the words; `copy: true` adds a Copy button.
  // `lightUp: true` lights the words one by one as you scroll through the wall.
  // Add more walls to the list and they show up in the same style.
  walls: [
    {
      label: "Also known as",
      shuffle: true, // the words shuffle their letters once as the wall arrives
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
      label: "On the court",
      section: "hobbies",
      lightUp: true, // the words light up one after another as you read, like a play being called
      intro: "Where I play and what I go to.",
      words: [
        { text: "Center", note: "or the 3, on the wing", top: true },
        { text: "6 ft", note: "easy fouls in the post" },
        { text: "Triple threat", note: "jab right, explode left, reverse on the right side" },
        { text: "Drop step spin", note: "and one!" }
      ]
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
      ign: "Jenduks", // my in-game name: on the agent select card and the kill feed
      role: "Initiator", // over the agent's name on the agent select
      soundSwitch: true, // an on/off switch for the wall's sounds
      intro: "Sova main. Some of the clips are on my YouTube and TikTok.",
      art: { src: "assets/valorant/sova.webp", alt: "Official art of Sova, the Valorant agent", glow: "#355285", lockIn: true },
      notice: "\u201cRaywel Martin\u201d (this site) was created under Riot Games' \u201cLegal Jibber Jabber\u201d policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.",
      specs: [
        { label: "Crosshair", value: "0;p;0;c;1;s;1;P;u;000000FF;h;0;f;0;m;1;0l;2;0v;2;0o;0;0a;1;0f;0;1b;0;A;c;8;d;1;b;1;0b;0;1b;0;S;d;0", copy: true },
        { label: "Sens", value: "0.37" },
        { label: "DPI", value: "800" }
      ],
      words: [
        { text: "Sova", note: "main · Initiator", top: true, face: "assets/valorant/sova-icon.webp", pick: true },
        {
          text: "Recon Bolt",
          note: "reveals enemies",
          ping: true,
          key: "E",
          desc: "Sticks where it lands and scans twice, showing anyone in its line of sight.",
          stat: "2 scans · 40s cooldown · shootable",
          icon: "assets/valorant/abilities/recon-bolt.webp"
        },
        {
          text: "Owl Drone",
          note: "or my teammate, apparently",
          link: "https://www.tiktok.com/@matimbu_/video/7121951680408669442",
          hud: true,
          key: "C",
          desc: "Fly the drone and dart someone to light them up for the team.",
          stat: "7s flight · one dart · shootable",
          icon: "assets/valorant/abilities/owl-drone.webp"
        },
        {
          text: "Shock Bolt",
          note: "the explosive one",
          shock: true,
          key: "Q",
          desc: "An explosive arrow. Bank it off walls to hit what you cannot see.",
          stat: "2 bounces · 75 damage · 150 creds",
          icon: "assets/valorant/abilities/shock-bolt.webp"
        },
        {
          text: "Hunter's Fury",
          note: "ultimate · hits through walls",
          link: "https://www.tiktok.com/@matimbu_/video/7032101516244782337",
          beam: true,
          key: "X",
          desc: "Three energy blasts straight through walls. They damage and reveal.",
          stat: "3 blasts · 80 damage · 8 ult points",
          icon: "assets/valorant/abilities/hunters-fury.webp"
        }
      ]
    }
  ],

  // "The story so far" in About: one row per year, oldest first.
  // `medals` adds gold medals to the title; `photo` (a gallery file name)
  // adds a button that opens that photo; `until` shows "to now" under the year;
  // `runner: true` sends a tiny runner along the row's line as you read it,
  // Subway Surfers style (Malolos Rush plays like it): hopping, grabbing coins.
  story: {
    label: "The story so far",
    intro: "How I got here.",
    items: [
      { year: "2021", title: "Pandemic days", text: "Senior high at STI, in the middle of the pandemic." },
      { year: "2022", title: "Coming of age", text: "After the pandemic, back in person. Where my adolescence really began." },
      {
        year: "2023",
        title: "Two golds",
        medals: 2,
        photo: "valorant-champs",
        text: "April 19, my team won the Syntax Valorant Cup. Then the STI Malolos intramurals: everyone bashed our upper-bracket games, so we made a Cinderella run through the lower bracket and took that gold too."
      },
      {
        year: "2024",
        until: "now",
        title: "College days",
        text: "Where the maturity began. Every kind of hardship: physical, mental, emotional, spiritual. And the most important lesson of all, the wisdom of life."
      },
      { year: "2026", title: "Malolos Rush", text: "Building my capstone game in Unity.", runner: true }
    ]
  },

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
      // several `images` flip like a flipbook while you hover the row
      images: [
        "https://i.ytimg.com/vi/wZsDlJYYQDI/maxresdefault.jpg",
        "https://i.ytimg.com/vi/IrMJpBgpFjY/maxresdefault.jpg"
      ],
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
      images: [
        "https://matimbu.github.io/portfolio/images/kiosk/01-welcome.png",
        "https://matimbu.github.io/portfolio/images/kiosk/02-menu.png",
        "https://matimbu.github.io/portfolio/images/kiosk/03-product.png",
        "https://matimbu.github.io/portfolio/images/kiosk/04-cart.png",
        "https://matimbu.github.io/portfolio/images/kiosk/05-payment.png",
        "https://matimbu.github.io/portfolio/images/kiosk/06-receipt.png"
      ],
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
    "*Focus on what I can control.* Not what happens, not other people, not the outcome. Only my thoughts, choices and actions. Humble with the result, a monster with the work.",
    "*Learn by building.* Things stick when I make something and work out where I got stuck.",
    "*Be honest about what you know.* I'd rather say what I'm still learning than pretend I've figured it all out.",
    "*People change, memories don't.* When something moves me, I film it so I get to keep the moment."
  ],

  // Video IDs come from the URL: youtube.com/watch?v=THIS_PART or
  // youtube.com/shorts/THIS_PART. `featuredVideo` plays right on the page.
  // `cover` (optional) shows a picture made for the clip in place of the one
  // YouTube generates.
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
        { title: "BAIT MY TEAMMATE", note: "Short", id: "1QQ4ncdYBoA", short: true, cover: "assets/youtube/bait-my-teammate.jpg" },
        { title: "NEVER BACK DOWN NEVER WHAT?", note: "Short", id: "lXQqb-qdOAg", short: true, cover: "assets/youtube/sova-clutch.jpg" },
        // the ace: called by what it is, with its real title as the note
        { title: "RAZE ACE", note: "calmado", id: "WWy2S5vndPk", short: true, cover: "assets/youtube/raze-ace-glitchpop.jpg" }
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
  // An item with `video` (a YouTube id) is a clip: `cover` is its picture and
  // the viewer plays it instead of opening a photo.
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
    {
      file: "valorant-champs",
      caption: "Syntax Valorant Cup champions",
      alt: "LED screen announcing Parokya ni Manoy as Syntax Valorant Cup champions",
      wide: true,
      story: "April 19, 2023. One of two golds from our Valorant run."
    },
    {
      file: "it-congress",
      caption: "The First IT Congress",
      alt: "Raywel's certificate of participation from the First IT Congress at STI College Malolos, signatures blurred",
      wide: true,
      story: "April 24, 2023, STI College Malolos. Five days after the Syntax Cup."
    },
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
      story: "My classmates' first impressions of me. Palahi means \"pogi mo masyado.\"",
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
    },
    {
      file: "converse",
      caption: "My go-to sneaker",
      alt: "Raywel's white Converse on gravel next to his black Converse on concrete",
      wide: true,
      story: "All-time favourite, whatever the OOTD."
    },
    {
      cover: "assets/youtube/raze-ace-glitchpop.jpg",
      video: "WWy2S5vndPk",
      caption: "Raze ace",
      alt: "The last kill of the ace with the Glitchpop Vandal, five down in one round",
      fit: "contain",
      story: "Five down, one round."
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
