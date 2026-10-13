const { command } = require('./redis');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let running = true;
process.on('SIGTERM', () => { running = false; });
async function work(redis = command) {
  while (running) {
    try {
      const item = await redis(['BRPOP', 'votes:pending', '1'], 3000);
      if (item?.[1]) await redis(['HINCRBY', 'votes:totals', item[1], '1']);
    } catch (err) { console.error(JSON.stringify({ event: 'worker_error', message: err.message })); await sleep(1000); }
  }
}
if (require.main === module) work();
module.exports = { work };
