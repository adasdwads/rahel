const app = require('./app');
const { port } = require('./config/env');
const initializeDatabase = require('./config/initDb');
const { runWeeklyHeartbeatChecks } = require('./automation/heartbeatScheduler');
const { startCapsuleDeliveryScheduler } = require('./automation/capsuleDelivery');

initializeDatabase();
runWeeklyHeartbeatChecks();
startCapsuleDeliveryScheduler();

app.listen(port, () => {
  console.log(`RAHEL backend listening on port ${port}`);
});