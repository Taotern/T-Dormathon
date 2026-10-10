-- Append as the next generated migration in the existing Site-owned D1 database.
-- Lifetime namespace: never reseed/reset this row to re-enable a spent demo.
CREATE TABLE sovern_advisor_budget (
  id TEXT PRIMARY KEY CHECK(id = 'dormathon-sovern-demo-v1'),
  limit_nanomyr INTEGER NOT NULL CHECK(limit_nanomyr = 5000000000),
  booked_nanomyr INTEGER NOT NULL CHECK(booked_nanomyr >= 3006050 AND booked_nanomyr <= limit_nanomyr),
  request_count INTEGER NOT NULL CHECK(request_count BETWEEN 0 AND 9),
  blocked INTEGER NOT NULL DEFAULT 0 CHECK(blocked IN (0,1))
);
CREATE TABLE sovern_advisor_requests (
  request_key TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  case_id TEXT NOT NULL,
  created_ms INTEGER NOT NULL,
  attempt_token TEXT NOT NULL UNIQUE,
  reservation_nanomyr INTEGER NOT NULL CHECK(reservation_nanomyr = 500000000),
  booked_nanomyr INTEGER NOT NULL CHECK(booked_nanomyr BETWEEN 0 AND reservation_nanomyr),
  observed_cost_nanomyr INTEGER,
  state TEXT NOT NULL CHECK(state IN ('reserved','complete','failed','unknown','billing_overrun')),
  result_json TEXT,
  CHECK((state = 'reserved' AND result_json IS NULL) OR (state <> 'reserved' AND result_json IS NOT NULL))
);
CREATE INDEX sovern_advisor_created_idx ON sovern_advisor_requests(created_ms);
CREATE TRIGGER sovern_advisor_reserve_guard BEFORE INSERT ON sovern_advisor_requests
BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM sovern_advisor_budget WHERE id='dormathon-sovern-demo-v1' AND blocked=0 AND request_count<9 AND booked_nanomyr+NEW.reservation_nanomyr<=limit_nanomyr)
    THEN RAISE(ABORT,'sovern_budget_closed') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM sovern_advisor_requests WHERE state='reserved')
    THEN RAISE(ABORT,'sovern_pending_reservation') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM sovern_advisor_requests WHERE created_ms>NEW.created_ms-60000)>=2
    THEN RAISE(ABORT,'sovern_rate_limited') END;
  SELECT CASE WHEN NEW.state<>'reserved' OR NEW.booked_nanomyr<>NEW.reservation_nanomyr
    THEN RAISE(ABORT,'sovern_invalid_reservation') END;
END;
CREATE TRIGGER sovern_advisor_reserve_book AFTER INSERT ON sovern_advisor_requests
BEGIN
  UPDATE sovern_advisor_budget SET booked_nanomyr=booked_nanomyr+NEW.reservation_nanomyr,request_count=request_count+1 WHERE id='dormathon-sovern-demo-v1';
END;
CREATE TRIGGER sovern_advisor_reconcile_guard BEFORE UPDATE ON sovern_advisor_requests
BEGIN
  SELECT CASE WHEN OLD.state<>'reserved' OR NEW.request_key<>OLD.request_key OR NEW.fingerprint<>OLD.fingerprint OR NEW.attempt_token<>OLD.attempt_token OR NEW.case_id<>OLD.case_id OR NEW.created_ms<>OLD.created_ms OR NEW.reservation_nanomyr<>OLD.reservation_nanomyr OR NEW.booked_nanomyr>OLD.booked_nanomyr OR NEW.state='reserved'
    THEN RAISE(ABORT,'sovern_invalid_reconciliation') END;
  SELECT CASE WHEN NEW.booked_nanomyr<OLD.booked_nanomyr AND (NEW.observed_cost_nanomyr IS NULL OR NEW.observed_cost_nanomyr<>NEW.booked_nanomyr OR NEW.state NOT IN ('complete','failed'))
    THEN RAISE(ABORT,'sovern_unknown_usage_hold') END;
END;
CREATE TRIGGER sovern_advisor_reconcile_book AFTER UPDATE ON sovern_advisor_requests
BEGIN
  UPDATE sovern_advisor_budget SET booked_nanomyr=booked_nanomyr+NEW.booked_nanomyr-OLD.booked_nanomyr,blocked=CASE WHEN NEW.state IN ('billing_overrun','unknown') THEN 1 ELSE blocked END WHERE id='dormathon-sovern-demo-v1';
END;
CREATE TRIGGER sovern_advisor_no_delete BEFORE DELETE ON sovern_advisor_requests
BEGIN SELECT RAISE(ABORT,'sovern_no_delete'); END;
