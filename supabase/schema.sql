-- Create tables
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  reg_no text unique not null,
  name text not null,
  role text default 'student' 
    check (role in ('student','librarian')),
  email text unique not null,
  created_at timestamptz default now()
);

create table if not exists desks (
  id text primary key,
  label text not null,
  row_label text not null,
  seat_number int not null,
  status text default 'FREE' 
    check (status in (
      'FREE','OCCUPIED','AWAY',
      'ABANDONED','MAINTENANCE')),
  has_power boolean default true,
  is_window boolean default false,
  updated_at timestamptz default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  desk_id text references desks(id),
  student_id uuid references students(id),
  checked_in_at timestamptz default now(),
  last_confirmed_at timestamptz default now(),
  away_started_at timestamptz,
  prompted_at timestamptz,
  status text default 'ACTIVE' 
    check (status in (
      'ACTIVE','AWAY','ABANDONED',
      'EXPIRED','RELEASED')),
  expires_at timestamptz 
    default now() + interval '3 hours'
);

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  isbn text unique not null,
  total_copies int default 1,
  available_copies int default 1
);

create table if not exists book_issues (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books(id),
  student_id uuid references students(id),
  approved boolean default false,
  issued_at timestamptz,
  due_at timestamptz 
    default now() + interval '14 days',
  returned_at timestamptz
);

create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Seed Settings
insert into settings (key, value) values
('session_limit_hours', '3'),
('away_limit_minutes', '30'),
('library_open_time', '08:00'),
('library_close_time', '22:00'),
('max_books_per_student', '2')
on conflict (key) do nothing;

-- Enable Realtime for desks
alter publication supabase_realtime add table desks;

-- Functions

create or replace function checkin_desk(
  p_desk_id text,
  p_student_id uuid
) returns json as $$
declare
  v_desk desks%rowtype;
  v_existing_session sessions%rowtype;
  v_session sessions%rowtype;
  v_session_hours int;
begin
  select value::int into v_session_hours
  from settings where key = 'session_limit_hours';
  if v_session_hours is null then 
    v_session_hours := 3; 
  end if;

  select * into v_desk from desks
  where id = p_desk_id for update;

  if not found then
    return json_build_object('error','desk_not_found');
  end if;

  if v_desk.status != 'FREE' then
    return json_build_object('error','desk_not_free');
  end if;

  select * into v_existing_session from sessions
  where student_id = p_student_id
  and status in ('ACTIVE','AWAY')
  limit 1;

  if found then
    return json_build_object(
      'error','already_checked_in',
      'desk_id', v_existing_session.desk_id
    );
  end if;

  insert into sessions (
    desk_id, student_id, expires_at
  ) values (
    p_desk_id, 
    p_student_id,
    now() + (v_session_hours || ' hours')::interval
  ) returning * into v_session;

  update desks set 
    status = 'OCCUPIED',
    updated_at = now()
  where id = p_desk_id;

  return json_build_object(
    'success', true,
    'session', row_to_json(v_session)
  );
end;
$$ language plpgsql security definer;

create or replace function release_desk(
  p_session_id uuid,
  p_student_id uuid
) returns json as $$
declare
  v_session sessions%rowtype;
begin
  select * into v_session from sessions
  where id = p_session_id
  and student_id = p_student_id
  and status in ('ACTIVE','AWAY')
  for update;

  if not found then
    return json_build_object('error','session_not_found');
  end if;

  update sessions set status = 'RELEASED'
  where id = p_session_id;

  update desks set 
    status = 'FREE',
    updated_at = now()
  where id = v_session.desk_id;

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;

create or replace function mark_away(
  p_session_id uuid,
  p_student_id uuid
) returns json as $$
declare
  v_session sessions%rowtype;
  v_away_minutes int;
