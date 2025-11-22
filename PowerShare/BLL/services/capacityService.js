const db = require('../../DAL/db');

class CapacityService {
    /**
     * Get capacity information for a generator
     * @param {number} generatorId
     * @returns {Promise<Object>} Capacity details
     */
    async getGeneratorCapacity(generatorId) {
        try {
            const [rows] = await db.query(
                `SELECT * FROM generator_capacity_view WHERE generator_id = ?`,
                [generatorId]
            );

            if (rows.length === 0) {
                return null;
            }

            const capacity = rows[0];

            return {
                generatorId: capacity.generator_id,
                generatorName: capacity.generator_name,
                maxAmperage: capacity.max_amperage,
                usedAmperage: capacity.used_amperage,
                availableAmperage: capacity.available_amperage,
                capacityPercentage: parseFloat(capacity.capacity_percentage),
                activeSubscribers: capacity.active_subscribers,
                status: this.getCapacityStatus(capacity.capacity_percentage),
                canAcceptNew: capacity.available_amperage > 0
            };
        } catch (error) {
            console.error('Error fetching generator capacity:', error);
            throw error;
        }
    }

    /**
     * Check if generator can accept a new subscription with specific amperage
     * @param {number} generatorId
     * @param {number} requiredAmperage
     * @returns {Promise<Object>} Validation result
     */
    async validateCapacity(generatorId, requiredAmperage) {
        try {
            const capacity = await this.getGeneratorCapacity(generatorId);

            if (!capacity) {
                return {
                    valid: false,
                    message: 'Generator not found'
                };
            }

            if (capacity.availableAmperage >= requiredAmperage) {
                return {
                    valid: true,
                    message: 'Capacity available',
                    availableAmperage: capacity.availableAmperage,
                    afterSubscription: {
                        usedAmperage: capacity.usedAmperage + requiredAmperage,
                        availableAmperage: capacity.availableAmperage - requiredAmperage,
                        capacityPercentage: ((capacity.usedAmperage + requiredAmperage) / capacity.maxAmperage * 100).toFixed(2)
                    }
                };
            } else {
                return {
                    valid: false,
                    message: `Insufficient capacity. Available: ${capacity.availableAmperage}A, Required: ${requiredAmperage}A`,
                    availableAmperage: capacity.availableAmperage,
                    requiredAmperage: requiredAmperage,
                    shortfall: requiredAmperage - capacity.availableAmperage
                };
            }
        } catch (error) {
            console.error('Error validating capacity:', error);
            throw error;
        }
    }

    /**
     * Get all generators with their capacity information
     * @returns {Promise<Array>} List of generators with capacity
     */
    async getAllGeneratorsCapacity() {
        try {
            const [rows] = await db.query('SELECT * FROM generator_capacity_view ORDER BY generator_name');

            return rows.map(capacity => ({
                generatorId: capacity.generator_id,
                generatorName: capacity.generator_name,
                maxAmperage: capacity.max_amperage,
                usedAmperage: capacity.used_amperage,
                availableAmperage: capacity.available_amperage,
                capacityPercentage: parseFloat(capacity.capacity_percentage),
                activeSubscribers: capacity.active_subscribers,
                status: this.getCapacityStatus(capacity.capacity_percentage),
                canAcceptNew: capacity.available_amperage > 0
            }));
        } catch (error) {
            console.error('Error fetching all generators capacity:', error);
            throw error;
        }
    }

    /**
     * Get capacity status based on percentage
     * @param {number} percentage
     * @returns {string} Status label
     */
    getCapacityStatus(percentage) {
        if (percentage >= 95) return 'critical';
        if (percentage >= 85) return 'warning';
        if (percentage >= 70) return 'moderate';
        return 'good';
    }

    /**
     * Get capacity color for UI
     * @param {string} status
     * @returns {string} Bootstrap color class
     */
    getCapacityColor(status) {
        const colors = {
            'good': 'success',
            'moderate': 'info',
            'warning': 'warning',
            'critical': 'danger'
        };
        return colors[status] || 'secondary';
    }

