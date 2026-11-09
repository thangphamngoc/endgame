'use strict';
/**
 * Xoay file log theo kích thước (P3-05, cycle 22 — backlog #13 bước 2).
 *
 * Quy ước: file log `app.log` khi vượt ngưỡng sẽ được đổi tên thành
 * `app.log.1`, `.1` cũ thành `.2`, ... `.N` cũ nhất bị xóa (giữ tối đa
 * `keep` thế hệ). Chỉ dùng các thao tác đồng bộ của fs và không bao giờ
 * throw — lỗi (quyền ghi, file đang bị khóa...) trả về false để bên gọi
 * tự quyết định fallback, log không được làm chết server/supervisor.
 */
const fs = require('fs');

/**
 * Xoay file log: file -> file.1, file.(keep-1) -> file.keep, xóa file.keep cũ.
 * @param {string} file  Đường dẫn file log.
 * @param {number} keep  Số thế hệ giữ lại (>= 1, mặc định 3).
 * @returns {boolean} true nếu đã xoay (file tồn tại và đổi tên xong).
 */
function rotateLogFile(file, keep) {
  keep = Math.max(1, Math.floor(keep) || 3);
  try {
    if (!fs.existsSync(file)) return false;
    const oldest = file + '.' + keep;
    if (fs.existsSync(oldest)) fs.unlinkSync(oldest);
    for (let i = keep - 1; i >= 1; i--) {
      const src = file + '.' + i;
      const dst = file + '.' + (i + 1);
      if (fs.existsSync(src)) fs.renameSync(src, dst);
    }
    fs.renameSync(file, file + '.1');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * File đã tới ngưỡng cần xoay chưa.
 * @param {string} file Đường dẫn file log.
 * @param {number} maxBytes Ngưỡng byte (>= 0).
 * @returns {boolean} true khi file tồn tại và size >= maxBytes.
 */
function needsRotation(file, maxBytes) {
  try {
    return fs.statSync(file).size >= maxBytes;
  } catch (e) {
    return false;
  }
}

module.exports = { rotateLogFile, needsRotation };
