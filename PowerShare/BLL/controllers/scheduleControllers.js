const scheduleDAL = require('../../DAL/scheduleDAL');
const notificationDAL = require('../../DAL/notificationDAL');

class ScheduleControllers {
    async createSchedule(req, res) {
        try {
            const scheduleData = req.body;
            const scheduleId = await scheduleDAL.createSchedule(scheduleData);

            await notificationDAL.notifySubscribers(
                scheduleData.generator_id,
                'New Outage Schedule',
                `Power outage scheduled for ${scheduleData.outage_date} from ${scheduleData.start_time} to ${scheduleData.end_time}`,
                'outage'
            );

            res.status(201).json({
                success: true,
                message: 'Schedule created successfully',
                data: { scheduleId }
            });
        } catch (error) {
            console.error('Create schedule error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create schedule'
            });
        }
    }

    async getTodaySchedules(req, res) {
        try {
            const { generatorId } = req.params;
            const schedules = await scheduleDAL.getTodaySchedules(generatorId);

            res.json({
                success: true,
                data: schedules
            });
        } catch (error) {
            console.error('Get today schedules error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch schedules'
            });
        }
    }

    async getUpcomingSchedules(req, res) {
        try {
            const { generatorId } = req.params;
            const { days } = req.query;

            const schedules = await scheduleDAL.getUpcomingSchedules(generatorId, days || 7);

            res.json({
                success: true,
                data: schedules
            });
        } catch (error) {
            console.error('Get upcoming schedules error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch schedules'
            });
        }
    }

    async getSchedulesByDateRange(req, res) {
        try {
            const { generatorId } = req.params;
            const { startDate, endDate } = req.query;

            const schedules = await scheduleDAL.getSchedulesByGenerator(generatorId, startDate, endDate);

            res.json({
                success: true,
                data: schedules
            });
        } catch (error) {
            console.error('Get schedules error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch schedules'
            });
        }
    }

    async updateSchedule(req, res) {
        try {
            const { scheduleId } = req.params;
            const updates = req.body;

            await scheduleDAL.updateSchedule(scheduleId, updates);

            res.json({
                success: true,
                message: 'Schedule updated successfully'
            });
        } catch (error) {
            console.error('Update schedule error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update schedule'
            });
        }
    }

    async deleteSchedule(req, res) {
        try {
            const { scheduleId } = req.params;

            await scheduleDAL.deleteSchedule(scheduleId);

            res.json({
                success: true,
                message: 'Schedule deleted successfully'
            });
        } catch (error) {
            console.error('Delete schedule error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete schedule'
            });
        }
    }

    async bulkCreateSchedules(req, res) {
        try {
            const { schedules } = req.body;

            await scheduleDAL.bulkCreateSchedules(schedules);

            res.status(201).json({
                success: true,
                message: 'Schedules created successfully'
            });
        } catch (error) {
            console.error('Bulk create error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create schedules'
            });
        }
    }
}

module.exports = new ScheduleControllers();