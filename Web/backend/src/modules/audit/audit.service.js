import AuditLog from '../../models/AuditLog.js';

class AuditService {
  async getAuditLogs({ action, page = 1, limit = 20 }) {
    const query = {};
    if (action) query.action = action;

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('performedBy', 'email fullName role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }
}

export default new AuditService();
