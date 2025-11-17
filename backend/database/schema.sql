-- Visitor Management System Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS vehicle_damages CASCADE;
DROP TABLE IF EXISTS vehicle_checkins CASCADE;
DROP TABLE IF EXISTS vehicle_checkouts CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS unauthorized_attempts CASCADE;
DROP TABLE IF EXISTS allowed_contractors CASCADE;
DROP TABLE IF EXISTS sign_ins CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TYPE IF EXISTS visitor_type_enum CASCADE;
DROP TYPE IF EXISTS sign_in_status_enum CASCADE;
DROP TYPE IF EXISTS contractor_status_enum CASCADE;
DROP TYPE IF EXISTS vehicle_status_enum CASCADE;

-- Create ENUM types
CREATE TYPE visitor_type_enum AS ENUM ('visitor', 'contractor');
CREATE TYPE sign_in_status_enum AS ENUM ('signed_in', 'signed_out');
CREATE TYPE contractor_status_enum AS ENUM ('approved', 'pending', 'denied');
CREATE TYPE vehicle_status_enum AS ENUM ('available', 'in_use', 'maintenance');

-- Staff table
CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Allowed Contractors table - Whitelist of approved contractors
CREATE TABLE allowed_contractors (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contractor_name VARCHAR(255),
    email VARCHAR(255),
    phone_number VARCHAR(50),
    status contractor_status_enum DEFAULT 'pending',
    approval_date TIMESTAMP WITH TIME ZONE,
    approved_by_staff_id INTEGER REFERENCES staff(id),
    expiry_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unauthorized Attempts log - Track rejected contractor sign-ins
CREATE TABLE unauthorized_attempts (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contractor_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    email VARCHAR(255),
    reason TEXT,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sign-ins table
CREATE TABLE sign_ins (
    id SERIAL PRIMARY KEY,
    visitor_type visitor_type_enum NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    company_name VARCHAR(255),
    purpose_of_visit TEXT NOT NULL,
    car_registration VARCHAR(50),
    visiting_person VARCHAR(255) NOT NULL,
    sign_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sign_out_time TIMESTAMP WITH TIME ZONE,
    status sign_in_status_enum DEFAULT 'signed_in',
    signature TEXT,
    sharepoint_synced BOOLEAN DEFAULT FALSE,
    sharepoint_sync_time TIMESTAMP WITH TIME ZONE,
    sharepoint_sync_error TEXT,
    document_acknowledged BOOLEAN DEFAULT FALSE,
    document_acknowledgment_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_sign_ins_status ON sign_ins(status);
CREATE INDEX idx_sign_ins_visitor_type ON sign_ins(visitor_type);
CREATE INDEX idx_sign_ins_sign_in_time ON sign_ins(sign_in_time DESC);
CREATE INDEX idx_sign_ins_visiting_person ON sign_ins(visiting_person);
CREATE INDEX idx_sign_ins_sharepoint_synced ON sign_ins(sharepoint_synced) WHERE sharepoint_synced = FALSE;
CREATE INDEX idx_sign_ins_email ON sign_ins(email) WHERE email IS NOT NULL;
CREATE INDEX idx_sign_ins_car_registration ON sign_ins(car_registration) WHERE car_registration IS NOT NULL;
CREATE INDEX idx_staff_email ON staff(email);

-- Contractor validation indexes
CREATE INDEX idx_allowed_contractors_company ON allowed_contractors(company_name);
CREATE INDEX idx_allowed_contractors_status ON allowed_contractors(status);
CREATE INDEX idx_allowed_contractors_expiry ON allowed_contractors(expiry_date);
CREATE INDEX idx_allowed_contractors_composite ON allowed_contractors(company_name, contractor_name);
CREATE UNIQUE INDEX idx_allowed_contractors_unique ON allowed_contractors(company_name, contractor_name) WHERE status = 'approved';

-- Unauthorized attempts indexes
CREATE INDEX idx_unauthorized_attempts_company ON unauthorized_attempts(company_name);
CREATE INDEX idx_unauthorized_attempts_attempt_time ON unauthorized_attempts(attempt_time DESC);
CREATE INDEX idx_unauthorized_attempts_contractor ON unauthorized_attempts(contractor_name);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_sign_ins_updated_at BEFORE UPDATE ON sign_ins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_allowed_contractors_updated_at BEFORE UPDATE ON allowed_contractors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample staff members
INSERT INTO staff (name, email, department) VALUES
    ('John Smith', 'john.smith@company.com', 'IT'),
    ('Sarah Johnson', 'sarah.johnson@company.com', 'HR'),
    ('Mike Davis', 'mike.davis@company.com', 'Operations'),
    ('Emily Brown', 'emily.brown@company.com', 'Finance'),
    ('David Wilson', 'david.wilson@company.com', 'Management');

-- Insert sample approved contractors
INSERT INTO allowed_contractors (company_name, contractor_name, email, phone_number, status, approval_date, approved_by_staff_id, notes) VALUES
    ('ABC Electrical', 'John Doe', 'john@abcelectrical.com', '555-0101', 'approved', CURRENT_TIMESTAMP, 1, 'Regular HVAC maintenance contractor'),
    ('BuildRight Construction', 'Mike Johnson', 'mike@buildright.com', '555-0102', 'approved', CURRENT_TIMESTAMP, 1, 'Foundation repair specialist'),
    ('Tech Solutions Inc', 'Sarah Chen', 'sarah@techsolutions.com', '555-0103', 'pending', NULL, NULL, 'Awaiting approval'),
    ('SecureGuard Services', 'Robert Wilson', 'robert@secureguard.com', '555-0104', 'approved', CURRENT_TIMESTAMP, 2, 'Security system installer');

-- Vehicles table
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    registration VARCHAR(50) UNIQUE NOT NULL,
    status vehicle_status_enum DEFAULT 'available',
    current_mileage INTEGER DEFAULT 0,
    last_checkout_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle checkouts table
CREATE TABLE vehicle_checkouts (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
    registration VARCHAR(50) NOT NULL,
    checkout_date DATE NOT NULL,
    checkout_time TIME NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    starting_mileage INTEGER NOT NULL,
    signature TEXT,
    acknowledged_terms BOOLEAN DEFAULT FALSE,
    acknowledgment_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'checked_out',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle checkins table
CREATE TABLE vehicle_checkins (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
    checkout_id INTEGER NOT NULL REFERENCES vehicle_checkouts(id),
    registration VARCHAR(50) NOT NULL,
    checkin_date DATE NOT NULL,
    checkin_time TIME NOT NULL,
    return_mileage INTEGER NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'checked_in',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle damages table
CREATE TABLE vehicle_damages (
    id SERIAL PRIMARY KEY,
    checkin_id INTEGER NOT NULL REFERENCES vehicle_checkins(id),
    damage_description TEXT,
    damage_photos TEXT,
    reported_by_name VARCHAR(255),
    report_date DATE NOT NULL,
    report_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'reported',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle-related indexes
CREATE INDEX idx_vehicles_registration ON vehicles(registration);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicle_checkouts_vehicle_id ON vehicle_checkouts(vehicle_id);
CREATE INDEX idx_vehicle_checkouts_status ON vehicle_checkouts(status);
CREATE INDEX idx_vehicle_checkins_vehicle_id ON vehicle_checkins(vehicle_id);
CREATE INDEX idx_vehicle_checkins_checkout_id ON vehicle_checkins(checkout_id);
CREATE INDEX idx_vehicle_damages_checkin_id ON vehicle_damages(checkin_id);

-- Create triggers for vehicle updated_at
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_checkouts_updated_at BEFORE UPDATE ON vehicle_checkouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_checkins_updated_at BEFORE UPDATE ON vehicle_checkins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_damages_updated_at BEFORE UPDATE ON vehicle_damages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample vehicles
INSERT INTO vehicles (registration, status, current_mileage) VALUES
    ('AY63BSO', 'available', 15000),
    ('BY63BSO', 'available', 12500),
    ('CY63BSO', 'available', 18000),
    ('DY63BSO', 'maintenance', 20000);

-- Create a view for active visitors
CREATE OR REPLACE VIEW active_visitors AS
SELECT
    id,
    visitor_type,
    full_name,
    phone_number,
    email,
    company_name,
    purpose_of_visit,
    car_registration,
    visiting_person,
    sign_in_time,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - sign_in_time))/3600 AS hours_on_site
FROM sign_ins
WHERE status = 'signed_in'
ORDER BY sign_in_time DESC;

-- Archival tables for long-term storage
-- Sign-ins archive table (identical structure to sign_ins)
CREATE TABLE sign_ins_archive (
    id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
    visitor_type visitor_type_enum NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    company_name VARCHAR(255),
    purpose_of_visit TEXT NOT NULL,
    car_registration VARCHAR(50),
    visiting_person VARCHAR(255) NOT NULL,
    sign_in_time TIMESTAMP WITH TIME ZONE,
    sign_out_time TIMESTAMP WITH TIME ZONE,
    status sign_in_status_enum,
    signature TEXT,
    sharepoint_synced BOOLEAN,
    sharepoint_sync_time TIMESTAMP WITH TIME ZONE,
    sharepoint_sync_error TEXT,
    document_acknowledged BOOLEAN,
    document_acknowledgment_time TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle checkouts archive table
CREATE TABLE vehicle_checkouts_archive (
    id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL,
    registration VARCHAR(50) NOT NULL,
    checkout_date DATE NOT NULL,
    checkout_time TIME NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    starting_mileage INTEGER NOT NULL,
    signature TEXT,
    acknowledged_terms BOOLEAN,
    acknowledgment_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50),
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Data retention policy configuration table
CREATE TABLE data_retention_policy (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) UNIQUE NOT NULL,
    retention_months INTEGER NOT NULL DEFAULT 12,
    last_archival_run TIMESTAMP WITH TIME ZONE,
    records_archived_last_run INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default retention policies
INSERT INTO data_retention_policy (table_name, retention_months, enabled) VALUES
    ('sign_ins', 12, TRUE),
    ('vehicle_checkouts', 12, TRUE),
    ('unauthorized_attempts', 24, TRUE);

-- Archival indexes
CREATE INDEX idx_sign_ins_archive_original_id ON sign_ins_archive(original_id);
CREATE INDEX idx_sign_ins_archive_sign_in_time ON sign_ins_archive(sign_in_time DESC);
CREATE INDEX idx_sign_ins_archive_archived_at ON sign_ins_archive(archived_at DESC);
CREATE INDEX idx_vehicle_checkouts_archive_original_id ON vehicle_checkouts_archive(original_id);
CREATE INDEX idx_vehicle_checkouts_archive_checkout_date ON vehicle_checkouts_archive(checkout_date DESC);

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO visitor_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO visitor_app_user;
