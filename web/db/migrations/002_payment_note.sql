-- 002: a free-text note on payments, used to keep an audit trail.
--  * refunds are stored as NEGATIVE payments with a note ("Refund - <name> ...")
--  * the payments of a deleted member keep their name in the note (their user_id becomes NULL)
ALTER TABLE payments ADD COLUMN note TEXT NULL;
