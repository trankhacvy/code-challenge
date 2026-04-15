-- Users
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  subject      VARCHAR(500) NOT NULL,
  body         TEXT NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'sending', 'scheduled', 'sent')),
  scheduled_at TIMESTAMPTZ,
  created_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- Recipients
CREATE TABLE IF NOT EXISTS recipients (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  name       VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campaign Recipients (join table)
CREATE TABLE IF NOT EXISTS campaign_recipients (
  campaign_id  INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  sent_at      TIMESTAMPTZ,
  opened_at    TIMESTAMPTZ,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'sent', 'failed')),
  PRIMARY KEY (campaign_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_cr_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cr_status ON campaign_recipients(status);
