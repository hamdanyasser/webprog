-- Migration: Add capacity tracking to generators
-- Date: 2025-11-22
-- Description: Adds max_amperage field to track generator capacity in Amperes

USE powershare_db2;

-- Add max_amperage column to generators table
ALTER TABLE generators
ADD COLUMN max_amperage INT NOT NULL DEFAULT 100 COMMENT 'Maximum capacity in Amperes' AFTER capacity_kw;

-- Update existing generators with realistic capacity values
-- Assuming typical conversion: 1 kW ≈ 4.5 Amperes at 220V (Lebanese standard)
UPDATE generators
SET max_amperage = FLOOR(capacity_kw * 4.5)
WHERE max_amperage = 100;

-- Add index for performance
ALTER TABLE generators ADD INDEX idx_capacity (max_amperage);

-- Create view for capacity tracking
CREATE OR REPLACE VIEW generator_capacity_view AS
SELECT
    g.generator_id,
    g.generator_name,
    g.max_amperage,
    COALESCE(SUM(CASE WHEN s.status = 'active' THEN pp.amperage ELSE 0 END), 0) AS used_amperage,
    g.max_amperage - COALESCE(SUM(CASE WHEN s.status = 'active' THEN pp.amperage ELSE 0 END), 0) AS available_amperage,
    ROUND((COALESCE(SUM(CASE WHEN s.status = 'active' THEN pp.amperage ELSE 0 END), 0) / g.max_amperage) * 100, 2) AS capacity_percentage,
    COUNT(CASE WHEN s.status = 'active' THEN 1 END) AS active_subscribers
FROM generators g
LEFT JOIN subscriptions s ON g.generator_id = s.generator_id
LEFT JOIN pricing_plans pp ON s.plan_id = pp.plan_id
GROUP BY g.generator_id, g.generator_name, g.max_amperage;

SELECT 'Generator capacity tracking added successfully!' AS Status;
