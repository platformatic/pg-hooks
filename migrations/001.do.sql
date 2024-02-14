/* create a queues table */
CREATE TABLE queues (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  callback_url VARCHAR(2048) NOT NULL,
  method VARCHAR(10) NOT NULL,
  headers JSON,
  dead_letter_queue_id INTEGER REFERENCES queues(id) ON DELETE SET NULL,
  max_retries INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

/* create crons table */
CREATE TABLE crons (
  id SERIAL PRIMARY KEY,
  queue_id INTEGER NOT NULL REFERENCES queues(id),

  schedule VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  body TEXT,
  headers JSON
);

/* creates an items table */
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  queue_id INTEGER NOT NULL REFERENCES queues(id),
  "when" TIMESTAMP NOT NULL,
  body TEXT,
  failed BOOLEAN NOT NULL DEFAULT FALSE,
  headers JSON,
  sent_at TIMESTAMP,
  retries INTEGER NOT NULL DEFAULT 0,

  cron_id INTEGER REFERENCES crons(id),

  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
