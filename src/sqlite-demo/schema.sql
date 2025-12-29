-- Database schema for race condition demonstrations

-- Accounts table for bank transfer demos
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inventory table for stock management demos
CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY,
    product TEXT NOT NULL UNIQUE,
    quantity INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table for ticket/seat reservation demos
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seat_number INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    booked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(seat_number)
);

-- Insert initial test data
INSERT OR REPLACE INTO accounts (id, name, balance) VALUES
    (1, 'Alice', 1000),
    (2, 'Bob', 1000),
    (3, 'Charlie', 500);

INSERT OR REPLACE INTO inventory (id, product, quantity, version) VALUES
    (1, 'Laptop', 10, 1),
    (2, 'Mouse', 50, 1),
    (3, 'Keyboard', 25, 1);

-- Seats 1-10 are available (no bookings yet)
DELETE FROM bookings;
