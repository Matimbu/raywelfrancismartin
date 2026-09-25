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

  // What's new on the site, newest first, shown in a small pill over my name
  // (rolling through them). Someone who's been here before sees only what's
  // new since their last visit; anything older than 30 days never shows.
  // `href` is a spot on the page (#five, #court, #channels...) or a page.
  recent: [
    { date: "2026-09-25", text: "My MyCAREER card, on the court", href: "#court" },
    { date: "2026-09-25", text: "Malolos Rush: outrun the guard to Casa Real", href: "#malolos-rush" },
    { date: "2026-09-25", text: "Malolos Rush, a mini game", href: "#crafts" },
    { date: "2026-09-25", text: "2K26 cards for my starting five", href: "#five" },
    { date: "2026-09-24", text: "Airball, a basketball game", href: "airball" },
    { date: "2026-09-24", text: "Covers for my clips", href: "#channels" }
  ],

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
    { emoji: "🎨", photo: "assets/me-shop.webp", badge: "🎨" },
    { emoji: "🎮", photo: "assets/me-cafe.webp", badge: "🎮" },
    { emoji: "📷", photo: "assets/me-camera.webp", badge: "📷" },
    { emoji: "🏀", photo: "assets/me-sofa.webp", badge: "🏀" }
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
  // A card's `card` turns its photo over into an NBA 2K26 MyTEAM card in the
  // G.O.A.T. card's style (hover on computers, tap on phones), and the cards
  // open like a pack the first time they're on screen: `ovr`, `tier`
  // ("G.O.A.T.", "Invincible", "Dark Matter", "Galaxy Opal", "Pink Diamond",
  // "Diamond", or my own "Sixth Man"), a `label` if the card's painted name
  // isn't its tier (like Rondo's Certified), the `name` on it, the jersey
  // `num`, a `pos` for the card if it isn't the word's, three `badges`, each
  // [name, level] with the level "Legend", "HOF", "Gold", "Silver" or
  // "Bronze", and four `stats`, each [attribute, rating] (the card's second
  // layer; the best one is the last clue of its walkout). `build` puts the
  // whole build over those, a bar per rating like 2K26's attribute upgrades
  // screen: 21 ratings in its order (Close Shot, Driving Layup, Driving Dunk,
  // Standing Dunk, Post Control, Mid-Range, Three-Point, Free Throw, Pass
  // Accuracy, Ball Handle, Speed with Ball, Interior D, Perimeter D, Steal,
  // Block, Off. Rebound, Def. Rebound, Speed, Agility, Strength, Vertical), or
  // one number for all of them. `hidden: true` keeps a card off the page.
  // `id` gives a wall an address on the page (#five). `cut` is the player cut out of a photo
  // (a 600 x 800 transparent WebP in the card's shape), so he stands in front
  // of the frame and breaks over its top; without it the photo goes inside.
  // `cards` (a list) stacks two cards in one spot: each has its own `image`
  // (and `cut`) and a `short` name, and the names under the card choose which
  // one is in front. `creditLead` starts the wall's credit line.
  // `board: true` draws the words on a coach's play board beside the wall, one
  // step for each word as it lights up (made for On the court with `lightUp`);
  // the board also has a Horns set to switch to.
  // `player` puts one photo card of its own (a word with a `card`) under the
  // wall's intro. A card with `style: "career"` is drawn like 2K26's MyCAREER
  // builds card instead (`face`, `archetype`, `size`, `jumper`, `allBadges`).
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
          face: "assets/aka/yao-ming-rockets-face.webp",
          image: "assets/aka/yao-ming-rockets.webp",
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
          face: "assets/aka/wemby-tall-face.webp",
          image: "assets/aka/wemby-tall.webp"
        },
        { text: "Jenduks", note: "Valorant · YouTube" },
        { text: "Wel", note: "from Raywel" },
        { text: "Martin", note: "the last name" }
      ],
      notice: "The Wemby photo belongs to its photographer."
    },
    {
      label: "On the court",
      id: "court", // the page address for this wall (#court)
      section: "hobbies",
      lightUp: true, // the words light up one after another as you read, like a play being called
      board: true, // and a coach's board draws the move, one step per word
      intro: "Where I play and what I go to.",
      // my player, under the intro: the photo holding my custom jacket;
      // turned over, my NBA 2K26 MyCAREER build (the closest to how I really
      // play) on a card like the game's builds screen, my player's face in
      // the ring, in G.O.A.T. gold, with my player's name. `build` is its 21
      // ratings as they are now, `badges` its best three, `jumper` my custom
      // jump shot with its grades (both on the Attributes side), and
      // `allBadges` all 35 by group, each [name, level, what it does in my
      // own words], plus the 4 personality badges (the third side; tap a
      // badge there to read it).
      player: {
        pos: "My player", text: "Me", note: "the Court's Coder",
        image: "assets/five/raywel-jacket.webp", alt: "Me in sunglasses, holding my custom RAYWEL jacket at a clothing shop",
        card: {
          style: "career", ovr: 95, tier: "G.O.A.T.", label: "G.O.A.T. Build", name: "Raywel Martin", pos: "PF",
          player: "Yao Ming", // my MyPLAYER's name (and what they call me on the court)
          face: "assets/five/raywel-mycareer.webp",
          archetype: "2-Way Middy-Slashing Cleaner",
          size: "HT 6'8\" · WT 239 lbs · WS 7'1\"",
          jumper: {
            name: "Mochi",
            line: "Ray Allen base · Beluba / Rudy Gay releases, 65 / 35 · very quick",
            grades: [["Release height", "B+"], ["Release speed", "A+"], ["Defensive immunity", "A+"], ["Timing stability", "B"]]
          },
          badges: [["Pogo Stick", "Legend"], ["Posterizer", "HOF"], ["Aerial Wizard", "HOF"]],
          stats: [["Driving Dunk", 96], ["Defensive Rebound", 90], ["Vertical", 88], ["Mid-Range Shot", 87]],
          build: [43, 38, 96, 40, 70, 87, 83, 78, 66, 85, 75, 71, 85, 70, 71, 61, 90, 85, 80, 85, 88],
          // my animations (the card's Moves side)
          moves: [
            ["Dribble", [["Dribble style", "Zach LaVine"], ["Size-up", "Jayson Tatum"], ["Breakdown combos", "Michael Jordan"],
              ["Escape moves", "Jimmy Butler"], ["Combo moves", "Jayson Tatum"], ["Crossover", "Lonzo Ball"],
              ["Behind the back", "Paul George"], ["Spin", "Terry Rozier III"], ["Hesitation", "Paul George"],
              ["Stepback", "Devin Booker"], ["Triple threat", "Zach LaVine"], ["Park flashy pass", "Wizard"]]],
            ["Post", [["Post fade", "Michael Jordan"], ["Post hook", "Bam Adebayo"], ["Hop shot", "DeMar DeRozan"],
              ["Go-to shot", "Pro"], ["Motion style", "Ausar Thompson"]]]
          ],
          allBadges: [
            ["Finishing", [
              ["Posterizer", "HOF", "Better odds of dunking right over a defender."],
              ["Aerial Wizard", "HOF", "Finishes alley-oops and putbacks in the air."],
              ["Post Fade Phenom", "Gold", "Knocks down fadeaways out of the post."],
              ["Post Powerhouse", "Silver", "Backs defenders down and moves them in the post."],
              ["Post-Up Poet", "Silver", "Hooks, shimmies and drop steps go in more often."],
              ["Float Game", "Bronze", "Softer, surer floaters in the lane."],
              ["Hook Specialist", "Bronze", "A more reliable hook shot."],
              ["Physical Finisher", "Bronze", "Finishes layups through contact."]]],
            ["Shooting", [
              ["Slippery Off-Ball", "Gold", "Gets open off the ball and through screens."],
              ["Deadeye", "Silver", "Jumpers hold up better with a hand in the face."],
              ["Set Shot Specialist", "Silver", "Better standing still, feet set."],
              ["Shifty Shooter", "Silver", "Better shots off the dribble and on the move."],
              ["Limitless Range", "Bronze", "Shoots from well beyond the arc."]]],
            ["Playmaking", [
              ["Strong Handle", "HOF", "Hard to bump off the dribble."],
              ["Dimer", "Silver", "Teammates shoot better off my passes."],
              ["Handles for Days", "Silver", "Dribble moves tire me out less."],
              ["Unpluckable", "Silver", "Hard to strip the ball from."],
              ["Ankle Assassin", "Silver", "Dribble moves break ankles more often."],
              ["Lightning Launch", "Silver", "A quicker first step on the drive."],
              ["Break Starter", "Bronze", "Long outlet passes off a rebound."],
              ["Versatile Visionary", "Bronze", "Every kind of pass is more accurate."]]],
            ["Defense", [
              ["Pogo Stick", "Legend", "Back up in the air quickly after landing."],
              ["Off-Ball Pest", "HOF", "Hard to get open against, off the ball."],
              ["Pick Dodger", "Gold", "Slips through screens on defense."],
              ["High-Flying Denier", "Gold", "Big blocks coming over from the weak side."],
              ["Post Lockdown", "Silver", "Tougher to score on in the post."],
              ["Challenger", "Silver", "Better contests on jump shots."],
              ["Interceptor", "Silver", "Picks off more passes."],
              ["On-Ball Menace", "Silver", "Stays in front of the ball handler."],
              ["Paint Patroller", "Silver", "Blocks and contests at the rim."],
              ["Glove", "Bronze", "Strips the ball from dribblers and shooters."]]],
            ["Rebounding", [
              ["Box-Out Beast", "Gold", "Wins the box-out battles."],
              ["Rebound Chaser", "Gold", "Tracks down rebounds from farther away."],
              ["Immovable Enforcer", "Gold", "Holds ground against drivers and contact."],
              ["Brick Wall", "Silver", "Screens that hit hard and wear defenders down."]]],
            ["Personality", [
              ["Alpha Dog", "Personality", "Enhances the ability to rally teammates."],
              ["Enforcer", "Personality", "Adds more grit and toughness to a player."],
              ["Expressive", "Personality", "Not one to hide emotion during big moments."],
              ["Marketability", "Personality", "Has a charisma that can sell jerseys and tickets."]]]
          ]
        }
      },
      // each word calls up its play on the board (hover, or tap on phones)
      words: [
        { text: "Power forward", note: "not the 5: I'd rather run the floor", top: true, play: "horns" },
        { text: "6 ft", note: "easy fouls in the post", play: "post" },
        { text: "Back door", note: "my man overplays, I cut behind him", play: "back-door" },
        { text: "Drop step spin", note: "and one!", play: "post" }
      ]
    },
    {
      label: "My starting five",
      id: "five",
      section: "hobbies",
      intro: "My all-time five, if I got to pick.",
      layout: "cards",
      // the ratings, tiers and badges are the 2K cards I picked on 2kdb.net (MJ's stays ours)
      creditLead: "Photos via Wikimedia Commons, cropped and cut out: ", // the card players are cut out of them
      words: [
        {
          pos: "PG", text: "Rondo", note: "the passer",
          link: "https://en.wikipedia.org/wiki/Rajon_Rondo",
          image: "assets/five/rondo-celtics.webp", alt: "Rajon Rondo calling a play as he brings the ball up for the Celtics",
          card: {
            ovr: 99, tier: "Dark Matter", label: "Certified", name: "Rajon Rondo", num: 9, cut: "assets/five/cut/rondo-ball.webp",
            badges: [["Dimer", "HOF"], ["Versatile Visionary", "HOF"], ["Interceptor", "HOF"]],
            stats: [["Passing Vision", 99], ["Passing IQ", 99], ["Steal", 99], ["Perimeter Defense", 98]],
            build: [98, 98, 80, 25, 87, 97, 90, 85, 99, 97, 99, 95, 98, 99, 88, 97, 97, 99, 99, 87, 92]
          }
        },
        {
          pos: "SG", text: "Kobe", note: "Mamba mentality",
          link: "https://en.wikipedia.org/wiki/Kobe_Bryant",
          image: "assets/five/kobe-lakers.webp", alt: "Kobe Bryant driving to the basket for the Lakers",
          card: {
            ovr: 99, tier: "Dark Matter", label: "G.O.A.T.", name: "Kobe Bryant", num: 24, cut: "assets/five/cut/kobe-center.webp",
            badges: [["Clutch Shooter", "HOF"], ["Space Creator", "HOF"], ["Difficult Shots", "HOF"]],
            stats: [["Mid-Range Shot", 99], ["Shot IQ", 99], ["Post Fade", 99], ["Perimeter Defense", 99]],
            build: 99
          }
        },
        {
          pos: "SF", text: "MJ", note: "six rings",
          link: "https://en.wikipedia.org/wiki/Michael_Jordan",
          image: "assets/five/mj-bulls.webp", alt: "Michael Jordan rising for a jump shot for the Bulls",
          // the GOAT gets the G.O.A.T. card itself, in gold (was 99 Dark Matter)
          card: {
            ovr: 100, tier: "G.O.A.T.", name: "Michael Jordan", num: 23, cut: "assets/five/cut/mj.webp",
            badges: [["Clutch Shooter", "HOF"], ["Middy Magician", "HOF"], ["Clamps", "HOF"]],
            stats: [["Mid-Range Shot", 99], ["Driving Dunk", 99], ["Vertical", 98], ["Perimeter Defense", 97]]
          }
        },
        {
          pos: "PF", text: "LeBron", note: "the King",
          link: "https://en.wikipedia.org/wiki/LeBron_James",
          image: "assets/five/lebron-heat.webp", alt: "LeBron James cocking the ball back for a dunk with the Heat",
          card: {
            ovr: 99, tier: "G.O.A.T.", name: "LeBron James", num: 6, cut: "assets/five/cut/lebron-center.webp",
            badges: [["Posterizer", "Legend"], ["Versatile Visionary", "Legend"], ["High-Flying Denier", "Legend"]],
            stats: [["Driving Dunk", 99], ["Passing Vision", 99], ["Strength", 99], ["Speed with Ball", 99]],
            build: 99
          }
        },
        {
          pos: "C", text: "Yao / Shaq", note: "co-starters",
          image: "assets/five/yao-shaq-gold.webp", alt: "Yao Ming calling for the ball for the Rockets, and Shaquille O'Neal roaring in the Lakers' gold #34",
          // co-starters: two cards stacked, pick one with the names under it
          cards: [
            {
              short: "Yao", ovr: 99, tier: "G.O.A.T.", name: "Yao Ming", num: 11,
              image: "assets/five/yao-rockets.webp", cut: "assets/five/cut/yao.webp",
              badges: [["Hook Specialist", "Legend"], ["Paint Patroller", "Legend"], ["Post Up Poet", "Legend"]],
              stats: [["Post Hook", 99], ["Block", 99], ["Mid-Range Shot", 99], ["Free Throw", 99]],
              build: 99
            },
            {
              short: "Shaq", ovr: 99, tier: "Invincible", name: "Shaquille O'Neal", num: 34,
              image: "assets/five/shaq-gold.webp", cut: "assets/five/cut/shaq-gold.webp",
              badges: [["Post Powerhouse", "Legend"], ["Posterizer", "Legend"], ["Brick Wall", "Legend"]],
              stats: [["Standing Dunk", 99], ["Strength", 99], ["Post Control", 99], ["Offensive Rebound", 99]],
              build: 99
            }
          ],
          credit: [{ subject: "Yao Ming", by: "Keith Allison", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", source: "https://commons.wikimedia.org/wiki/File:Yao_Ming_(2310548923).jpg" }]
        }
      ],
      notice: "The Rondo, Kobe, MJ, LeBron and Shaq photos belong to their photographers."
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
      link: "", // repo is private
      game: true // the row opens a tiny playable teaser (rush.js)
    }
  ],

  hobbies: [
    // `link` + `linkText`: a small link under the card (here, the Airball
    // game on the site's 404 page: any address that doesn't exist)
    { emoji: "🏀", title: "Basketball", text: "Where I switch off from code. Want to talk hoops? Message me.", link: "airball", linkText: "Take a shot" },
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
    // It has to be playable on Spotify: re-uploads like "Sdp (Interlude) -
    // Extended version" by deprived have no preview, so nothing plays.
    // This is Travis Scott's own "sdp interlude" (Birds in the Trap Sing
    // McKnight, the original explicit version; the clean one is
    // 7wsRkLYcvCn4y18OKeMpvr).
    pick: "https://open.spotify.com/track/4gh0ZnHzaTMT1sDga7Ek0N"
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
      // Watch Me opens on a sneak peek of these, fanned out like the share
      // card: 3 or 5 ids from any channel here, left to right, the middle one
      // in front; each needs a `cover`. "Watch more" brings the players down.
      peek: ["7121951680408669442", "lXQqb-qdOAg", "WWy2S5vndPk", "1QQ4ncdYBoA", "7032101516244782337"],
      videos: [
        { title: "BNF BTG PNM", note: "15:54", id: "IrMJpBgpFjY" },
        { title: "batugans 22 - 23", note: "4:06", id: "wZsDlJYYQDI" },
        { title: "BAIT MY TEAMMATE", note: "Short", id: "1QQ4ncdYBoA", short: true, cover: "assets/youtube/bait-my-teammate.webp" },
        { title: "NEVER BACK DOWN NEVER WHAT?", note: "Short", id: "lXQqb-qdOAg", short: true, cover: "assets/youtube/sova-clutch.webp" },
        // the ace: called by what it is, with its real title as the note
        { title: "RAZE ACE", note: "calmado", id: "WWy2S5vndPk", short: true, cover: "assets/youtube/raze-ace-glitchpop.webp" }
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
        { title: "Owl Drone", note: "Clip", id: "7121951680408669442", cover: "assets/tiktok/owl-drone.webp" },
        { title: "Hunter's Fury", note: "Clip", id: "7032101516244782337", cover: "assets/tiktok/hunters-fury.webp" }
      ]
    }
  ],

  // "Snapshots" gallery. `file` is the name in assets/gallery/ (each photo
  // has -400, -600, -800 and -1600 WebP copies). `wide` photos span two columns.
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
      cover: "assets/youtube/raze-ace-glitchpop.webp",
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
    { label: "Discord", value: "Matimbu", url: "https://discord.com/users/736265496479006811", copy: true }, // tap to copy, ↗ opens it
    { label: "Valorant", value: "Jenduks#Tent", url: "" }
  ]
};
