const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

// Indian Standard Time — all cron schedules are expressed in IST
const IST_TZ = 'Asia/Kolkata';

module.exports = { dayjs, IST_TZ };
