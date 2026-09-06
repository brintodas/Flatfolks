const db = require('./config/db');
const q = (sql, params) => new Promise((resolve, reject) => db.query(sql, params, (e,r) => e?reject(e):resolve(r)));
const landlordId = 8;
const run = async () => {
  try {
    await q(`SELECT * FROM users WHERE id=?`, [landlordId]);
    console.log('p1 ok');
    await q(`SELECT l.id, l.title, l.property_group, l.rent, l.location, l.area, l.district,
              l.beds, l.photos, l.status, l.property_type,
              (SELECT COUNT(*) FROM tenancies t WHERE t.listing_id = l.id AND t.status = 'active') AS occupied
       FROM listings l WHERE l.landlord_id = ? AND l.status != 'inactive'`, [landlordId]);
    console.log('p2 ok');
    await q(`SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS review_count
       FROM landlord_reviews WHERE landlord_id = ?`, [landlordId]);
    console.log('p3 ok');
    await q(`SELECT COUNT(*) AS total_tenancies,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_tenancies,
         COUNT(DISTINCT listing_id) AS units_ever_rented
       FROM tenancies WHERE landlord_id = ?`, [landlordId]);
    console.log('p4 ok');
    await q(`SELECT COUNT(*) AS total, SUM(CASE WHEN status IN ('approved','declined') THEN 1 ELSE 0 END) AS responded
       FROM viewing_requests WHERE landlord_id = ?`, [landlordId]);
    console.log('p5 ok');
    console.log('all ok');
    process.exit();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
