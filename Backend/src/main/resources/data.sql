INSERT INTO roles (id,name, created_by, created_date,roles.last_modified_by, roles.last_modified_date)
SELECT '550e8400-e29b-41d4-a716-446655440001','ROLE_TEACHER', 'system', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_TEACHER');

INSERT INTO roles (id,name, created_by, created_date, roles.last_modified_by, roles.last_modified_date)
SELECT '550e8400-e29b-41d4-a716-446655440002','ROLE_ADMIN', 'system', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_ADMIN');
INSERT INTO roles (id,name, created_by, created_date, roles.last_modified_by, roles.last_modified_date)
SELECT '550e8400-e29b-41d4-a716-446655440003','ROLE_STUDENT', 'system', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_STUDENT');
INSERT INTO roles (id,name, created_by, created_date, roles.last_modified_by, roles.last_modified_date)
SELECT '550e8400-e29b-41d4-a716-446655440004','ROLE_USER', 'system', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_USER');


ALTER TABLE courses
    MODIFY COLUMN cover_image_url TEXT;