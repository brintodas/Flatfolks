/**
 * seed_technicians.js
 * Populates realistic dummy technicians across all Dhaka areas for all service categories.
 */
const db = require('./config/db')

const areas = [
  'Badda',
  'Aftabnagar',
  'Banani',
  'Gulshan',
  'Dhanmondi',
  'Bashundhara',
  'Mirpur',
  'Uttara',
  'Mohakhali',
  'Khilgaon',
  'Malibagh',
  'Rampura',
  'Mohammadpur',
  'Lalmatia',
  'Baridhara',
  'Nikunja',
  'Farmgate',
  'Panthapath',
  'Shantinagar',
  'Bailey Road',
  'Wari',
  'Old Dhaka',
  'Mogbazar',
  'Tejgaon',
  'Cantonment',
  'Elephant Road',
  'Segunbagicha',
  'Motijheel',
  'Kakrail',
  'Khilkhet',
]

const namesByCat = {
  1: ['Rahim', 'Shafiq', 'Jashim', 'Kabir', 'Zakir', 'Anwar', 'Faruk', 'Habib'], // Electrician
  2: ['Karim', 'Jabbar', 'Biplob', 'Monir', 'Sohel', 'Sujon', 'Rasel', 'Dulal'],  // Plumber
  3: ['Rafiq', 'Nayan', 'Milon', 'Ashraf', 'Kamal', 'Babul', 'Masud', 'Jahangir'], // Gas Tech
  4: ['Salam', 'Kawsar', 'Al-Amin', 'Shamim', 'Tareq', 'Ripon', 'Hafiz', 'Shahid'], // Handyman
}

const phonePrefixes = ['01711', '01811', '01911', '01633', '01755', '01844', '01511', '01922', '01300', '01400']

async function seed() {
  console.log('Seeding technicians for all Dhaka areas...')

  const query = (sql, params = []) =>
    new Promise((resolve, reject) =>
      db.query(sql, params, (err, res) => (err ? reject(err) : resolve(res)))
    )

  try {
    for (let areaIndex = 0; areaIndex < areas.length; areaIndex++) {
      const area = areas[areaIndex]

      for (let catId = 1; catId <= 4; catId++) {
        // Check if technician already exists for this area & cat
        const existing = await query(
          'SELECT id FROM technicians WHERE area = ? AND service_category_id = ?',
          [area, catId]
        )

        if (existing.length === 0) {
          const namePool = namesByCat[catId]
          const name = namePool[(areaIndex + catId) % namePool.length]
          const prefix = phonePrefixes[(areaIndex * 3 + catId) % phonePrefixes.length]
          const suffix = String(100000 + ((areaIndex * 997 + catId * 123) % 900000))
          const phone = `${prefix}-${suffix.slice(0, 6)}`
          const rating = (4.6 + ((areaIndex + catId) % 4) * 0.1).toFixed(1)

          await query(
            'INSERT INTO technicians (service_category_id, name, phone, area, rating, is_available) VALUES (?, ?, ?, ?, ?, 1)',
            [catId, name, phone, area, rating]
          )
        }
      }
    }

    const total = await query('SELECT COUNT(*) as count FROM technicians')
    console.log(`Technicians seeding complete! Total technicians in database: ${total[0].count}`)
  } catch (err) {
    console.error('Error seeding technicians:', err)
  } finally {
    process.exit(0)
  }
}

seed()