begin
  select value::int into v_away_minutes
  from settings where key = 'away_limit_minutes';
  if v_away_minutes is null then 
    v_away_minutes := 30; 
  end if;

  select * into v_session from sessions
  where id = p_session_id
  and student_id = p_student_id
  and status = 'ACTIVE'
  for update;

  if not found then
    return json_build_object('error','session_not_found');
  end if;

  update sessions set 
    status = 'AWAY',
    away_started_at = now()
  where id = p_session_id;

  update desks set 
    status = 'AWAY',
    updated_at = now()
  where id = v_session.desk_id;

  return json_build_object(
    'success', true,
    'away_until', 
    (now() + (v_away_minutes || ' minutes')::interval)
  );
end;
$$ language plpgsql security definer;

create or replace function mark_back(
  p_session_id uuid,
  p_student_id uuid
) returns json as $$
declare
  v_session sessions%rowtype;
begin
  select * into v_session from sessions
  where id = p_session_id
  and student_id = p_student_id
  and status = 'AWAY'
  for update;

  if not found then
    return json_build_object('error','session_not_found');
  end if;

  update sessions set 
    status = 'ACTIVE',
    away_started_at = null,
    last_confirmed_at = now()
  where id = p_session_id;

  update desks set 
    status = 'OCCUPIED',
    updated_at = now()
  where id = v_session.desk_id;

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;

-- Sweep desks cron job schedule
select cron.schedule('sweep-desks', '* * * * *', $$
  update sessions set status = 'ABANDONED'
  where status = 'AWAY'
  and away_started_at < now() - (
    select (value || ' minutes')::interval 
    from settings 
    where key = 'away_limit_minutes'
  );

  update desks set status = 'ABANDONED',
    updated_at = now()
  where id in (
    select desk_id from sessions
    where status = 'ABANDONED'
  )
  and status != 'ABANDONED';

  update sessions set status = 'EXPIRED'
  where status = 'ACTIVE'
  and expires_at < now();

  update desks set status = 'FREE',
    updated_at = now()
  where id in (
    select desk_id from sessions
    where status = 'EXPIRED'
  )
  and status = 'OCCUPIED';
$$);

-- RLS Enablement
alter table students enable row level security;
alter table desks enable row level security;
alter table sessions enable row level security;
alter table books enable row level security;
alter table book_issues enable row level security;
alter table settings enable row level security;

-- Policies
create policy "students can read own record"
  on students for select
  using (auth.uid() = id);

create policy "anyone can read desks"
  on desks for select
  using (true);

create policy "service role can write desks"
  on desks for all
  using (auth.role() = 'service_role');

create policy "students can read own sessions"
  on sessions for select
  using (auth.uid() = student_id);

create policy "service role can write sessions"
  on sessions for all
  using (auth.role() = 'service_role');

create policy "anyone can read books"
  on books for select using (true);

create policy "students can read own issues"
  on book_issues for select
  using (auth.uid() = student_id);

create policy "anyone can read settings"
  on settings for select using (true);

-- Seed Desks
insert into desks (id,label,row_label,
  seat_number,status,has_power,is_window) values
