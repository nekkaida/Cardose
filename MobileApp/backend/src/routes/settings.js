// System settings routes
async function settingsRoutes(fastify, options) {
  const db = fastify.db;

  /**
   * Get all settings
   */
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const settings = db.db
          .prepare('SELECT key, value, description FROM settings ORDER BY key ASC')
          .all();

        const settingsMap = {};
        settings.forEach((setting) => {
          settingsMap[setting.key] = {
            value: setting.value,
            description: setting.description,
          };
        });

        return {
          success: true,
          settings: settingsMap,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'Failed to get settings' };
      }
    }
  );

  /**
   * Get specific setting
   */
  fastify.get(
    '/:key',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { key } = request.params;

        const setting = db.db
          .prepare('SELECT key, value, description FROM settings WHERE key = ?')
          .get(key);

        if (!setting) {
          reply.code(404);
          return { success: false, error: 'Setting not found' };
        }

        return {
          success: true,
          setting,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'Failed to get setting' };
      }
    }
  );

  /**
   * Update setting (upsert)
   */
  fastify.put(
    '/:key',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])],
      schema: {
        body: {
          type: 'object',
          required: ['value'],
          properties: {
            value: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { key } = request.params;
        const { value, description } = request.body;

        // Check if setting exists
        const existing = db.db
          .prepare('SELECT key, description FROM settings WHERE key = ?')
          .get(key);

        if (existing) {
          db.db
            .prepare(
              'UPDATE settings SET value = ?, description = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?'
            )
            .run(value, description || existing.description, request.user.id, key);
        } else {
          db.db
            .prepare(
              'INSERT INTO settings (key, value, description, updated_by, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
            )
            .run(key, value, description || '', request.user.id);
        }

        return {
          success: true,
          message: 'Setting updated successfully',
          setting: { key, value, description: description || existing?.description || '' },
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'Failed to update setting' };
      }
    }
  );

  /**
   * Delete setting
   */
  fastify.delete(
    '/:key',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])],
    },
    async (request, reply) => {
      try {
        const { key } = request.params;

        const result = db.db.prepare('DELETE FROM settings WHERE key = ?').run(key);

        if (result.changes === 0) {
          reply.code(404);
          return { success: false, error: 'Setting not found' };
        }

        return {
          success: true,
          message: 'Setting deleted successfully',
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'Failed to delete setting' };
      }
    }
  );

  /**
   * Batch update settings (transactional)
   */
  fastify.post(
    '/batch',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])],
      schema: {
        body: {
          type: 'object',
          required: ['settings'],
          properties: { settings: { type: 'object' } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { settings } = request.body;

        const upsert = db.db.transaction((entries) => {
          for (const [key, value] of entries) {
            const existing = db.db.prepare('SELECT key FROM settings WHERE key = ?').get(key);

            if (existing) {
              db.db
                .prepare(
                  'UPDATE settings SET value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?'
                )
                .run(value, request.user.id, key);
            } else {
              db.db
                .prepare(
                  'INSERT INTO settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
                )
                .run(key, value, request.user.id);
            }
          }
        });

        upsert(Object.entries(settings));

        return {
          success: true,
          message: `${Object.keys(settings).length} settings updated`,
          updated: Object.keys(settings).length,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'Failed to batch update settings' };
      }
    }
  );
}

module.exports = settingsRoutes;
