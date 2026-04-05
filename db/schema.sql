-- VayuShield Database Schema

CREATE DATABASE IF NOT EXISTS vayushield;
USE vayushield;

-- Airbases Table
CREATE TABLE IF NOT EXISTS airbases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(10, 8) NOT NULL,
    role VARCHAR(255),
    protection_radius DECIMAL(10, 2) DEFAULT 50.0
);

-- Defensive Systems at Bases
CREATE TABLE IF NOT EXISTS base_defences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    base_id INT,
    system_name VARCHAR(255),
    quantity INT,
    FOREIGN KEY (base_id) REFERENCES airbases(id)
);

-- Live Threat Logs
CREATE TABLE IF NOT EXISTS threat_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    track_id VARCHAR(50) NOT NULL,
    type VARCHAR(50),
    classification VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(10, 8),
    target_base_id INT,
    status ENUM('Active', 'Intercepted', 'Impacted') DEFAULT 'Active',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (target_base_id) REFERENCES airbases(id)
);

-- Engagement Stats
CREATE TABLE IF NOT EXISTS engagement_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50), -- Fighter, Missile, Drone
    intercepted INT DEFAULT 0,
    impacted INT DEFAULT 0,
    total_engagements INT DEFAULT 0,
    success_rate DECIMAL(5, 2)
);

-- Initial Data
INSERT INTO airbases (name, location, latitude, longitude, role) VALUES
('Bhuj Airbase', 'Gujarat', 23.2875, 69.6701, 'Western entry defence'),
('Jaisalmer Airbase', 'Rajasthan', 26.8890, 70.8647, 'Desert sector defence'),
('Pathankot Airbase', 'Punjab', 32.2331, 75.6347, 'Northern strike interception'),
('Srinagar Airbase', 'Kashmir', 33.9870, 74.7741, 'High-altitude defence');

INSERT INTO engagement_stats (category) VALUES ('Fighter'), ('Missile'), ('Drone');
