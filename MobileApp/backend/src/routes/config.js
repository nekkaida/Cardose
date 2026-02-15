// Application configuration endpoint — single source of truth for all enums
async function configRoutes(fastify, options) {
  /**
   * GET /api/config
   * Returns all application enums and constants.
   * No authentication required — clients fetch this on startup.
   */
  fastify.get('/', async (request, reply) => {
    return {
      success: true,
      config: {
        statuses: {
          order: [
            { value: 'pending', label: 'Pending', color: '#FFA500' },
            { value: 'designing', label: 'Designing', color: '#4169E1' },
            { value: 'approved', label: 'Approved', color: '#9370DB' },
            { value: 'production', label: 'In Production', color: '#FF8C00' },
            { value: 'quality_control', label: 'Quality Control', color: '#FFD700' },
            { value: 'completed', label: 'Completed', color: '#228B22' },
            { value: 'cancelled', label: 'Cancelled', color: '#DC143C' },
          ],
          task: [
            { value: 'pending', label: 'Pending', color: '#FFA500' },
            { value: 'in_progress', label: 'In Progress', color: '#9370DB' },
            { value: 'completed', label: 'Completed', color: '#228B22' },
            { value: 'cancelled', label: 'Cancelled', color: '#DC143C' },
          ],
          invoice: [
            { value: 'draft', label: 'Draft', color: '#808080' },
            { value: 'sent', label: 'Sent', color: '#4169E1' },
            { value: 'paid', label: 'Paid', color: '#228B22' },
            { value: 'overdue', label: 'Overdue', color: '#DC143C' },
            { value: 'cancelled', label: 'Cancelled', color: '#696969' },
          ],
        },
        priorities: [
          { value: 'low', label: 'Low', color: '#6B7280' },
          { value: 'normal', label: 'Normal', color: '#3B82F6' },
          { value: 'high', label: 'High', color: '#F59E0B' },
          { value: 'urgent', label: 'Urgent', color: '#EF4444' },
        ],
        boxTypes: [
          { value: 'standard', label: 'Standard' },
          { value: 'premium', label: 'Premium' },
          { value: 'luxury', label: 'Luxury' },
          { value: 'custom', label: 'Custom' },
        ],
      },
    };
  });
}

module.exports = configRoutes;
