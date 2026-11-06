UPDATE activity
SET kind = 'criterion_checked'
WHERE kind = 'check'
  AND json_valid(after_json)
  AND json_type(after_json, '$.done') IS NOT NULL
  AND json_type(after_json, '$.id') = 'text';
