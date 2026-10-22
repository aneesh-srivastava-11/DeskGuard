-- DeskGuard Schema for Neon PostgreSQL (7 tables matching spec)

-- 1. Student Table
CREATE TABLE IF NOT EXISTS "Student" (
  student_id VARCHAR(64) PRIMARY KEY, -- Firebase Auth UID or UUID
  reg_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'librarian')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Desk Table
CREATE TABLE IF NOT EXISTS "Desk" (
  desk_id VARCHAR(20) PRIMARY KEY, -- e.g. 'D01'
  location VARCHAR(100) DEFAULT 'Main Library Reading Room',
  row_label VARCHAR(5) NOT NULL,
  seat_number INT NOT NULL,
  status VARCHAR(20) DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'away', 'abandoned', 'maintenance')),
  has_power BOOLEAN DEFAULT TRUE,
  is_window BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Session Table
CREATE TABLE IF NOT EXISTS "Session" (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR(64) NOT NULL REFERENCES "Student"(student_id) ON DELETE CASCADE,
  desk_id VARCHAR(20) NOT NULL REFERENCES "Desk"(desk_id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '3 hours'),
  last_confirmed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  away_started_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'AWAY', 'ABANDONED', 'EXPIRED', 'RELEASED'))
);

-- 4. QRToken Table
CREATE TABLE IF NOT EXISTS "QRToken" (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id VARCHAR(20) NOT NULL REFERENCES "Desk"(desk_id) ON DELETE CASCADE,
  token_value TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '60 seconds')
);

-- 5. Librarian Table
CREATE TABLE IF NOT EXISTS "Librarian" (
  librarian_id VARCHAR(64) PRIMARY KEY, -- Firebase Auth UID or UUID
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Book Table
CREATE TABLE IF NOT EXISTS "Book" (
  book_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  isbn VARCHAR(50) UNIQUE NOT NULL,
  total_copies INT DEFAULT 1,
  available_copies INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. BookLoan Table
CREATE TABLE IF NOT EXISTS "BookLoan" (
  loan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR(64) NOT NULL REFERENCES "Student"(student_id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES "Book"(book_id) ON DELETE CASCADE,
  issue_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '14 days'),
  return_date TIMESTAMPTZ,
  fine NUMERIC(10, 2) DEFAULT 0.00
);

-- Seed Settings / Meta
CREATE TABLE IF NOT EXISTS "SystemSettings" (
  key VARCHAR(50) PRIMARY KEY,
  value VARCHAR(100) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "SystemSettings" (key, value) VALUES
  ('session_limit_hours', '3'),
  ('away_limit_minutes', '30'),
  ('max_books_per_student', '2')
ON CONFLICT (key) DO NOTHING;

-- 8. BookRequest Table
CREATE TABLE IF NOT EXISTS "BookRequest" (
  request_id VARCHAR(64) PRIMARY KEY,
  book_id VARCHAR(64) NOT NULL,
  student_id VARCHAR(64) NOT NULL REFERENCES "Student"(student_id) ON DELETE CASCADE,
  student_name VARCHAR(100) NOT NULL,
  student_reg VARCHAR(50) NOT NULL,
  book_title VARCHAR(255) NOT NULL,
  book_isbn VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed Desks (D01 - D40: All initialized to free)
INSERT INTO "Desk" (desk_id, row_label, seat_number, status, has_power, is_window) VALUES
  ('D01', 'A', 1, 'free', true, true),
  ('D02', 'A', 2, 'free', true, true),
  ('D03', 'A', 3, 'free', false, true),
  ('D04', 'A', 4, 'free', true, false),
  ('D05', 'A', 5, 'free', true, false),
  ('D06', 'B', 1, 'free', true, false),
  ('D07', 'B', 2, 'free', false, false),
  ('D08', 'B', 3, 'free', true, false),
  ('D09', 'B', 4, 'free', true, false),
  ('D10', 'B', 5, 'free', false, false),
  ('D11', 'C', 1, 'free', true, false),
  ('D12', 'C', 2, 'free', true, false),
  ('D13', 'C', 3, 'free', false, false),
  ('D14', 'C', 4, 'free', true, false),
  ('D15', 'C', 5, 'free', true, false),
  ('D16', 'D', 1, 'free', true, false),
  ('D17', 'D', 2, 'free', false, false),
  ('D18', 'D', 3, 'free', true, false),
  ('D19', 'D', 4, 'free', false, false),
  ('D20', 'D', 5, 'free', true, false),
  ('D21', 'E', 1, 'free', true, false),
  ('D22', 'E', 2, 'free', true, false),
  ('D23', 'E', 3, 'free', false, false),
  ('D24', 'E', 4, 'free', true, false),
  ('D25', 'E', 5, 'free', true, false),
  ('D26', 'F', 1, 'free', false, false),
  ('D27', 'F', 2, 'free', true, false),
  ('D28', 'F', 3, 'free', true, false),
  ('D29', 'F', 4, 'free', false, false),
  ('D30', 'F', 5, 'free', true, false),
  ('D31', 'G', 1, 'free', true, false),
  ('D32', 'G', 2, 'free', false, false),
  ('D33', 'G', 3, 'free', true, false),
  ('D34', 'G', 4, 'free', true, false),
  ('D35', 'G', 5, 'free', false, false),
  ('D36', 'H', 1, 'free', true, false),
  ('D37', 'H', 2, 'free', false, false),
  ('D38', 'H', 3, 'free', true, false),
  ('D39', 'H', 4, 'free', false, false),
ON CONFLICT (desk_id) DO UPDATE SET status = 'free', has_power = EXCLUDED.has_power, is_window = EXCLUDED.is_window;

-- Seed Books
INSERT INTO "Book" (title, author, isbn, total_copies, available_copies) VALUES
  ('Operating System Concepts', 'Silberschatz', '978-1118063330', 3, 2),
  ('Computer Networks', 'Tanenbaum', '978-0132126953', 2, 1),
  ('Database System Concepts', 'Ramakrishnan', '978-0073523323', 2, 2),
  ('Introduction to Algorithms', 'CLRS', '978-0262033848', 3, 3),
  ('Computer Architecture', 'Patterson', '978-0128201091', 1, 1),
  ('Discrete Mathematics', 'Rosen', '978-0072880083', 2, 1)
ON CONFLICT (isbn) DO NOTHING;
