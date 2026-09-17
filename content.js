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

  marquee: ["C#", "Graphic design", "Basketball", "Valorant", "WinForms", "Photoshop", "Video editing", "Unity", "Figma", "The Court's Coder"],

  about: [
    "I'm Ray, also known as Matimbu. On the court, some people call me Yao Ming, The Court's Coder.",
    "My professional side lives in my [portfolio](https://matimbu.github.io/portfolio/). This page is everything else: the things I make for fun, what I do with my free time, what I believe in, and where to find me online.",
    "TODO: add a few lines a recruiter wouldn't hear. Where you grew up, what got you into tech, what your friends know you for."
  ],

  now: [
    "Studying BSIT at STI College Malolos",
    "Looking for OJT / junior dev roles",
    "TODO: a show, game or song on repeat"
  ],

  // `image` is optional (shows when you hover the row). Use a link or a
  // file in the assets/ folder, e.g. "assets/poster.png".
  crafts: [
    {
      title: "The Hive Kiosk",
      tags: ["Code", "C#", "GDI+"],
      year: "2025",
      emoji: "🐝",
      image: "https://matimbu.github.io/portfolio/images/kiosk/01-welcome.png",
      link: "https://matimbu.github.io/portfolio/"
    },
    {
      title: "Cheesy Potato Balls",
      tags: ["Poster", "Photoshop"],
      year: "2025",
      emoji: "🎨",
      image: "https://matimbu.github.io/portfolio/images/CHEESY%20POTATO%20BALLS.png",
      link: "https://matimbu.github.io/portfolio/#featured"
    },
    {
      title: "Memory videos",
      tags: ["Video", "Editing"],
      year: "2023",
      emoji: "🎬",
      image: "https://i.ytimg.com/vi/wZsDlJYYQDI/maxresdefault.jpg",
      link: "https://www.youtube.com/@Jenduks"
    },
    {
      title: "TODO: Unity project",
      tags: ["Game", "Unity 3D"],
      year: "TODO",
      emoji: "🎮",
      image: "",
      link: ""
    }
  ],

  hobbies: [
    { emoji: "🏀", title: "Basketball", text: "Where I switch off from code. Want to talk hoops? Message me." },
    { emoji: "🖌️", title: "Graphic design", text: "Posters, layouts, and messing around in Photoshop and Figma." },
    { emoji: "🎮", title: "Valorant", text: "Playing with friends and clipping the moments worth keeping, like using a teammate as a Sova drone." },
    { emoji: "🎧", title: "TODO: Music?", text: "TODO: what's on your playlist." }
  ],

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
    }
  ],

  links: [
    { label: "Email", value: "raywelfrancismartin@gmail.com", url: "mailto:raywelfrancismartin@gmail.com" },
    { label: "Instagram", value: "@_matimbu", url: "https://instagram.com/_matimbu" },
    { label: "YouTube", value: "@Jenduks", url: "https://www.youtube.com/@Jenduks" },
    { label: "Portfolio", value: "matimbu.github.io/portfolio", url: "https://matimbu.github.io/portfolio/" },
    { label: "GitHub", value: "Matimbu", url: "https://github.com/Matimbu" },
    { label: "LinkedIn", value: "Raywel Francis Martin", url: "https://www.linkedin.com/in/raywel-francis-martin-07a73b3b8/" },
    { label: "Discord", value: "Matimbu", url: "https://discord.com/users/736265496479006811" },
    { label: "Valorant", value: "Jenduks#Tent", url: "" }
  ]
};
