/**
 * Standardized API Response formatter modeled after EduTechLab 3-layer architecture
 */
class ApiResponse {
  static success(res, data = {}, message = 'Success', statusCode = 200, meta = null) {
    const payload = {
      success: true,
      statusCode,
      message,
      data
    };
    if (meta) {
      payload.meta = meta;
    }
    return res.status(statusCode).json(payload);
  }

  static created(res, data = {}, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static accepted(res, data = {}, message = 'Request accepted for processing') {
    return this.success(res, data, message, 202);
  }
}

export default ApiResponse;
