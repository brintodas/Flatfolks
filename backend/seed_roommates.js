const db = require('./config/db');

const names = [
  "Ayesha Rahman", "Fahim Ahmed", "Sadia Islam", "Rakib Hasan", "Nusrat Jahan",
  "Mehedi Hasan", "Tania Akter", "Samiul Islam", "Farjana Yeasmin", "Tamim Iqbal",
  "Maha Alam", "Sajid Khan", "Riya Das", "Imran Hossain", "Sumaiya Parveen",
  "Shakil Mahmud", "Nadia Kabir", "Anik Sarker", "Jannatul Ferdous", "Tanvir Rahman",
  "Mithila Faruq", "Tariqul Islam", "Sabrina Haque", "Arifur Rahman", "Farhana Amin",
  "Kazi Nabil", "Tahsan Khan", "Ruma Akter", "Sabbir Rahman", "Iffat Ara"
];

const depts = ["CSE", "BBA", "EEE", "Pharmacy", "Architecture", "English", "Law"];
const areas = [
  { d: "Dhaka", a: "Banani" }, { d: "Dhaka", a: "Dhanmondi" }, { d: "Dhaka", a: "Gulshan" },
  { d: "Dhaka", a: "Bashundhara" }, { d: "Dhaka", a: "Uttara" }, { d: "Dhaka", a: "Mohakhali" },
  { d: "Dhaka", a: "Mirpur" }, { d: "Dhaka", a: "Badda" }, { d: "Gazipur", a: "Tongi" },
  { d: "Narayanganj", a: "Chashara" }
];
const roomTypes = ["single", "shared", "either"];
const timeframes = ["ASAP", "1 month", "3 months", "6 months"];
const allTags = ["Friendly", "Quiet", "Clean", "Studious", "Social", "Night Owl", "Early Bird", "Gym Goer", "Foodie", "Gamer"];
const genders = ["Male", "Female"];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTags() {
  const shuffled = allTags.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, randomInt(2, 4)).join(',');
}

async function seed() {
  console.log("Starting seed...");
  
  for (let i = 0; i < 30; i++) {
    const fullName = names[i];
    const email = fullName.toLowerCase().replace(/ /g, '.') + "@g.bracu.ac.bd";
    const password = "password123";
    const studentId = `2${randomInt(1,3)}${randomInt(10,30)}${randomInt(1000,9999)}`;
    const dept = randomElement(depts);
    const semester = `${randomInt(1, 12)}th`;
    const gender = randomElement(genders);
    const budgetMax = randomInt(8, 25) * 1000;
    const budgetMin = budgetMax - randomInt(2, 5) * 1000;
    const loc = randomElement(areas);
    
    // insert user
    const insertUserSql = `
      INSERT INTO users (role, full_name, email, password, student_id, department, semester, gender, budget_min, budget_max, preferred_district, preferred_area)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(insertUserSql, [
      'student', fullName, email, password, studentId, dept, semester, gender, budgetMin, budgetMax, loc.d, loc.a
    ], (err, result) => {
      if (err) {
        if (err.code !== 'ER_DUP_ENTRY') console.error(err);
        return;
      }
      
      const userId = result.insertId;
      
      const bio = `Hi! I'm ${fullName.split(' ')[0]}, a ${dept} student looking for a nice place in ${loc.a}.`;
      const roomType = randomElement(roomTypes);
      const timeframe = randomElement(timeframes);
      const tags = randomTags();
      const quizDone = Math.random() > 0.3 ? 1 : 0;
      
      let sleep = null, clean = null, noise = null, guest = null, smoke = null, study = null;
      if (quizDone) {
        sleep = randomInt(1, 3);
        clean = randomInt(1, 3);
        noise = randomInt(1, 3);
        guest = randomInt(1, 3);
        smoke = randomInt(1, 3);
        study = randomInt(1, 3);
      }
      
      const insertProfileSql = `
        INSERT INTO student_profiles (user_id, bio, budget_min, budget_max, preferred_district, preferred_area, move_in_timeframe, room_type, personality_tags, quiz_completed, sleep_schedule, cleanliness, noise_tolerance, guests_pref, smoking_pref, study_habits)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.query(insertProfileSql, [
        userId, bio, budgetMin, budgetMax, loc.d, loc.a, timeframe, roomType, tags, quizDone, sleep, clean, noise, guest, smoke, study
      ], (err2) => {
        if (err2) console.error(err2);
      });
    });
  }
  
  setTimeout(() => {
    console.log("Seeding complete. Use password 'password123' for all emails.");
    process.exit();
  }, 3000);
}

seed();
