const db = require('./dbConnection');

class AdminDAL {
   
    async getTotalUsersCount() {
        const [rows] = await db.execute(
            'SELECT COUNT(*) as total FROM users'
        );
        return rows[0].total;
    }

    async getTotalGeneratorOwnersCount() {
        const [rows] = await db.execute(
            `SELECT COUNT(DISTINCT owner_id) as total FROM generators`
        );
        return rows[0].total;
    }

    async getTotalRevenue() {
        const [rows] = await db.execute(
            `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'`
        );
        return rows[0].total;
    }

    async getPendingIssuesCount() {
        const [overdueResult] = await db.execute(
            `SELECT COUNT(*) as overdue_bills 
             FROM bills 
             WHERE status = 'pending' AND due_date < CURRENT_DATE()`
        );
        
        const [inactiveResult] = await db.execute(
            `SELECT COUNT(*) as inactive_generators 
             FROM generators 
             WHERE status = 'inactive'`
        );
        
        return overdueResult[0].overdue_bills + inactiveResult[0].inactive_generators;
    }

    async getUserGrowthStats(months = 12) {
        const [rows] = await db.execute(
            `SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as user_count
             FROM users
             WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? MONTH)
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY month ASC`,
            [months]
        );
        return rows;
    }

    async getGeneratorOwnerGrowthStats(months = 12) {
        const [rows] = await db.execute(
            `SELECT 
                DATE_FORMAT(g.created_at, '%Y-%m') as month,
                COUNT(DISTINCT g.owner_id) as owner_count
             FROM generators g
             WHERE g.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? MONTH)
             GROUP BY DATE_FORMAT(g.created_at, '%Y-%m')
             ORDER BY month ASC`,
            [months]
        );
        return rows;
    }

    async getUserTypeDistribution() {
        const [rows] = await db.execute(
            `SELECT 
                role,
                COUNT(*) as count
             FROM users
             GROUP BY role`
        );
        return rows;
    }

    async getMonthlyGrowth() {
        const [rows] = await db.execute(
            `SELECT 
                (SELECT COUNT(*) FROM users 
                 WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
                 AND YEAR(created_at) = YEAR(CURRENT_DATE())) as current_month,
                (SELECT COUNT(*) FROM users 
                 WHERE MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) 
                 AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))) as last_month`
        );
        
        const current = rows[0].current_month;
        const last = rows[0].last_month;
        const growth = last > 0 ? ((current - last) / last * 100).toFixed(1) : 0;
        
        return {
            current_month: current,
            last_month: last,
            growth_percentage: growth
        };
    }

  
    async getRevenueByMonth(months = 12) {
        const [rows] = await db.execute(
            `SELECT 
                DATE_FORMAT(payment_date, '%Y-%m') as month,
                DATE_FORMAT(payment_date, '%b') as month_name,
                SUM(amount) as revenue
             FROM payments
             WHERE status = 'completed'
             AND payment_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ? MONTH)
             GROUP BY DATE_FORMAT(payment_date, '%Y-%m'), DATE_FORMAT(payment_date, '%b')
             ORDER BY month ASC`,
            [months]
        );
        return rows;
    }

    async getRevenueGrowth() {
        const [rows] = await db.execute(
            `SELECT 
                (SELECT COALESCE(SUM(amount), 0) FROM payments 
                 WHERE status = 'completed'
                 AND MONTH(payment_date) = MONTH(CURRENT_DATE()) 
                 AND YEAR(payment_date) = YEAR(CURRENT_DATE())) as current_month,
                (SELECT COALESCE(SUM(amount), 0) FROM payments 
                 WHERE status = 'completed'
                 AND MONTH(payment_date) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) 
                 AND YEAR(payment_date) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))) as last_month`
        );
        
        const current = parseFloat(rows[0].current_month);
        const last = parseFloat(rows[0].last_month);
        const growth = last > 0 ? ((current - last) / last * 100).toFixed(1) : 0;
        
        return {
            current_month: current,
            last_month: last,
            growth_percentage: growth
        };
    }


    async getNewUsersThisWeek() {
        const [rows] = await db.execute(
            `SELECT COUNT(*) as count
             FROM users
             WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)`
        );
        return rows[0].count;
    }

    async getAllUsersWithStats() {
        const [rows] = await db.execute(
            `SELECT
                u.user_id,
                u.full_name,
                u.email,
                u.phone,
                u.address,
                u.role,
                u.status,
                u.created_at,
                COUNT(DISTINCT s.subscription_id) as subscription_count,
                COALESCE(SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END), 0) as pending_bills
             FROM users u
             LEFT JOIN subscriptions s ON u.user_id = s.user_id
             LEFT JOIN bills b ON s.subscription_id = b.subscription_id
             GROUP BY u.user_id
             ORDER BY u.created_at DESC`
        );
        return rows;
    }

