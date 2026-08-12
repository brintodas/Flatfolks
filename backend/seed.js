const db = require('./config/db');

const locations = [
  "Mirpur 10, Dhaka", "Dhanmondi, Dhaka", "Gulshan 1, Dhaka", "Banani, Dhaka", 
  "Uttara Sector 4, Dhaka", "Mohammadpur, Dhaka", "Badda, Dhaka", "Khilgaon, Dhaka", 
  "Malibagh, Dhaka", "Farmgate, Dhaka", "Rampura, Dhaka", "Baily Road, Dhaka", 
  "Motijheel, Dhaka", "Baridhara, Dhaka", "Jatrabari, Dhaka", "Savar, Dhaka", 
  "Gazipur, Dhaka", "Tongi, Dhaka", "Narayanganj, Dhaka", "Keraniganj, Dhaka", 
  "Azimpur, Dhaka", "Shantinagar, Dhaka", "Kakrail, Dhaka"
];

const genders = ['male', 'female', 'any'];
const leaseDurations = ['1 month', '3 months', '6 months', '1 year', 'flexible'];

// pick a random move-in date in the next 90 days, or null for "immediate"
function randomAvailableFrom() {
  if (Math.random() < 0.4) return null // immediate move-in
  const daysAhead = Math.floor(Math.random() * 90)
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

let count = 0;

for (let i = 0; i < 23; i++) {
  const title = `Apartment in ${locations[i].split(',')[0]}`;
  const rent = 7000 + (Math.floor(Math.random() * 5) * 1000);
  const distance = (Math.random() * 8).toFixed(1); // 0 - 8 km from campus
  const availableFrom = randomAvailableFrom();
  const sql = `
    INSERT INTO listings (title, rent, location, beds, gender_preference, furnished, utilities_included, lease_duration, distance_to_campus, available_from, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `;
  const values = [
    title,
    rent,
    locations[i],
    1,
    genders[Math.floor(Math.random() * genders.length)],
    Math.random() > 0.5 ? 1 : 0,
    Math.random() > 0.5 ? 1 : 0,
    leaseDurations[Math.floor(Math.random() * leaseDurations.length)],
    distance,
    availableFrom
  ];

  db.query(sql, values, (err) => {
    if (err) {
      console.log('Error:', err);
    } else {
      count++;
      if (count === 23) {
        console.log('Inserted 23 listings successfully');
        process.exit(0);
      }
    }
  });
}