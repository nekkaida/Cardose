// System settings routes
async function settingsRoutes(fastify, options) {
  const db = fastify.db;

  /**
   * Get all settings
   */
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const settings = await db.all('SELECT * FROM settings ORDER BY key ASC');

      const settingsMap = {};
      settings.forEach(setting => {
        settingsMap[setting.key] = {
          value: setting.value,
          description: setting.description
        };
      });

      return {
        success: true,
        settings: settingsMap
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get settings', details: error.message });
    }
  });

  /**
   * Get specific setting
   */
  fastify.get('/:key', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { key } = request.params;

      const setting = await db.get('SELECT * FROM settings WHERE key = ?', [key]);

      if (!setting) {
        return reply.status(404).send({ error: 'Setting not found' });
      }

      return {
        success: true,
        setting
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get setting', details: error.message });
    }
  });

  /**
   * Update setting
   */
  fastify.put('/:key', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { key } = request.params;
      const { value, description } = request.body;

      if (value === undefined) {
        return reply.status(400).send({ error: 'Value is required' });
      }

      // Check if setting exists
      const existing = await db.get('SELECT * FROM settings WHERE key = ?', [key]);

      if (existing) {
        // Update existing setting
        await db.run(
          'UPDATE settings SET value = ?, description = ? WHERE key = ?',
          [value, description || existing.description, key]
        );
      } else {
        // Create new setting
        await db.run(
          'INSERT INTO settings (key, value, description) VALUES (?, ?, ?)',
          [key, value, description || '']
        );
      }

      return {
        success: true,
        message: 'Setting updated successfully',
        setting: { key, value, description }
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update setting', details: error.message });
    }
  });

  /**
   * Delete setting
   */
  fastify.delete('/:key', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { key } = request.params;

      await db.run('DELETE FROM settings WHERE key = ?', [key]);

      return {
        success: true,
        message: 'Setting deleted successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete setting', details: error.message });
    }
  });

  /**
   * Batch update settings
   */
  fastify.post('/batch', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { settings } = request.body;

      if (!settings || typeof settings !== 'object') {
        return reply.status(400).send({ error: 'Settings object is required' });
      }

      for (const [key, value] of Object.entries(settings)) {
        const existing = await db.get('SELECT * FROM settings WHERE key = ?', [key]);

        if (existing) {
          await db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
        } else {
          await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
        }
      }

      return {
        success: true,
        message: `${Object.keys(settings).length} settings updated`,
        updated: Object.keys(settings).length
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to batch update settings', details: error.message });
    }
  });
}

module.exports = settingsRoutes;
