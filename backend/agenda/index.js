const Agenda = require('agenda');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const Subscription = require('../models/Subscription');
const NotificationLog = require('../models/NotificationLog');

dayjs.extend(utc);
dayjs.extend(timezone);

const agenda = new Agenda({
  db: { address: process.env.MONGO_URI, collection: 'agendaJobs' },
  processEvery: '1 minute'
});

// Mock Email Sender
const mockSendEmail = async (to, subject, text) => {
  console.log(`[MOCK EMAIL to ${to}] Subject: ${subject} | Body: ${text}`);
  return true;
};

// Mock WhatsApp Sender
const mockSendWhatsApp = async (to, text) => {
  console.log(`[MOCK WHATSAPP to ${to}] Body: ${text}`);
  return true;
};

// Hourly Producer Job
agenda.define('send-subscription-alerts', async (job) => {
  const today = dayjs().startOf('day').toDate();
  
  // Efficient query using alertDate index
  const cursor = Subscription.find({ alertDate: today, status: 'ACTIVE' }).cursor();

  for (let sub = await cursor.next(); sub != null; sub = await cursor.next()) {
    const userLocalNow = dayjs().tz(sub.userTimezone || 'UTC');
    
    // Only trigger during the first hour of the user's local day
    if (userLocalNow.hour() !== 0) continue;

    // Schedule specific notification tasks
    if (sub.notifyViaEmail && sub.userEmail) {
      await agenda.now('execute-email', { sub });
    }

    if (sub.notifyViaWhatsApp && sub.userPhone) {
      await agenda.now('execute-whatsapp', { sub });
    }
  }
});

// Worker: Email
agenda.define('execute-email', { priority: 'high', concurrency: 10 }, async (job) => {
  const { sub } = job.attrs.data;
  
  // Idempotency check against NotificationLog
  const alreadySent = await NotificationLog.findOne({
    userId: sub.userId,
    subscriptionId: sub._id,
    type: 'EMAIL',
    sentForDate: sub.nextBillingDate
  });

  if (alreadySent) {
    console.log(`Email already sent for subscription ${sub._id} for date ${sub.nextBillingDate}`);
    return;
  }
  
  try {
    await mockSendEmail(
      sub.userEmail, 
      `${sub.serviceName} Renewal Alert`, 
      `Your ${sub.serviceName} subscription is renewing on ${sub.nextBillingDate}. Cost: $${sub.cost}.`
    );
    
    // Log success
    await NotificationLog.create({
      userId: sub.userId,
      subscriptionId: sub._id,
      type: 'EMAIL',
      sentForDate: sub.nextBillingDate,
      status: 'DELIVERED'
    });
  } catch (err) {
    console.error('Error sending email:', err);
    throw err; // Agenda handles retries
  }
});

// Worker: WhatsApp
agenda.define('execute-whatsapp', { priority: 'high', concurrency: 10 }, async (job) => {
  const { sub } = job.attrs.data;
  
  const alreadySent = await NotificationLog.findOne({
    userId: sub.userId,
    subscriptionId: sub._id,
    type: 'WHATSAPP',
    sentForDate: sub.nextBillingDate
  });

  if (alreadySent) return;
  
  try {
    await mockSendWhatsApp(
      sub.userPhone, 
      `ALERT: Your ${sub.serviceName} subscription renews on ${sub.nextBillingDate}. Cost: $${sub.cost}.`
    );
    
    await NotificationLog.create({
      userId: sub.userId,
      subscriptionId: sub._id,
      type: 'WHATSAPP',
      sentForDate: sub.nextBillingDate,
      status: 'DELIVERED'
    });
  } catch (err) {
    console.error('Error sending whatsapp:', err);
    throw err;
  }
});

// Start the scheduler
(async function() {
  // Wait for mongo connection (agenda handles internally, but we delay start)
  setTimeout(async () => {
    try {
      await agenda.start();
      console.log('Agenda started');
      
      // Remove existing hourly jobs to avoid duplicates (optional reset logic)
      await agenda.cancel({ name: 'send-subscription-alerts' });
      await agenda.every('1 hour', 'send-subscription-alerts');
    } catch (e) {
      console.error('Failed to start Agenda:', e);
    }
  }, 3000);
})();

module.exports = { agenda };
