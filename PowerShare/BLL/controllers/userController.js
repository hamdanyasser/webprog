const userDAL = require('../../DAL/userDAL');

class UserController {
    async getAllUsers(req, res) {
        try {
            const users = await userDAL.getAllUsers();
            res.json({
                success: true,
                data: users
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch users'
            });
        }
    }

    async getUserById(req, res) {
        try {
            const { userId } = req.params;
            const user = await userDAL.findById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user'
            });
        }
    }

    async updateProfile(req, res) {
        try {
            const userId = req.user.user_id;
            const { full_name, phone, address } = req.body;

            const updateData = {
                full_name,
                phone,
                address
            };

            if (req.file) {
                updateData.profile_image = `/uploads/profile-images/${req.file.filename}`;
            }

            await userDAL.updateUser(userId, updateData);

            res.json({
                success: true,
                message: 'Profile updated successfully'
            });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update profile'
            });
        }
    }

    async updatePreferences(req, res) {
        try {
            const userId = req.user.user_id;
            const { email_notifications, sms_notifications, reminder_notifications } = req.body;

            await userDAL.updateUser(userId, {
                email_notifications: email_notifications !== undefined ? email_notifications : true,
                sms_notifications: sms_notifications !== undefined ? sms_notifications : true,
                reminder_notifications: reminder_notifications !== undefined ? reminder_notifications : true
            });

            res.json({
                success: true,
                message: 'Preferences updated successfully'
            });
        } catch (error) {
            console.error('Update preferences error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update preferences'
            });
        }
    }

    async getNotificationPreferences(req, res) {
        try {
            const userId = req.user.user_id;
            const preferences = await userDAL.getUserPreferences(userId);

            if (!preferences) {
                return res.status(404).json({
                    success: false,
                    message: 'User preferences not found'
                });
            }

            res.json({
                success: true,
                data: preferences
            });
        } catch (error) {
            console.error('Get preferences error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch preferences'
            });
        }
    }

    async updateNotificationPreferences(req, res) {
        try {
            const userId = req.user.user_id;
            const { email_notifications, outage_alerts, sms_notifications, theme } = req.body;

            const preferences = {
                email_notifications: email_notifications !== undefined ? email_notifications : true,
                outage_alerts: outage_alerts !== undefined ? outage_alerts : true,
                sms_notifications: sms_notifications !== undefined ? sms_notifications : false,
                theme: theme || 'light'
            };

            await userDAL.updateUserPreferences(userId, preferences);

            res.json({
                success: true,
                message: 'Notification preferences updated successfully',
                data: preferences
            });
        } catch (error) {
            console.error('Update notification preferences error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update notification preferences'
            });
        }
    }
}

module.exports = new UserController();