UPDATE temporary_organizer_passwords
SET password_hash =
    '94ff9fcf7a1ffde2dbedc524fdc42944f86f882a8c284e8abbf1ba51bdc494fc'
WHERE password_hash =
    'e348d8d0564992652cc3e8e5ae7dbcbed9ecdea4db96c573d8b2087643ee2569'
  AND expires_at = '2026-07-31 20:00:00+03'::timestamptz;
