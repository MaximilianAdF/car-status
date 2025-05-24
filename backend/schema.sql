CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    pass TEXT NOT NULL,
    session_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
    registration TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status in ('active', 'maintenance', 'inactive'))
);

CREATE TABLE IF NOT EXISTS user_cars (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
    access_level TEXT NOT NULL CHECK (access_level in ('driver', 'owner', 'guest', 'practice driver')),
    access_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, car_id)
);

CREATE TABLE IF NOT EXISTS car_usage_log (
  id SERIAL PRIMARY KEY,
  car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  start_mileage INTEGER NOT NULL,
  end_mileage INTEGER NOT NULL,
  fuel_used_liters REAL,
  parked_location TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS car_bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  notes TEXT,                  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
