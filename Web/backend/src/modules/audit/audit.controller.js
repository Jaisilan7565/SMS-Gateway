import auditService from './audit.service.js';
import ApiResponse from '../../utils/apiResponse.js';

class AuditController {
  async getAuditLogs(req, res, next) {
    try {
      const { action, page, limit } = req.query;
      const result = await auditService.getAuditLogs({ action, page, limit });
      return ApiResponse.success(res, result, 'Audit logs retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export default new AuditController();
