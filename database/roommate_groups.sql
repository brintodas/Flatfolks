-- ============================================================
-- Roommate Grouping Feature — Schema Migration
-- Run AFTER the base schema.sql
-- ============================================================

-- ----------------------------------------------------------------
-- roommate_groups
-- Tracks each active group of 2-4 students searching together.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roommate_groups` (
  `id`          int(11) NOT NULL AUTO_INCREMENT,
  `leader_id`   int(11) NOT NULL,                              -- student who created the group
  `name`        varchar(120) NOT NULL DEFAULT 'My Group',
  `status`      enum('RECRUITING','ACTIVE','DISBANDED') NOT NULL DEFAULT 'RECRUITING',
  -- RECRUITING = open, ACTIVE = full (4 members), DISBANDED = no longer valid
  `created_at`  timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at`  timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_leader` (`leader_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `rg_leader_fk` FOREIGN KEY (`leader_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------
-- roommate_group_members
-- Junction table: which students are in which group.
-- A student can only be in ONE active group at a time (unique constraint).
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roommate_group_members` (
  `id`         int(11) NOT NULL AUTO_INCREMENT,
  `group_id`   int(11) NOT NULL,
  `user_id`    int(11) NOT NULL,
  `joined_at`  timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  -- one student → one group at a time (enforced via app logic on insert; index helps)
  UNIQUE KEY `unique_member` (`user_id`),
  KEY `idx_group` (`group_id`),
  CONSTRAINT `rgm_group_fk`  FOREIGN KEY (`group_id`) REFERENCES `roommate_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rgm_user_fk`   FOREIGN KEY (`user_id`)  REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------
-- roommate_invites
-- Lifecycle: PENDING → ACCEPTED | DECLINED | CANCELLED | EXPIRED
-- expires_at is set 7 days from created_at by the application.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roommate_invites` (
  `id`          int(11) NOT NULL AUTO_INCREMENT,
  `group_id`    int(11) NOT NULL,
  `inviter_id`  int(11) NOT NULL,             -- must be current group member
  `invitee_id`  int(11) NOT NULL,             -- recipient student
  `status`      enum('PENDING','ACCEPTED','DECLINED','CANCELLED','EXPIRED')
                NOT NULL DEFAULT 'PENDING',
  `message`     varchar(255) DEFAULT NULL,    -- optional personal note
  `expires_at`  datetime NOT NULL,            -- created_at + 7 days (set by app)
  `created_at`  timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at`  timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  -- Index for fast lookups; duplicate PENDING enforcement is done at the app level
  -- (see routes/roommates.js dupCheck query).
  --
  -- NOTE: do NOT use a UNIQUE KEY that includes `status` here. A unique key on
  -- (group_id, invitee_id, status) causes ER_DUP_ENTRY when expireOldInvites()
  -- tries to mark a PENDING invite EXPIRED for a pair that already has an EXPIRED
  -- row from a previous invite cycle.
  --
  -- Migration for existing databases:
  --   ALTER TABLE `roommate_invites` DROP INDEX `unique_pending_invite`;
  --   ALTER TABLE `roommate_invites` ADD KEY `idx_group_invitee_status` (`group_id`, `invitee_id`, `status`);
  KEY `idx_group_invitee_status` (`group_id`, `invitee_id`, `status`),
  KEY `idx_invitee`  (`invitee_id`),
  KEY `idx_inviter`  (`inviter_id`),
  KEY `idx_expires`  (`expires_at`),
  CONSTRAINT `ri_group_fk`    FOREIGN KEY (`group_id`)   REFERENCES `roommate_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ri_inviter_fk`  FOREIGN KEY (`inviter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ri_invitee_fk`  FOREIGN KEY (`invitee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
