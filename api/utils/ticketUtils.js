/**
 * Tạo Ticket ID duy nhất cho vé
 * @param {string} eventId - ID của sự kiện
 * @param {string} userId - ID của người dùng
 * @returns {string} Ticket ID duy nhất
 */
function generateTicketId(eventId, userId) {
    const timestamp = new Date().getTime().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    
    // Sử dụng 3 ký tự đầu tiên từ eventId và userId để tạo prefix
    const eventPrefix = eventId.toString().substring(0, 3);
    const userPrefix = userId.toString().substring(0, 3);
    
    return `TIX-${eventPrefix}${userPrefix}-${timestamp}-${random}`.toUpperCase();
  }
  
  module.exports = {
    generateTicketId
  };