('D01','D01','A',1,'FREE',true,true),
('D02','D02','A',2,'OCCUPIED',true,true),
('D03','D03','A',3,'OCCUPIED',false,true),
('D04','D04','A',4,'FREE',true,false),
('D05','D05','A',5,'AWAY',true,false),
('D06','D06','B',1,'OCCUPIED',true,false),
('D07','D07','B',2,'ABANDONED',false,false),
('D08','D08','B',3,'FREE',true,false),
('D09','D09','B',4,'OCCUPIED',true,false),
('D10','D10','B',5,'FREE',false,false),
('D11','D11','C',1,'FREE',true,false),
('D12','D12','C',2,'OCCUPIED',true,false),
('D13','D13','C',3,'OCCUPIED',false,false),
('D14','D14','C',4,'OCCUPIED',true,false),
('D15','D15','C',5,'AWAY',true,false),
('D16','D16','D',1,'FREE',true,false),
('D17','D17','D',2,'FREE',false,false),
('D18','D18','D',3,'OCCUPIED',true,false),
('D19','D19','D',4,'ABANDONED',false,false),
('D20','D20','D',5,'OCCUPIED',true,false),
('D21','D21','E',1,'OCCUPIED',true,false),
('D22','D22','E',2,'FREE',true,false),
('D23','D23','E',3,'OCCUPIED',false,false),
('D24','D24','E',4,'OCCUPIED',true,false),
('D25','D25','E',5,'FREE',true,false),
('D26','D26','F',1,'OCCUPIED',false,false),
('D27','D27','F',2,'AWAY',true,false),
('D28','D28','F',3,'FREE',true,false),
('D29','D29','F',4,'OCCUPIED',false,false),
('D30','D30','F',5,'OCCUPIED',true,false),
('D31','D31','G',1,'FREE',true,false),
('D32','D32','G',2,'OCCUPIED',false,false),
('D33','D33','G',3,'OCCUPIED',true,false),
('D34','D34','G',4,'FREE',true,false),
('D35','D35','G',5,'OCCUPIED',false,false),
('D36','D36','H',1,'OCCUPIED',true,false),
('D37','D37','H',2,'MAINTENANCE',false,false),
('D38','D38','H',3,'FREE',true,false),
('D39','D39','H',4,'OCCUPIED',false,false),
('D40','D40','H',5,'OCCUPIED',true,false)
on conflict (id) do nothing;

-- Seed Books
insert into books 
  (title,author,isbn,total_copies,available_copies)
values
('Operating System Concepts','Silberschatz',
  '978-1118063330',3,2),
('Computer Networks','Tanenbaum',
  '978-0132126953',2,1),
('Database System Concepts','Ramakrishnan',
  '978-0073523323',2,2),
('Introduction to Algorithms','CLRS',
  '978-0262033848',3,3),
('Computer Architecture','Patterson',
  '978-0128201091',1,1),
('Discrete Mathematics','Rosen',
  '978-0072880083',2,1)
on conflict (isbn) do nothing;

-- Book Issue/Return RPCs
create or replace function issue_book(
  p_isbn text,
  p_student_id uuid
) returns json as $$
declare
  v_book books%rowtype;
  v_max_books int;
  v_current_issues int;
  v_pending_issue book_issues%rowtype;
begin
  select value::int into v_max_books
  from settings where key = 'max_books_per_student';
  if v_max_books is null then v_max_books := 2; end if;

  select count(*) into v_current_issues
  from book_issues
  where student_id = p_student_id
  and returned_at is null
  and approved = true;

  if v_current_issues >= v_max_books then
    return json_build_object('error','max_books_reached');
  end if;

  select * into v_book from books
  where isbn = p_isbn for update;

  if not found then
    return json_build_object('error','book_not_found');
  end if;

  if v_book.available_copies <= 0 then
    return json_build_object('error','not_available');
  end if;

  -- Check if there is an existing pending request
  select bi.* into v_pending_issue
  from book_issues bi
  where bi.book_id = v_book.id
  and bi.student_id = p_student_id
  and bi.approved = false
  and bi.returned_at is null
  limit 1
  for update;

  if found then
    update book_issues set 
      approved = true,
      issued_at = now()
    where id = v_pending_issue.id;
  else
    insert into book_issues (book_id, student_id, approved, issued_at)
    values (v_book.id, p_student_id, true, now());
  end if;

  update books set 
    available_copies = available_copies - 1
  where id = v_book.id;

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;

create or replace function return_book(
  p_isbn text,
  p_student_id uuid
) returns json as $$
declare
  v_issue book_issues%rowtype;
  v_book books%rowtype;
begin
  select bi.* into v_issue
  from book_issues bi
  join books b on b.id = bi.book_id
  where b.isbn = p_isbn
  and bi.student_id = p_student_id
  and bi.returned_at is null
  order by bi.issued_at desc
  limit 1
  for update;

  if not found then
    return json_build_object('error','issue_not_found');
  end if;

  update book_issues set returned_at = now()
  where id = v_issue.id;

  update books set 
    available_copies = available_copies + 1
  where id = v_issue.book_id;

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;
