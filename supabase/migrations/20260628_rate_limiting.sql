-- Rate limiting table + RPC function
-- Used by the Next.js middleware to enforce per-IP rate limits across
-- all Vercel serverless instances (in-memory maps don't work on serverless).

CREATE TABLE IF NOT EXISTS rate_limits (
  ip          TEXT NOT NULL,
  bucket      TEXT NOT NULL,           -- 'read' or 'cms_write'
  window_start BIGINT NOT NULL,        -- epoch seconds, floored to 60s
  count       INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ip, bucket, window_start)
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON rate_limits(created_at);

-- Atomic increment + check function.
-- Returns TRUE if the request is allowed, FALSE if rate-limited.
-- Usage: SELECT check_rate_limit('1.2.3.4', 'cms_write', 10, 60);
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_ip TEXT,
  p_bucket TEXT,
  p_limit INT,
  p_window_seconds INT DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  v_window_start BIGINT;
  v_count INT;
BEGIN
  -- Compute the current window start (floor to window boundary)
  v_window_start := (EXTRACT(EPOCH FROM now())::BIGINT / p_window_seconds) * p_window_seconds;

  -- Atomic upsert: insert if not exists, otherwise increment
  INSERT INTO rate_limits (ip, bucket, window_start, count)
  VALUES (p_ip, p_bucket, v_window_start, 1)
  ON CONFLICT (ip, bucket, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  -- Allow if under the limit
  RETURN v_count <= p_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the service role (used by the Next.js API)
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;
