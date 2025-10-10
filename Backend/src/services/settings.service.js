// src/services/settings.service.js
const db = require('../lib/db');

class SettingsService {
  /**
   * Get all global settings
   */
  static async getGlobalSettings() {
    try {
      // Try to get settings from database first
      const [rows] = await db.query(`
        SELECT setting_key, setting_value, setting_type 
        FROM global_settings 
        WHERE is_active = 1
        ORDER BY setting_key
      `);

      const settings = {};
      rows.forEach(row => {
        let value = row.setting_value;
        
        // Parse value based on type
        switch (row.setting_type) {
          case 'boolean':
            value = value === 'true' || value === '1';
            break;
          case 'number':
            value = parseFloat(value);
            break;
          case 'json':
            try {
              value = JSON.parse(value);
            } catch (e) {
              console.warn(`Invalid JSON in setting ${row.setting_key}:`, value);
            }
            break;
          // 'string' and others remain as string
        }
        
        settings[row.setting_key] = value;
      });

      // Return settings with defaults if database is empty
      return {
        app_name: settings.app_name || 'Swift Shop',
        app_version: settings.app_version || '2.0.0',
        default_currency: settings.default_currency || '$',
        currency_code: settings.currency_code || 'USD',
        timezone: settings.timezone || 'UTC',
        date_format: settings.date_format || 'YYYY-MM-DD',
        time_format: settings.time_format || 'HH:mm:ss',
        items_per_page: settings.items_per_page || 20,
        max_upload_size: settings.max_upload_size || '10MB',
        allowed_file_types: settings.allowed_file_types || ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        maintenance_mode: settings.maintenance_mode || false,
        registration_enabled: settings.registration_enabled || true,
        email_verification_required: settings.email_verification_required || false,
        ...settings // Include any additional settings from database
      };
    } catch (error) {
      console.warn('Could not fetch settings from database, returning defaults:', error.message);
      
      // Return default settings if database query fails
      return {
        app_name: 'Swift Shop',
        app_version: '2.0.0',
        default_currency: '$',
        currency_code: 'USD',
        timezone: 'UTC',
        date_format: 'YYYY-MM-DD',
        time_format: 'HH:mm:ss',
        items_per_page: 20,
        max_upload_size: '10MB',
        allowed_file_types: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        maintenance_mode: false,
        registration_enabled: true,
        email_verification_required: false
      };
    }
  }

  /**
   * Get a specific setting by key
   */
  static async getSetting(key) {
    try {
      const [rows] = await db.query(
        'SELECT setting_value, setting_type FROM global_settings WHERE setting_key = ? AND is_active = 1 LIMIT 1',
        [key]
      );

      if (rows.length === 0) {
        return null;
      }

      let value = rows[0].setting_value;
      const type = rows[0].setting_type;

      // Parse value based on type
      switch (type) {
        case 'boolean':
          value = value === 'true' || value === '1';
          break;
        case 'number':
          value = parseFloat(value);
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            console.warn(`Invalid JSON in setting ${key}:`, value);
          }
          break;
      }

      return value;
    } catch (error) {
      console.warn(`Could not fetch setting ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Update or create a setting
   */
  static async setSetting(key, value, type = 'string') {
    try {
      let stringValue = value;
      
      // Convert value to string based on type
      switch (type) {
        case 'boolean':
          stringValue = value ? 'true' : 'false';
          break;
        case 'number':
          stringValue = value.toString();
          break;
        case 'json':
          stringValue = JSON.stringify(value);
          break;
        default:
          stringValue = String(value);
      }

      const [result] = await db.query(`
        INSERT INTO global_settings (setting_key, setting_value, setting_type, is_active, updated_at)
        VALUES (?, ?, ?, 1, NOW())
        ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        setting_type = VALUES(setting_type),
        updated_at = NOW()
      `, [key, stringValue, type]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Could not set setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a setting
   */
  static async deleteSetting(key) {
    try {
      const [result] = await db.query(
        'UPDATE global_settings SET is_active = 0, updated_at = NOW() WHERE setting_key = ?',
        [key]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Could not delete setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Get app version and basic info
   */
  static getAppInfo() {
    return {
      name: 'Swift Shop',
      version: '2.0.0',
      description: 'Modern e-commerce platform built with Node.js and React',
      author: 'Swift Shop Team',
      environment: process.env.NODE_ENV || 'development',
      node_version: process.version,
      uptime: Math.floor(process.uptime()),
      memory_usage: process.memoryUsage()
    };
  }
}

module.exports = SettingsService;