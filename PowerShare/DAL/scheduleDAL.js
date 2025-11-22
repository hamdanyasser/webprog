const db = require('./dbConnection');

class ScheduleDAL {
    async createSchedule(scheduleData) {
        const { generator_id, outage_date, start_time, end_time, notes } = scheduleData;

        const [result] = await db.execute(
            `INSERT INTO outage_schedules (generator_id, outage_date, start_time, end_time, notes) 
             VALUES (?, ?, ?, ?, ?)`,
            [generator_id, outage_date, start_time, end_time, notes]
        );

        return result.insertId;
    }

    async findById(scheduleId) {
        const [rows] = await db.execute(
            `SELECT os.*, g.generator_name, g.location
             FROM outage_schedules os
             JOIN generators g ON os.generator_id = g.generator_id
             WHERE os.schedule_id = ?`,
            [scheduleId]
        );
        return rows[0];
    }

    async getSchedulesByGenerator(generatorId, startDate, endDate) {
        const [rows] = await db.execute(
            `SELECT * FROM outage_schedules
             WHERE generator_id = ? AND outage_date BETWEEN ? AND ?
             ORDER BY outage_date ASC, start_time ASC`,
            [generatorId, startDate, endDate]
        );
        return rows;
    }

    async getTodaySchedules(generatorId) {
        const [rows] = await db.execute(
            `SELECT * FROM outage_schedules
             WHERE generator_id = ? AND outage_date = CURRENT_DATE()
             ORDER BY start_time ASC`,
            [generatorId]
        );
        return rows;
    }

    async getUpcomingSchedules(generatorId, days = 7) {
        const [rows] = await db.execute(
            `SELECT * FROM outage_schedules
             WHERE generator_id = ? 
             AND outage_date >= CURRENT_DATE()
             AND outage_date <= DATE_ADD(CURRENT_DATE(), INTERVAL ? DAY)
             ORDER BY outage_date ASC, start_time ASC`,
            [generatorId, days]
        );
        return rows;
    }

    async getAllSchedulesByGenerator(generatorId) {
        const [rows] = await db.execute(
            `SELECT * FROM outage_schedules
             WHERE generator_id = ?
             ORDER BY outage_date DESC, start_time DESC`,
            [generatorId]
        );
        return rows;
    }

    async updateSchedule(scheduleId, updates) {
        const { outage_date, start_time, end_time, notes } = updates;

        await db.execute(
            `UPDATE outage_schedules 
             SET outage_date = ?, start_time = ?, end_time = ?, notes = ?
             WHERE schedule_id = ?`,
            [outage_date, start_time, end_time, notes, scheduleId]
        );
    }

    async deleteSchedule(scheduleId) {
        await db.execute('DELETE FROM outage_schedules WHERE schedule_id = ?', [scheduleId]);
    }

    async bulkCreateSchedules(schedules) {
        const values = schedules.map(s => [s.generator_id, s.outage_date, s.start_time, s.end_time, s.notes]);

        await db.query(
            `INSERT INTO outage_schedules (generator_id, outage_date, start_time, end_time, notes) 
             VALUES ?`,
            [values]
        );
    }
}

module.exports = new ScheduleDAL();