    async getUserDetailById(userId) {
        const [userRows] = await db.execute(
            'SELECT user_id, full_name, email, phone, address, role, status, created_at FROM users WHERE user_id = ?',
            [userId]
        );
        
        if (userRows.length === 0) return null;
        
        const user = userRows[0];
        
        const [subscriptions] = await db.execute(
            `SELECT s.*, g.generator_name, pp.plan_name, pp.monthly_price, pp.amperage
             FROM subscriptions s
             JOIN generators g ON s.generator_id = g.generator_id
             JOIN pricing_plans pp ON s.plan_id = pp.plan_id
             WHERE s.user_id = ?`,
            [userId]
        );
        
        const [payments] = await db.execute(
            `SELECT p.*, b.billing_period_start, b.billing_period_end
             FROM payments p
             JOIN bills b ON p.bill_id = b.bill_id
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             WHERE s.user_id = ?
             ORDER BY p.payment_date DESC
             LIMIT 10`,
            [userId]
        );
        
        const [bills] = await db.execute(
            `SELECT b.*, g.generator_name
             FROM bills b
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             JOIN generators g ON s.generator_id = g.generator_id
             WHERE s.user_id = ? AND b.status = 'pending'
             ORDER BY b.due_date ASC`,
            [userId]
        );
        
        return {
            ...user,
            subscriptions,
            payments,
            pending_bills: bills
        };
    }


    async getAllGeneratorsWithStats() {
        const [rows] = await db.execute(
            `SELECT 
                g.*,
                u.full_name as owner_name,
                u.email as owner_email,
                u.phone as owner_phone,
                COUNT(DISTINCT s.subscription_id) as subscriber_count,
                COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.subscription_id END) as active_subscribers,
                COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_revenue
             FROM generators g
             LEFT JOIN users u ON g.owner_id = u.user_id
             LEFT JOIN subscriptions s ON g.generator_id = s.generator_id
             LEFT JOIN bills b ON s.subscription_id = b.subscription_id
             LEFT JOIN payments p ON b.bill_id = p.bill_id
             GROUP BY g.generator_id
             ORDER BY g.created_at DESC`
        );
        return rows;
    }

    async getGeneratorDetailById(genId) {
        const [genRows] = await db.execute(
            `SELECT g.*, u.full_name as owner_name, u.email as owner_email, u.phone as owner_phone
             FROM generators g
             LEFT JOIN users u ON g.owner_id = u.user_id
             WHERE g.generator_id = ?`,
            [genId]
        );
        
        if (genRows.length === 0) return null;
        
        const generator = genRows[0];
        
        const [subscribers] = await db.execute(
            `SELECT s.*, u.full_name, u.email, pp.plan_name, pp.monthly_price, pp.amperage
             FROM subscriptions s
             JOIN users u ON s.user_id = u.user_id
             JOIN pricing_plans pp ON s.plan_id = pp.plan_id
             WHERE s.generator_id = ?
             ORDER BY s.start_date DESC`,
            [genId]
        );
        
        const [revenueStats] = await db.execute(
            `SELECT 
                COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN p.status = 'completed' 
                    AND MONTH(p.payment_date) = MONTH(CURRENT_DATE()) 
                    AND YEAR(p.payment_date) = YEAR(CURRENT_DATE()) 
                    THEN p.amount ELSE 0 END), 0) as monthly_revenue
             FROM payments p
             JOIN bills b ON p.bill_id = b.bill_id
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             WHERE s.generator_id = ?`,
            [genId]
        );
        
        return {
            ...generator,
            subscribers,
            revenue_stats: revenueStats[0]
        };
    }


    async getAllPaymentsWithDetails() {
        const [rows] = await db.execute(
            `SELECT 
                p.*,
                u.full_name as user_name,
                u.email as user_email,
                g.generator_name,
                b.billing_period_start,
                b.billing_period_end
             FROM payments p
             JOIN bills b ON p.bill_id = b.bill_id
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             JOIN users u ON s.user_id = u.user_id
             JOIN generators g ON s.generator_id = g.generator_id
             ORDER BY p.payment_date DESC
             LIMIT 100`
        );
        return rows;
    }

    async getPaymentStatistics() {
        const [rows] = await db.execute(
            `SELECT 
                COUNT(*) as total_payments,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as average_amount,
                COUNT(DISTINCT payment_method) as payment_methods_used
             FROM payments
             WHERE status = 'completed'`
        );
        return rows[0];
    }

    async getDashboardOverview() {
        const totalUsers = await this.getTotalUsersCount();
        const totalOwners = await this.getTotalGeneratorOwnersCount();
        const totalRevenue = await this.getTotalRevenue();
        const pendingIssues = await this.getPendingIssuesCount();
        const monthlyGrowth = await this.getMonthlyGrowth();
        const revenueGrowth = await this.getRevenueGrowth();
        const newUsersThisWeek = await this.getNewUsersThisWeek();

        return {
            total_users: totalUsers,
            total_generator_owners: totalOwners,
            total_revenue: totalRevenue,
            pending_issues: pendingIssues,
            user_growth: monthlyGrowth,
            revenue_growth: revenueGrowth,
            new_users_this_week: newUsersThisWeek
        };
    }
}

module.exports = new AdminDAL();

