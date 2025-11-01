-- Visitor Management System Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS unauthorized_attempts CASCADE;
DROP TABLE IF EXISTS allowed_contractors CASCADE;
DROP TABLE IF EXISTS sign_ins CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TYPE IF EXISTS visitor_type_enum CASCADE;
DROP TYPE IF EXISTS sign_in_status_enum CASCADE;
DROP TYPE IF EXISTS contractor_status_enum CASCADE;

-- Create ENUM types
CREATE TYPE visitor_type_enum AS ENUM ('visitor', 'contractor');
CREATE TYPE sign_in_status_enum AS ENUM ('signed_in', 'signed_out');
CREATE TYPE contractor_status_enum AS ENUM ('approved', 'pending', 'denied');

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
CREATE INDEX idx_staff_email ON staff(email);

-- Contractor validation indexes
CREATE INDEX idx_allowed_contractors_company ON allowed_contractors(company_name);
CREATE INDEX idx_allowed_contractors_status ON allowed_contractors(status);
CREATE INDEX idx_allowed_contractors_expiry ON allowed_contractors(expiry_date);
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

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO visitor_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO visitor_app_user;
