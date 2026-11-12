// Encyclopedia Module
const BODIES = [
  {
    id: 'mercury',
    name: 'Mercury',
    type: 'planet',
    symbol: '☿',
    description: 'The smallest and innermost planet, with extreme temperature variations and a heavily cratered surface.',
    stats: { radius: '2,440 km', gravity: '3.7 m/s²', temp: '-173 to 427°C', orbit: '88 days' },
    image: 'assets/encyclopedia/mercury.jpg',
    sites: [
      { name: 'Caloris Basin', desc: 'Massive impact basin, 1,550 km diameter' },
      { name: 'Rachmaninoff Crater', desc: 'Young double-ring basin with volcanic vents' },
    ],
  },
  {
    id: 'venus',
    name: 'Venus',
    type: 'planet',
    symbol: '♀',
    description: 'Earth\'s twin in size but with a runaway greenhouse atmosphere, crushing pressure, and volcanic plains.',
    stats: { radius: '6,052 km', gravity: '8.87 m/s²', temp: '462°C', orbit: '225 days' },
    image: 'assets/encyclopedia/venus.jpg',
    sites: [
      { name: 'Ishtar Terra', desc: 'Highland region with Maxwell Montes' },
      { name: 'Aphrodite Terra', desc: 'Equatorial highland, size of Africa' },
    ],
  },
  {
    id: 'earth',
    name: 'Earth',
    type: 'planet',
    symbol: '♁',
    description: 'Our home world — the only known planet with liquid water, life, and plate tectonics.',
    stats: { radius: '6,371 km', gravity: '9.81 m/s²', temp: '-89 to 58°C', orbit: '365 days' },
    image: 'assets/encyclopedia/earth.jpg',
    sites: [
      { name: 'Kerguelen Plateau', desc: 'Submerged microcontinent, analog for ocean worlds' },
      { name: 'McMurdo Dry Valleys', desc: 'Mars-like polar desert in Antarctica' },
      { name: 'Axel Heiberg Island', desc: 'High Arctic permafrost and springs' },
    ],
  },
  {
    id: 'mars',
    name: 'Mars',
    type: 'planet',
    symbol: '♂',
    description: 'The Red Planet — once wet, now cold and dry, with the largest volcano and canyon in the solar system.',
    stats: { radius: '3,390 km', gravity: '3.71 m/s²', temp: '-143 to 35°C', orbit: '687 days' },
    image: 'assets/encyclopedia/mars.jpg',
    sites: [
      { name: 'Jezero Crater', desc: 'Ancient lake delta, Perseverance rover site' },
      { name: 'Olympus Mons', desc: 'Largest volcano, 21 km high' },
      { name: 'Valles Marineris', desc: 'Canyon system 4,000 km long' },
    ],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    type: 'planet',
    symbol: '♃',
    description: 'Gas giant king with the Great Red Spot, powerful magnetosphere, and 95 known moons.',
    stats: { radius: '69,911 km', gravity: '24.79 m/s²', temp: '-110°C', orbit: '12 years' },
    image: 'assets/encyclopedia/jupiter.jpg',
    sites: [
      { name: 'Great Red Spot', desc: 'Anticyclonic storm, 16,000 km wide' },
      { name: 'Polar Cyclones', desc: 'Geometric storm clusters at poles' },
    ],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    type: 'planet',
    symbol: '♄',
    description: 'Ringed jewel of the solar system with the lowest density of any planet and 146 moons.',
    stats: { radius: '58,232 km', gravity: '10.44 m/s²', temp: '-140°C', orbit: '29 years' },
    image: 'assets/encyclopedia/saturn.jpg',
    sites: [
      { name: 'Hexagon Storm', desc: 'Persistent hexagonal jet stream at north pole' },
      { name: 'Ring System', desc: 'Ice and rock rings spanning 282,000 km' },
    ],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    type: 'planet',
    symbol: '♅',
    description: 'Ice giant tilted on its side with extreme seasons, faint rings, and 27 moons.',
    stats: { radius: '25,362 km', gravity: '8.69 m/s²', temp: '-224°C', orbit: '84 years' },
    image: 'assets/encyclopedia/uranus.jpg',
    sites: [
      { name: 'Miranda Cliff', desc: 'Verona Rupes, 20 km high cliff' },
      { name: 'Seasonal Poles', desc: '42-year day/night cycles' },
    ],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    type: 'planet',
    symbol: '♆',
    description: 'Windy ice giant with the fastest sustained winds, Great Dark Spot, and 16 moons.',
    stats: { radius: '24,622 km', gravity: '11.15 m/s²', temp: '-214°C', orbit: '165 years' },
    image: 'assets/encyclopedia/neptune.jpg',
    sites: [
      { name: 'Great Dark Spot', desc: 'Anticyclonic storm (observed 1989)' },
      { name: 'Triton Geysers', desc: 'Nitrogen geysers on largest moon' },
    ],
  },
  {
    id: 'moon',
    name: 'Moon',
    type: 'moon',
    symbol: '☾',
    description: 'Earth\'s companion — airless, cratered, with water ice at poles and lava tubes for shelter.',
    stats: { radius: '1,737 km', gravity: '1.62 m/s²', temp: '-173 to 127°C', orbit: '27.3 days' },
    image: 'assets/encyclopedia/moon.jpg',
    sites: [
      { name: 'South Pole', desc: 'Permanently shadowed craters with ice' },
      { name: 'Mare Tranquillitatis', desc: 'Apollo 11 landing site' },
      { name: 'Lava Tubes', desc: 'Potential radiation shelters' },
    ],
  },
  {
    id: 'phobos',
    name: 'Phobos',
    type: 'moon',
    symbol: '♂',
    description: 'Mars\' larger moon — doomed to crash or break up in ~50 million years.',
    stats: { radius: '11 km', gravity: '0.0057 m/s²', temp: '-40 to -112°C', orbit: '7.7 hours' },
    image: 'assets/encyclopedia/phobos.jpg',
    sites: [
      { name: 'Stickney Crater', desc: '9 km impact crater, nearly shattered Phobos' },
    ],
  },
  {
    id: 'deimos',
    name: 'Deimos',
    type: 'moon',
    symbol: '♂',
    description: 'Mars\' smaller, smoother moon — slowly spiraling outward.',
    stats: { radius: '6 km', gravity: '0.003 m/s²', temp: '-40°C', orbit: '30.3 hours' },
    image: 'assets/encyclopedia/deimos.jpg',
    sites: [
      { name: 'Smooth Regolith', desc: 'Thick dust covering, few craters visible' },
    ],
  },
  {
    id: 'io',
    name: 'Io',
    type: 'moon',
    symbol: '♃',
    description: 'Most volcanically active body in the solar system — 400+ active volcanoes.',
    stats: { radius: '1,821 km', gravity: '1.81 m/s²', temp: '-143 to 1,649°C', orbit: '1.8 days' },
    image: 'assets/encyclopedia/io.jpg',
    sites: [
      { name: 'Loki Patera', desc: 'Largest lava lake, 200 km wide' },
      { name: 'Pele Plume', desc: '300 km high volcanic plume' },
    ],
  },
  {
    id: 'europa',
    name: 'Europa',
    type: 'moon',
    symbol: '♃',
    description: 'Ocean world with global subsurface ocean — prime target for life search.',
    stats: { radius: '1,560 km', gravity: '1.31 m/s²', temp: '-220 to -160°C', orbit: '3.5 days' },
    image: 'assets/encyclopedia/europa.jpg',
    sites: [
      { name: 'Chaos Terrain', desc: 'Fractured ice sheets over ocean' },
      { name: 'Plumes', desc: 'Water vapor eruptions detected' },
    ],
  },
  {
    id: 'ganymede',
    name: 'Ganymede',
    type: 'moon',
    symbol: '♃',
    description: 'Largest moon in the solar system — bigger than Mercury, with its own magnetic field.',
    stats: { radius: '2,634 km', gravity: '1.43 m/s²', temp: '-160°C', orbit: '7.2 days' },
    image: 'assets/encyclopedia/ganymede.jpg',
    sites: [
      { name: 'Magnetosphere', desc: 'Only moon with intrinsic magnetic field' },
      { name: 'Grooved Terrain', desc: 'Ancient tectonic patterns' },
    ],
  },
  {
    id: 'callisto',
    name: 'Callisto',
    type: 'moon',
    symbol: '♃',
    description: 'Most heavily cratered body — ancient, dead world with possible subsurface ocean.',
    stats: { radius: '2,410 km', gravity: '1.24 m/s²', temp: '-193°C', orbit: '16.7 days' },
    image: 'assets/encyclopedia/callisto.jpg',
    sites: [
      { name: 'Valhalla Basin', desc: 'Multi-ring impact basin, 3,800 km wide' },
    ],
  },
  {
    id: 'titan',
    name: 'Titan',
    type: 'moon',
    symbol: '♄',
    description: 'Only moon with dense atmosphere — methane lakes, rivers, and organic chemistry.',
    stats: { radius: '2,575 km', gravity: '1.35 m/s²', temp: '-179°C', orbit: '16 days' },
    image: 'assets/encyclopedia/titan.jpg',
    sites: [
      { name: 'Kraken Mare', desc: 'Largest methane sea, 400,000 km²' },
      { name: 'Dragonfly Site', desc: 'NASA rotorcraft mission target (2034)' },
    ],
  },
  {
    id: 'enceladus',
    name: 'Enceladus',
    type: 'moon',
    symbol: '♄',
    description: 'Tiny ocean world erupting geysers — direct access to subsurface ocean.',
    stats: { radius: '252 km', gravity: '0.11 m/s²', temp: '-201°C', orbit: '1.4 days' },
    image: 'assets/encyclopedia/enceladus.jpg',
    sites: [
      { name: 'Tiger Stripes', desc: 'Fractures erupting water ice plumes' },
      { name: 'Organic Plumes', desc: 'Complex organics detected in spray' },
    ],
  },
  {
    id: 'triton',
    name: 'Triton',
    type: 'moon',
    symbol: '♆',
    description: 'Captured Kuiper Belt object — retrograde orbit, nitrogen geysers, cantaloupe terrain.',
    stats: { radius: '1,353 km', gravity: '0.78 m/s²', temp: '-235°C', orbit: '5.9 days' },
    image: 'assets/encyclopedia/triton.jpg',
    sites: [
      { name: 'Canteloupe Terrain', desc: 'Unique dimpled surface texture' },
      { name: 'Geysers', desc: 'Nitrogen plumes up to 8 km high' },
    ],
  },
  {
    id: 'pluto',
    name: 'Pluto',
    type: 'dwarf',
    symbol: '♇',
    description: 'King of the Kuiper Belt — heart-shaped glacier, blue skies, and 5 moons.',
    stats: { radius: '1,188 km', gravity: '0.62 m/s²', temp: '-233°C', orbit: '248 years' },
    image: 'assets/encyclopedia/pluto.jpg',
    sites: [
      { name: 'Tombaugh Regio', desc: 'Heart-shaped nitrogen glacier' },
      { name: 'Sputnik Planitia', desc: 'Young, convecting ice plain' },
    ],
  },
  {
    id: 'ceres',
    name: 'Ceres',
    type: 'dwarf',
    symbol: '⚳',
    description: 'Largest asteroid — only dwarf planet in inner solar system, with bright salt deposits.',
    stats: { radius: '473 km', gravity: '0.28 m/s²', temp: '-105°C', orbit: '4.6 years' },
    image: 'assets/encyclopedia/ceres.jpg',
    sites: [
      { name: 'Occator Crater', desc: 'Bright carbonate/salt deposits (faculae)' },
      { name: 'Ahuna Mons', desc: 'Lonely cryovolcano, 4 km high' },
    ],
  },
];

