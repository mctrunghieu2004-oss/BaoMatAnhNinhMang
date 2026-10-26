-- crypt(..., gen_salt('bf', 12)) cua pgcrypto sinh hash bcrypt, bcryptjs doc duoc
INSERT INTO users (username, full_name, role, password_hash) VALUES
 ('admin', 'Quan tri vien',  'ADMIN',    crypt('Admin@2026demo', gen_salt('bf', 12))),
 ('gv01',  'Giang vien 01',  'LECTURER', crypt('Gv01@2026demo',  gen_salt('bf', 12))),
 ('gv02',  'Giang vien 02',  'LECTURER', crypt('Gv02@2026demo',  gen_salt('bf', 12))),
 ('sv01',  'Sinh vien 01',   'STUDENT',  crypt('Sv01@2026demo',  gen_salt('bf', 12))),
 ('sv02',  'Sinh vien 02',   'STUDENT',  crypt('Sv02@2026demo',  gen_salt('bf', 12))),
 ('sv03',  'Sinh vien 03',   'STUDENT',  crypt('Sv03@2026demo',  gen_salt('bf', 12)));

INSERT INTO courses (code, name, lecturer_id) VALUES
 ('SEC401', 'Bao mat mang may tinh', (SELECT id FROM users WHERE username = 'gv01')),
 ('NET301', 'Mang may tinh',         (SELECT id FROM users WHERE username = 'gv02'));

INSERT INTO enrollments (course_id, student_id)
SELECT c.id, u.id FROM courses c CROSS JOIN users u
WHERE u.role = 'STUDENT';
-- Khong seed diem: moi diem phai di qua app de co audit
