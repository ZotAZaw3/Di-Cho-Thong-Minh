import { send } from './response.js';

/**
 * Handler tạm cho API chưa làm: trả 501 đúng format để app biết route đã tồn tại.
 * Khi làm API, thay bằng controller thật.
 * @param {string} apiName tên API trong tài liệu
 */
export const notImplemented = (apiName) => (_req, res) =>
  send(res, 'NOT_IMPLEMENTED', { api: apiName });
