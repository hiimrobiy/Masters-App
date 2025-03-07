// notificationService.js
let clients;

function initNotificationService(clientsMap) {
  clients = clientsMap;
}
function addClients(userId,ws) {
    clients.set(userId, ws);
}

function sendNotification(userId, message) {
  const client = clients.get(Number(userId));
  if (client && client.readyState === client.OPEN) {
    client.send(JSON.stringify({ type: 'NOTIFICATION', content: message }));
  }
}

module.exports = { initNotificationService, sendNotification };
