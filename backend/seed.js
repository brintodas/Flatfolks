const db = require('./config/db');

const listings = [
  // ── 1-bedroom (single rooms / studio) ──
  { title: 'Single Room in Mirpur 10',        location: 'Mirpur 10, Dhaka',        beds: 1, rent: 7000,  gender: 'male',   furnished: 1, utilities: 0, lease: '1 month',  distance: 1.2 },
  { title: 'Single Room in Farmgate',          location: 'Farmgate, Dhaka',          beds: 1, rent: 8000,  gender: 'female', furnished: 1, utilities: 1, lease: '6 months', distance: 2.1 },
  { title: 'Student Room in Dhanmondi',        location: 'Dhanmondi, Dhaka',         beds: 1, rent: 9000,  gender: 'any',    furnished: 1, utilities: 0, lease: '6 months', distance: 3.4 },
  { title: 'Single Room in Mohammadpur',       location: 'Mohammadpur, Dhaka',       beds: 1, rent: 7500,  gender: 'male',   furnished: 0, utilities: 1, lease: '1 month',  distance: 0.9 },
  { title: 'Affordable Room in Rampura',       location: 'Rampura, Dhaka',           beds: 1, rent: 6500,  gender: 'any',    furnished: 0, utilities: 0, lease: 'flexible', distance: 5.3 },
  { title: 'Single Room in Jatrabari',         location: 'Jatrabari, Dhaka',         beds: 1, rent: 6000,  gender: 'male',   furnished: 1, utilities: 0, lease: '1 month',  distance: 7.8 },
  { title: 'Girls Hostel Room in Shantinagar', location: 'Shantinagar, Dhaka',       beds: 1, rent: 8500,  gender: 'female', furnished: 1, utilities: 1, lease: '6 months', distance: 4.1 },

  // ── 2-bedroom (suitable for 2-person groups) ──
  { title: 'Cozy 2BR Flat in Banani',          location: 'Banani, Dhaka',            beds: 2, rent: 18000, gender: 'any',    furnished: 1, utilities: 0, lease: '1 year',   distance: 4.7 },
  { title: '2-Bed Apartment in Uttara',        location: 'Uttara Sector 4, Dhaka',   beds: 2, rent: 16000, gender: 'male',   furnished: 1, utilities: 1, lease: '6 months', distance: 3.3 },
  { title: '2BR Semi-Furnished in Badda',      location: 'Badda, Dhaka',             beds: 2, rent: 13000, gender: 'any',    furnished: 0, utilities: 0, lease: '1 month',  distance: 5.5 },
  { title: 'Furnished 2BR in Baridhara',       location: 'Baridhara, Dhaka',         beds: 2, rent: 22000, gender: 'any',    furnished: 1, utilities: 1, lease: '1 year',   distance: 3.4 },
  { title: '2BR Flat Near Campus in Kakrail',  location: 'Kakrail, Dhaka',           beds: 2, rent: 15000, gender: 'any',    furnished: 0, utilities: 0, lease: '6 months', distance: 1.4 },
  { title: '2-Bedroom in Malibagh',            location: 'Malibagh, Dhaka',          beds: 2, rent: 14000, gender: 'male',   furnished: 1, utilities: 0, lease: '6 months', distance: 5.2 },
  { title: 'Spacious 2BR in Azimpur',          location: 'Azimpur, Dhaka',           beds: 2, rent: 17000, gender: 'any',    furnished: 0, utilities: 1, lease: 'flexible', distance: 7.3 },

  // ── 3-bedroom (suitable for 3-person groups) ──
  { title: 'Spacious 3BR in Gulshan',          location: 'Gulshan 1, Dhaka',         beds: 3, rent: 35000, gender: 'any',    furnished: 1, utilities: 1, lease: '1 year',   distance: 5.8 },
  { title: '3BR Flat in Khilgaon',             location: 'Khilgaon, Dhaka',          beds: 3, rent: 22000, gender: 'any',    furnished: 0, utilities: 0, lease: '6 months', distance: 5.4 },
  { title: '3-Bed Semi-Furnished in Motijheel',location: 'Motijheel, Dhaka',         beds: 3, rent: 25000, gender: 'any',    furnished: 0, utilities: 1, lease: '1 year',   distance: 2.9 },
  { title: '3BR Affordable in Gazipur',        location: 'Gazipur, Dhaka',           beds: 3, rent: 18000, gender: 'any',    furnished: 1, utilities: 0, lease: '3 months', distance: 4.4 },
  { title: '3-Bedroom in Narayanganj',         location: 'Narayanganj, Dhaka',       beds: 3, rent: 20000, gender: 'any',    furnished: 0, utilities: 0, lease: '1 year',   distance: 5.2 },

  // ── 4-bedroom (suitable for 4-person groups) ──
  { title: 'Large 4BR Flat in Uttara',         location: 'Uttara Sector 4, Dhaka',   beds: 4, rent: 45000, gender: 'male',   furnished: 1, utilities: 1, lease: '1 year',   distance: 3.0 },
  { title: '4BR Student House in Mohammadpur', location: 'Mohammadpur, Dhaka',       beds: 4, rent: 38000, gender: 'any',    furnished: 1, utilities: 0, lease: '1 year',   distance: 0.7 },
  { title: '4-Bedroom Flat in Keraniganj',     location: 'Keraniganj, Dhaka',        beds: 4, rent: 32000, gender: 'any',    furnished: 0, utilities: 0, lease: '6 months', distance: 3.2 },
  { title: 'Budget 4BR in Tongi',              location: 'Tongi, Dhaka',             beds: 4, rent: 28000, gender: 'male',   furnished: 1, utilities: 1, lease: 'flexible', distance: 2.4 },
];

const leaseDurations = ['1 month', '3 months', '6 months', '1 year', 'flexible'];

function randomAvailableFrom() {
  if (Math.random() < 0.4) return null
  const d = new Date()
  d.setDate(d.getDate() + Math.floor(Math.random() * 90))
  return d.toISOString().slice(0, 10)
}

const total = listings.length;
let count = 0;

db.query('DELETE FROM listings', (delErr) => {
  if (delErr) { console.error('Failed to clear listings:', delErr); process.exit(1); }
  console.log('Cleared existing listings. Seeding...');

  listings.forEach(l => {
    const sql = `
      INSERT INTO listings (title, rent, location, beds, gender_preference, furnished,
        utilities_included, lease_duration, distance_to_campus, available_from, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `;
    const values = [
      l.title, l.rent, l.location, l.beds, l.gender, l.furnished,
      l.utilities, l.lease, l.distance, randomAvailableFrom(),
    ];
    db.query(sql, values, (err) => {
      if (err) console.error('Insert error:', err);
      else count++;
      if (count === total) {
        console.log(`Inserted ${total} listings (1-bed: 7, 2-bed: 7, 3-bed: 5, 4-bed: 4)`);
        process.exit(0);
      }
    });
  });
});