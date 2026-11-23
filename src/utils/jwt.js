/** JWT đã quá hạn chưa (chỉ đọc `exp`, không kiểm tra chữ ký): để chọn mã "hết hạn" thay vì "token sai". */
export function isJwtExpired(token) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}