export function initEncyclopedia() {
  const container = document.getElementById('encyclopedia-content');
  if (!container) return;
  
  container.innerHTML = BODIES.map(body => `
    <article class="encyclopedia-card" style="
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.04);
      border-radius: var(--radius-lg);
      overflow: hidden;
      transition: var(--transition-base);
    ">
      <div style="
        aspect-ratio: 16/9;
        background: linear-gradient(135deg, var(--color-space-800), var(--color-space-900));
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      ">
        <img src="${body.image}" alt="${body.name}" style="
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.8;
          transition: var(--transition-base);
        " loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div style="
          display: none;
          font-size: 4rem;
          opacity: 0.3;
          color: var(--color-space-400);
        ">${body.symbol}</div>
      </div>
      <div style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
        <header style="display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap;">
          <h3 style="font-family: var(--font-display); font-size: 1.125rem; font-weight: 600; color: var(--color-space-50);">${body.name}</h3>
          <span style="
            font-size: 0.625rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            padding: 0.125rem 0.5rem;
            border-radius: var(--radius-full);
            background: ${body.type === 'planet' ? 'rgba(124,58,237,0.2)' : body.type === 'moon' ? 'rgba(6,182,212,0.2)' : 'rgba(245,158,11,0.2)'};
            color: ${body.type === 'planet' ? 'var(--color-nebula-400)' : body.type === 'moon' ? 'var(--color-aurora-400)' : 'var(--color-solar-400)'};
            border: 1px solid ${body.type === 'planet' ? 'rgba(124,58,237,0.3)' : body.type === 'moon' ? 'rgba(6,182,212,0.3)' : 'rgba(245,158,11,0.3)'};
            margin-left: auto;
          ">${body.type.charAt(0).toUpperCase() + body.type.slice(1)}</span>
        </header>
        <p style="font-size: 0.8125rem; color: var(--color-space-400); line-height: 1.6;">${body.description}</p>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.6875rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.04);">
          ${Object.entries(body.stats).map(([key, value]) => `
            <div><span style="color: var(--color-space-500);">${key}</span><br><strong>${value}</strong></div>
          `).join('')}
        </div>
        <div style="padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.04);">
          <h4 style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-space-500); margin-bottom: 0.5rem;">Notable Sites</h4>
          <div style="display: flex; flex-direction: column; gap: 0.375rem;">
            ${body.sites.map(site => `
              <div style="font-size: 0.75rem; color: var(--color-space-300); display: flex; gap: 0.5rem; align-items: flex-start;">
                <span style="color: var(--color-aurora-400); flex-shrink: 0;">▸</span>
                <div>
                  <strong style="color: var(--color-space-100);">${site.name}</strong>
                  <span style="color: var(--color-space-500);"> — ${site.desc}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </article>
  `).join('');
  
  // Add hover effects
  container.querySelectorAll('.encyclopedia-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-4px)';
      card.style.boxShadow = 'var(--shadow-xl)';
      card.style.borderColor = 'rgba(124,58,237,0.3)';
      const img = card.querySelector('img');
      if (img) img.style.opacity = '1';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
      card.style.borderColor = 'rgba(255,255,255,0.04)';
      const img = card.querySelector('img');
      if (img) img.style.opacity = '0.8';
    });
  });
}