    /**
     * Check if subscription can be created (wrapper for route validation)
     * @param {number} planId
     * @param {number} generatorId
     * @returns {Promise<Object>}
     */
    async canSubscribe(planId, generatorId) {
        try {
            // Get plan amperage
            const [plans] = await db.query(
                'SELECT amperage FROM pricing_plans WHERE plan_id = ?',
                [planId]
            );

            if (plans.length === 0) {
                return {
                    valid: false,
                    message: 'Plan not found'
                };
            }

            const requiredAmperage = plans[0].amperage;
            return await this.validateCapacity(generatorId, requiredAmperage);
        } catch (error) {
            console.error('Error checking subscription eligibility:', error);
            throw error;
        }
    }

    /**
     * Get capacity alerts for generator owner
     * @param {number} ownerId
     * @returns {Promise<Array>} List of generators needing attention
     */
    async getCapacityAlerts(ownerId) {
        try {
            const [generators] = await db.query(
                `SELECT g.generator_id, g.generator_name, g.max_amperage,
                    gcv.used_amperage, gcv.available_amperage, gcv.capacity_percentage
                 FROM generators g
                 JOIN generator_capacity_view gcv ON g.generator_id = gcv.generator_id
                 WHERE g.owner_id = ? AND gcv.capacity_percentage >= 70
                 ORDER BY gcv.capacity_percentage DESC`,
                [ownerId]
            );

            return generators.map(gen => ({
                generatorId: gen.generator_id,
                generatorName: gen.generator_name,
                capacityPercentage: parseFloat(gen.capacity_percentage),
                status: this.getCapacityStatus(gen.capacity_percentage),
                message: this.getAlertMessage(gen.capacity_percentage),
                availableAmperage: gen.available_amperage
            }));
        } catch (error) {
            console.error('Error fetching capacity alerts:', error);
            throw error;
        }
    }

    /**
     * Get alert message based on capacity percentage
     * @param {number} percentage
     * @returns {string}
     */
    getAlertMessage(percentage) {
        if (percentage >= 95) {
            return 'Critical: Generator at maximum capacity! Cannot accept new subscribers.';
        } else if (percentage >= 85) {
            return 'Warning: Generator capacity above 85%. Consider limiting new subscriptions.';
        } else if (percentage >= 70) {
            return 'Moderate: Generator capacity above 70%. Monitor closely.';
        }
        return '';
    }

    /**
     * Get capacity statistics for owner dashboard
     * @param {number} ownerId
     * @returns {Promise<Object>}
     */
    async getOwnerCapacityStats(ownerId) {
        try {
            const [stats] = await db.query(
                `SELECT
                    COUNT(g.generator_id) as total_generators,
                    SUM(g.max_amperage) as total_capacity,
                    SUM(gcv.used_amperage) as total_used,
                    SUM(gcv.available_amperage) as total_available,
                    AVG(gcv.capacity_percentage) as avg_utilization,
                    COUNT(CASE WHEN gcv.capacity_percentage >= 85 THEN 1 END) as generators_at_risk
                 FROM generators g
                 JOIN generator_capacity_view gcv ON g.generator_id = gcv.generator_id
                 WHERE g.owner_id = ?`,
                [ownerId]
            );

            if (stats.length === 0) {
                return null;
            }

            return {
                totalGenerators: stats[0].total_generators,
                totalCapacity: stats[0].total_capacity,
                totalUsed: stats[0].total_used,
                totalAvailable: stats[0].total_available,
                avgUtilization: parseFloat(stats[0].avg_utilization).toFixed(2),
                generatorsAtRisk: stats[0].generators_at_risk
            };
        } catch (error) {
            console.error('Error fetching owner capacity stats:', error);
            throw error;
        }
    }
}

module.exports = new CapacityService();
