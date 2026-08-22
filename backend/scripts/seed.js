/**
 * SEED-1 — Demo seed data: 50 realistic reports across major US cities
 * Usage: node backend/scripts/seed.js
 * Requires: DATABASE_URL in .env (or default local DB config)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/db');

const CITIES = [
  { name: 'New York, NY',      lat: 40.7128,  lng: -74.0060 },
  { name: 'Los Angeles, CA',   lat: 34.0522,  lng: -118.2437 },
  { name: 'Chicago, IL',       lat: 41.8781,  lng: -87.6298 },
  { name: 'Houston, TX',       lat: 29.7604,  lng: -95.3698 },
  { name: 'Phoenix, AZ',       lat: 33.4484,  lng: -112.0740 },
  { name: 'Philadelphia, PA',  lat: 39.9526,  lng: -75.1652 },
  { name: 'San Antonio, TX',   lat: 29.4241,  lng: -98.4936 },
  { name: 'San Diego, CA',     lat: 32.7157,  lng: -117.1611 },
  { name: 'Dallas, TX',        lat: 32.7767,  lng: -96.7970 },
  { name: 'Austin, TX',        lat: 30.2672,  lng: -97.7431 },
]

const HAZARD_TYPES = [
  'Pothole / Road Damage',
  'Broken Street Light',
  'Fallen Tree / Branch',
  'Flooding / Drainage Issue',
  'Abandoned Vehicle',
  'Graffiti / Vandalism',
  'Illegal Dumping',
  'Gas Leak / Utility Hazard',
  'Structural Damage',
  'Environmental Hazard',
  'Other',
]

const SEVERITIES = ['low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical']

const STATUSES = [
  'active', 'active', 'active',
  'under_review', 'under_review',
  'under_construction',
  'being_monitored',
  'partially_fixed',
  'resolved', 'resolved',
]

const DESCRIPTIONS = {
  'Pothole / Road Damage': [
    'Large pothole on main intersection causing tire damage to vehicles.',
    'Road surface cracked and sinking near storm drain, worsening after rain.',
    'Multiple potholes stretching 30 metres along the bike lane.',
  ],
  'Broken Street Light': [
    'Street light has been out for two weeks, creating a safety hazard at night.',
    'Flickering lamp at the pedestrian crossing — confusing for drivers.',
    'Three consecutive lights non-functional on this block.',
  ],
  'Fallen Tree / Branch': [
    'Large branch down across the sidewalk after last night\'s storm. Blocking path.',
    'Entire tree fell into the road, partially blocking one lane of traffic.',
    'Dead tree leaning dangerously over parked cars — needs removal.',
  ],
  'Flooding / Drainage Issue': [
    'Intersection floods every time it rains — standing water for days.',
    'Storm drain completely blocked with debris, water backing up onto street.',
    'Basement of community centre flooding due to blocked municipal drain.',
  ],
  'Abandoned Vehicle': [
    'Black sedan abandoned for over 3 weeks, license plate covered.',
    'RV parked illegally for a month, leaking fluids onto the road.',
    'Van with flat tyres abandoned in a fire lane.',
  ],
  'Graffiti / Vandalism': [
    'Bus shelter windows smashed and graffiti sprayed on adjacent wall.',
    'New graffiti on the side of the community library.',
    'Park benches overturned and spray-painted overnight.',
  ],
  'Illegal Dumping': [
    'Large pile of construction waste dumped at end of cul-de-sac.',
    'Mattresses and old appliances dumped in the alleyway behind the shops.',
    'Bags of residential waste fly-tipped on the verge of the park.',
  ],
  'Gas Leak / Utility Hazard': [
    'Strong smell of gas coming from a manhole cover on the corner. Marked with cone.',
    'Exposed live electrical wire visible at base of broken utility pole.',
    'Gas smell reported near apartment building entrance — residents concerned.',
  ],
  'Structural Damage': [
    'Retaining wall along the footpath is crumbling and leaning outward.',
    'Guardrail on bridge completely missing after vehicle collision last week.',
    'Large crack in the pedestrian bridge deck — appears to be widening.',
  ],
  'Environmental Hazard': [
    'Oil sheen on surface of the creek near the industrial estate outflow.',
    'Smoke visible from open burning in the vacant lot on north side.',
    'Chemical smell near old factory site — residents reporting headaches.',
  ],
  'Other': [
    'Manhole cover missing — open hole in road surface, extremely dangerous.',
    'Traffic signal stuck on red in both directions for over an hour.',
    'Bollard knocked over onto the cycle path — blocking wheelchair access.',
  ],
}

function jitter(coord, amount = 0.04) {
  return coord + (Math.random() - 0.5) * amount
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

async function seed() {
  console.log('🌱 Starting seed…')

  // Find or create a seed admin user
  let seedUserId
  const existing = await pool.query("SELECT id FROM users WHERE email = 'seed@hetusafe.com' LIMIT 1")
  if (existing.rows.length) {
    seedUserId = existing.rows[0].id
    console.log(`   Using existing seed user id=${seedUserId}`)
  } else {
    const bcrypt = require('bcrypt')
    const hash = await bcrypt.hash('SeedPassword123!', 12)
    const inserted = await pool.query(
      `INSERT INTO users (name, email, password_hash, is_verified, role, created_at)
       VALUES ('Seed User', 'seed@hetusafe.com', $1, true, 'user', NOW())
       RETURNING id`,
      [hash]
    )
    seedUserId = inserted.rows[0].id
    console.log(`   Created seed user id=${seedUserId}`)
  }

  // Build 50 reports
  const reports = []
  for (let i = 0; i < 50; i++) {
    const city = randomItem(CITIES)
    const hazardType = randomItem(HAZARD_TYPES)
    const descs = DESCRIPTIONS[hazardType]
    reports.push({
      user_id: seedUserId,
      hazard_type: hazardType,
      description: randomItem(descs),
      severity: randomItem(SEVERITIES),
      status: randomItem(STATUSES),
      latitude: jitter(city.lat),
      longitude: jitter(city.lng),
      address: `Near ${city.name}`,
      created_at: daysAgo(Math.floor(Math.random() * 60)),
    })
  }

  let inserted = 0
  for (const r of reports) {
    try {
      await pool.query(
        `INSERT INTO reports
           (user_id, hazard_type, description, severity, status, latitude, longitude, address, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [r.user_id, r.hazard_type, r.description, r.severity, r.status, r.latitude, r.longitude, r.address, r.created_at]
      )
      inserted++
    } catch (err) {
      console.warn(`   ⚠️  Skipped report (${r.hazard_type}): ${err.message}`)
    }
  }

  console.log(`✅ Seeded ${inserted}/50 reports successfully.`)
  await pool.end()
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
