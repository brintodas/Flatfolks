const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const db = require('../config/db')

const router = express.Router()

const uploadDir = path.join(__dirname, '..', 'uploads', 'fraud-evidence')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')

    cb(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1E9)}-${safeName}`
    )
  }
})

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime'
]

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 5
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true)
    }

    cb(new Error('Only JPG, PNG, WEBP, MP4, WEBM and MOV evidence is allowed.'))
  }
})

function calculateRiskScore(category, visitConfirmed, evidenceCount, previousReports) {
  let score = 10

  const categoryScores = {
    scam: 35,
    fake_landlord: 35,
    payment_fraud: 30,
    unsafe_condition: 25,
    misleading_photos: 20,
    other: 10
  }

  score += categoryScores[category] || 10

  if (visitConfirmed) {
    score += 15
  }

  if (evidenceCount > 0) {
    score += 15
  }

  if (evidenceCount >= 2) {
    score += 5
  }

  score += Math.min(Number(previousReports || 0) * 10, 30)

  return Math.min(score, 100)
}

function getRiskLevel(score) {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

// Student submits a fraud/scam report.
router.post('/', upload.array('evidence', 5), (req, res) => {
  const {
    listing_id,
    reporter_id,
    category,
    description,
    visit_confirmed
  } = req.body

  const validCategories = [
    'scam',
    'misleading_photos',
    'unsafe_condition',
    'fake_landlord',
    'payment_fraud',
    'other'
  ]

  if (!listing_id || !reporter_id || !category || !description) {
    return res.status(400).json({
      success: false,
      message: 'Listing, student, category and description are required.'
    })
  }

  if (!validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid report category.'
    })
  }

  const visited =
    visit_confirmed === true ||
    visit_confirmed === 'true' ||
    visit_confirmed === '1' ||
    visit_confirmed === 1

  db.query(
    'SELECT id, role FROM users WHERE id = ?',
    [reporter_id],
    (userErr, users) => {
      if (userErr) {
        console.log('Reporter lookup error:', userErr)
        return res.status(500).json({
          success: false,
          message: 'Could not verify student.'
        })
      }

      if (users.length === 0 || users[0].role !== 'student') {
        return res.status(403).json({
          success: false,
          message: 'Only students can submit fraud reports.'
        })
      }

      db.query(
        'SELECT id FROM listings WHERE id = ?',
        [listing_id],
        (listingErr, listings) => {
          if (listingErr) {
            console.log('Listing lookup error:', listingErr)
            return res.status(500).json({
              success: false,
              message: 'Could not verify listing.'
            })
          }

          if (listings.length === 0) {
            return res.status(404).json({
              success: false,
              message: 'Listing not found.'
            })
          }

          db.query(
            `SELECT COUNT(*) AS report_count
             FROM fraud_reports
             WHERE listing_id = ?
             AND status <> 'rejected'`,
            [listing_id],
            (countErr, countRows) => {
              if (countErr) {
                console.log('Fraud count error:', countErr)
                return res.status(500).json({
                  success: false,
                  message: 'Could not calculate fraud risk.'
                })
              }

              const previousReports = countRows[0].report_count
              const evidenceCount = req.files ? req.files.length : 0

              const riskScore = calculateRiskScore(
                category,
                visited,
                evidenceCount,
                previousReports
              )

              const riskLevel = getRiskLevel(riskScore)

              const sql = `
                INSERT INTO fraud_reports
                (
                  listing_id,
                  reporter_id,
                  category,
                  description,
                  visit_confirmed,
                  risk_score,
                  risk_level
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `

              db.query(
                sql,
                [
                  listing_id,
                  reporter_id,
                  category,
                  description.trim(),
                  visited ? 1 : 0,
                  riskScore,
                  riskLevel
                ],
                (reportErr, result) => {
                  if (reportErr) {
                    console.log('Create fraud report error:', reportErr)

                    return res.status(500).json({
                      success: false,
                      message: 'Could not submit report.'
                    })
                  }

                  const reportId = result.insertId
                  const files = req.files || []

                  if (files.length === 0) {
                    return res.json({
                      success: true,
                      message: 'Report submitted for admin review.',
                      report_id: reportId,
                      risk_score: riskScore,
                      risk_level: riskLevel
                    })
                  }

                  const evidenceValues = files.map(file => [
                    reportId,
                    file.mimetype.startsWith('video/') ? 'video' : 'image',
                    `/uploads/fraud-evidence/${file.filename}`,
                    file.originalname,
                    file.mimetype
                  ])

                  db.query(
                    `INSERT INTO fraud_evidence
                     (
                       report_id,
                       evidence_type,
                       file_path,
                       original_name,
                       mime_type
                     )
                     VALUES ?`,
                    [evidenceValues],
                    evidenceErr => {
                      if (evidenceErr) {
                        console.log('Evidence insert error:', evidenceErr)

                        return res.status(500).json({
                          success: false,
                          message: 'Report created, but evidence could not be saved.'
                        })
                      }

                      res.json({
                        success: true,
                        message: 'Report and evidence submitted for admin review.',
                        report_id: reportId,
                        risk_score: riskScore,
                        risk_level: riskLevel
                      })
                    }
                  )
                }
              )
            }
          )
        }
      )
    }
  )
})

// Student can see their own submitted reports.
router.get('/my/:userId', (req, res) => {
  const sql = `
    SELECT
      fr.*,
      l.title AS listing_title,
      l.location,
      l.landlord_name
    FROM fraud_reports fr
    JOIN listings l ON l.id = fr.listing_id
    WHERE fr.reporter_id = ?
    ORDER BY fr.created_at DESC
  `

  db.query(sql, [req.params.userId], (err, reports) => {
    if (err) {
      console.log('My reports error:', err)

      return res.status(500).json({
        success: false,
        message: 'Could not load reports.'
      })
    }

    res.json({
      success: true,
      reports
    })
  })
})

// Public endpoint.
// Only admin-verified scam reports are exposed publicly.
router.get('/listing/:listingId', (req, res) => {
  const sql = `
    SELECT
      fr.id,
      fr.listing_id,
      fr.category,
      fr.description,
      fr.visit_confirmed,
      fr.status,
      fr.risk_score,
      fr.risk_level,
      fr.admin_note,
      fr.reviewed_at,
      fr.created_at
    FROM fraud_reports fr
    WHERE fr.listing_id = ?
      AND fr.status = 'verified_scam'
    ORDER BY fr.reviewed_at DESC
  `

  db.query(sql, [req.params.listingId], (err, reports) => {
    if (err) {
      console.log('Verified reports error:', err)

      return res.status(500).json({
        success: false,
        message: 'Could not load verified reports.'
      })
    }

    if (reports.length === 0) {
      return res.json({
        success: true,
        reports: []
      })
    }

    const ids = reports.map(report => report.id)

    db.query(
      `SELECT
         id,
         report_id,
         evidence_type,
         file_path,
         original_name
       FROM fraud_evidence
       WHERE report_id IN (?)`,
      [ids],
      (evidenceErr, evidence) => {
        if (evidenceErr) {
          console.log('Public evidence error:', evidenceErr)

          return res.status(500).json({
            success: false,
            message: 'Could not load report evidence.'
          })
        }

        const data = reports.map(report => ({
          ...report,
          evidence: evidence.filter(item => item.report_id === report.id)
        }))

        res.json({
          success: true,
          reports: data
        })
      }
    )
  })
})

// Admin gets every submitted report.
router.get('/admin/all', (req, res) => {
  const sql = `
    SELECT
      fr.*,
      l.title AS listing_title,
      l.location,
      l.landlord_name,
      u.full_name AS reporter_name,
      u.email AS reporter_email
    FROM fraud_reports fr
    JOIN listings l ON l.id = fr.listing_id
    JOIN users u ON u.id = fr.reporter_id
    ORDER BY
      FIELD(fr.status, 'pending', 'under_review', 'verified_scam', 'rejected'),
      fr.risk_score DESC,
      fr.created_at DESC
  `

  db.query(sql, (err, reports) => {
    if (err) {
      console.log('Admin fraud reports error:', err)

      return res.status(500).json({
        success: false,
        message: 'Could not load fraud reports.'
      })
    }

    if (reports.length === 0) {
      return res.json({
        success: true,
        reports: []
      })
    }

    const ids = reports.map(report => report.id)

    db.query(
      `SELECT *
       FROM fraud_evidence
       WHERE report_id IN (?)`,
      [ids],
      (evidenceErr, evidence) => {
        if (evidenceErr) {
          console.log('Admin evidence error:', evidenceErr)

          return res.status(500).json({
            success: false,
            message: 'Could not load evidence.'
          })
        }

        const data = reports.map(report => ({
          ...report,
          evidence: evidence.filter(item => item.report_id === report.id)
        }))

        res.json({
          success: true,
          reports: data
        })
      }
    )
  })
})

// Admin reviews/verifies/rejects a report.
router.put('/admin/:reportId', (req, res) => {
  const {
    status,
    admin_note,
    reviewed_by
  } = req.body

  const allowedStatuses = [
    'under_review',
    'verified_scam',
    'rejected'
  ]

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid review status.'
    })
  }

  if (!reviewed_by) {
    return res.status(400).json({
      success: false,
      message: 'Admin ID is required.'
    })
  }

  db.query(
    'SELECT id, role FROM users WHERE id = ?',
    [reviewed_by],
    (adminErr, admins) => {
      if (adminErr) {
        console.log('Admin lookup error:', adminErr)

        return res.status(500).json({
          success: false,
          message: 'Could not verify admin.'
        })
      }

      if (admins.length === 0 || admins[0].role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only an admin can review fraud reports.'
        })
      }

      const sql = `
        UPDATE fraud_reports
        SET
          status = ?,
          admin_note = ?,
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `

      db.query(
        sql,
        [
          status,
          admin_note || null,
          reviewed_by,
          req.params.reportId
        ],
        (err, result) => {
          if (err) {
            console.log('Review fraud report error:', err)

            return res.status(500).json({
              success: false,
              message: 'Could not update report.'
            })
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              success: false,
              message: 'Report not found.'
            })
          }

          res.json({
            success: true,
            message:
              status === 'verified_scam'
                ? 'Report verified as scam.'
                : status === 'rejected'
                  ? 'Report rejected.'
                  : 'Report moved to review.'
          })
        }
      )
    }
  )
})

// Multer/file validation error handler for this router.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message:
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Each evidence file must be 50 MB or smaller.'
          : err.message
    })
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Evidence upload failed.'
    })
  }

  next()
})

module.exports = router