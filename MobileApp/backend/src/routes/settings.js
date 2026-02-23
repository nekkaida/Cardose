// System settings routes

const PROTECTED_SETTINGS = ['business_name', 'currency', 'tax_rate', 'default_markup'];

const KEY_FORMAT_REGEX = /^[a-z][a-z0-9_]{0,99}$/;

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
            is_protected: PROTECTED_SETTINGS.includes(setting.key),
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
          setting: {
            ...setting,
            is_protected: PROTECTED_SETTINGS.includes(setting.key),
          },
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
            value: { type: 'string', maxLength: 1000 },
            description: { type: 'string', maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { key } = request.params;

        if (!KEY_FORMAT_REGEX.test(key)) {
          reply.code(400);
          return {
            success: false,
            error:
              'Invalid key format. Use lowercase letters, numbers, and underscores. Must start with a letter. Max 100 characters.',
          };
        }

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

        if (PROTECTED_SETTINGS.includes(key)) {
          reply.code(403);
          return {
            success: false,
            error: 'This is a protected setting and cannot be deleted',
          };
        }

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
        const rawEntries = Object.entries(settings);

        // Normalize entries: accept both { key: "value" } and { key: { value, description } }
        const normalized = [];
        for (const [key, val] of rawEntries) {
          if (!KEY_FORMAT_REGEX.test(key)) {
            reply.code(400);
            return {
              success: false,
              error: `Invalid key format: "${key}". Use lowercase letters, numbers, and underscores. Must start with a letter.`,
            };
          }

          let value, description;
          if (typeof val === 'string') {
            value = val;
            description = undefined;
          } else if (typeof val === 'object' && val !== null && typeof val.value === 'string') {
            value = val.value;
            description = typeof val.description === 'string' ? val.description : undefined;
          } else {
            reply.code(400);
            return {
              success: false,
              error: `Value for key "${key}" must be a string or { value, description }.`,
            };
          }

          if (value.length > 1000) {
            reply.code(400);
            return {
              success: false,
              error: `Value for key "${key}" exceeds 1000 character limit.`,
            };
          }
          if (description && description.length > 500) {
            reply.code(400);
            return {
              success: false,
              error: `Description for key "${key}" exceeds 500 character limit.`,
            };
          }

          normalized.push({ key, value, description });
        }

        const upsert = db.db.transaction((rows) => {
          for (const { key, value, description } of rows) {
            const existing = db.db
              .prepare('SELECT key, description FROM settings WHERE key = ?')
              .get(key);

            if (existing) {
              db.db
                .prepare(
                  'UPDATE settings SET value = ?, description = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?'
                )
                .run(
                  value,
                  description !== undefined ? description : existing.description,
                  request.user.id,
                  key
                );
            } else {
              db.db
                .prepare(
                  'INSERT INTO settings (key, value, description, updated_by, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
                )
                .run(key, value, description || '', request.user.id);
            }
          }
        });

        upsert(normalized);

        return {
          success: true,
          message: `${normalized.length} settings updated`,
          updated: normalized.length,
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
