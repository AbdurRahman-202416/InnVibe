/**
 * Adds realistic sample data to the database: bookings (completed, in-house, upcoming and cancelled stays),
 * guest feedback and newsletter subscribers. Run it with:  npm run seed:sample
 *
 * Safe to run more than once: every sample booking has a fixed confirmation code and is skipped when it already
 * exists, reviews are one per booking, subscribers are matched by e-mail. Dates are relative to the day it is first run.
 * It writes straight to MongoDB (the API refuses bookings in the past), and keeps the "roomnights" collection
 * consistent: every non-cancelled booking holds its nights, so no room can be double booked afterwards.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');

const DAY = 86400000;
const iso = (offset) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
const at = (offset, hour = 10) => new Date(new Date(iso(offset)).getTime() + hour * 3600000);

/** Same maths as backend/src/bookings/pricing.ts */
const price = (nights, rate) => {
  const subtotal = nights * rate;
  const serviceCharge = Math.round(subtotal * 0.1);
  const vat = Math.round((subtotal + serviceCharge) * 0.15);
  return { subtotal, serviceCharge, vat, totalAmount: subtotal + serviceCharge + vat };
};

// Deterministic confirmation codes (same alphabet as the API: no 0/O/1/I), so re-running never duplicates.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codeFor = (index) => {
  let h = Math.imul(index + 1, 0x9e3779b1) >>> 0; // 32-bit integer maths only, so it is exact and repeatable
  let out = '';
  for (let i = 0; i < 6; i++) {
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0; // keep it an unsigned 32-bit number (a negative one would index the alphabet with undefined)
    out += ALPHABET[h % ALPHABET.length];
  }
  return `IV-${out}`;
};

// [name, e-mail|null, phone, room, check-in offset, check-out offset, guests, source, payment method|null, special requests, cancellation]
const B = (name, email, phone, room, inOff, outOff, guests, source, pay, requests, cancel) => ({ name, email, phone, room, inOff, outOff, guests, source, pay, requests, cancel });
const BOOKINGS = [
  // completed stays
  B('Tanvir Ahmed', 'tanvir.ahmed@gmail.com', '01711234501', '103', -20, -17, 1, 'online', 'card', 'Early check-in around 11 am if possible.'),
  B('Nusrat Jahan', 'nusrat.jahan@gmail.com', '01819230142', '203', -18, -15, 2, 'online', 'bkash'),
  B('Michael Thompson', 'michael.thompson@outlook.com', '01955108833', '401', -16, -13, 2, 'online', 'card', 'Airport pickup, flight BG 202 lands at 6:40 am.'),
  B('Farzana Karim', 'farzana.karim@yahoo.com', '01613409928', '303', -15, -12, 2, 'online', 'nagad'),
  B('Arif Hossain', null, '01744002871', '104', -14, -11, 1, 'front-desk', null),
  B('Sarah Mitchell', 'sarah.mitchell@gmail.com', '01711002233', '204', -12, -9, 2, 'online', 'card', 'Quiet room please, I am a light sleeper.'),
  B('Imran Chowdhury', 'imran.chowdhury@gmail.com', '01817645519', '304', -10, -7, 3, 'online', 'bkash'),
  B('Priya Sharma', 'priya.sharma@hotmail.com', '01933580466', '402', -9, -6, 2, 'online', 'card', 'Vegetarian breakfast please.'),
  B('Kamal Uddin', null, '01712889034', '105', -8, -5, 1, 'front-desk', null),
  B('Elena Petrova', 'elena.petrova@gmail.com', '01688720915', '205', -6, -3, 2, 'online', 'card'),
  // in house tonight
  B('Mehjabin Chowdhury', null, '01755340622', '207', -3, 1, 2, 'front-desk', null),
  B('Rafiq Islam', 'rafiq.islam@gmail.com', '01711456082', '206', -2, 2, 2, 'online', 'bkash', 'Our anniversary. A small cake in the room would be lovely.'),
  B('Sadia Rahman', 'sadia.rahman@gmail.com', '01822093715', '305', -1, 3, 3, 'online', 'nagad'),
  B('David Chen', 'david.chen@outlook.com', '01911670248', '403', 0, 3, 4, 'online', 'card', 'Two extra towels and a baby cot, please.'),
  // upcoming
  B('Jamal Hossain', 'jamal.hossain@yahoo.com', '01714882930', '102', 2, 4, 1, 'online', 'card'),
  B('Anika Tabassum', 'anika.tabassum@gmail.com', '01812960473', '103', 3, 6, 1, 'online', 'bkash'),
  B('Robert Williams', 'robert.williams@gmail.com', '01955321870', '401', 5, 9, 2, 'online', 'card', 'Late check-in, we land around 11 pm.'),
  B('Shirin Akter', null, '01719045586', '203', 6, 9, 2, 'front-desk', null),
  B('Tariq Mahmud', 'tariq.mahmud@gmail.com', '01624507719', '303', 8, 11, 2, 'online', 'nagad'),
  B('Olivia Brown', 'olivia.brown@outlook.com', '01987034655', '104', 10, 13, 1, 'online', 'card'),
  B('Rashed Khan', 'rashed.khan@gmail.com', '01716258804', '204', 11, 14, 2, 'online', 'bkash'),
  B('Nabila Hasan', 'nabila.hasan@gmail.com', '01813779026', '402', 12, 15, 2, 'online', 'card', 'Birthday weekend. Any small surprise is welcome.'),
  B('Mahbub Alam', null, '01711930457', '105', 14, 16, 1, 'front-desk', null),
  B('Laila Begum', 'laila.begum@yahoo.com', '01921408362', '304', 15, 18, 3, 'online', 'nagad'),
  B('James Anderson', 'james.anderson@gmail.com', '01955870114', '403', 18, 23, 4, 'online', 'card', 'Business trip. Early breakfast and a printer would help.'),
  B('Fahim Reza', 'fahim.reza@gmail.com', '01715604298', '205', 20, 22, 2, 'online', 'bkash'),
  B('Tasnim Ara', 'tasnim.ara@gmail.com', '01817392650', '206', 22, 25, 2, 'online', 'card'),
  B('Hasan Mahmud', null, '01758120934', '305', 25, 28, 3, 'front-desk', null),
  B('Sophie Martin', 'sophie.martin@outlook.com', '01955741208', '101', 30, 33, 1, 'online', 'card'),
  B('Ibrahim Khalil', 'ibrahim.khalil@gmail.com', '01716983340', '207', 35, 38, 2, 'online', 'nagad'),
  // cancelled by staff (these keep a record, but hold no room)
  B('Chris Taylor', 'chris.taylor@gmail.com', '01955660781', '401', 5, 8, 2, 'online', 'card', undefined, { daysAgo: 3, by: 'admin', reason: 'Duplicate booking: the guest rebooked with different dates.' }),
  B('Moin Uddin', 'moin.uddin@gmail.com', '01713560247', '202', 3, 5, 2, 'online', 'card', undefined, { daysAgo: 1, by: 'frontdesk', reason: 'Guest requested: change of travel plans.' }),
  B('Rina Das', 'rina.das@yahoo.com', '01814097326', '301', 7, 10, 2, 'online', 'bkash', undefined, { daysAgo: 2, by: 'admin', reason: 'Payment problem: the bank reversed the charge and the guest could not be reached.' }),
  B('Ruma Akter', null, '01722381940', '304', 9, 11, 2, 'front-desk', null, undefined, { daysAgo: 1, by: 'frontdesk', reason: 'Guest cancelled by phone: family emergency.' }),
];

// index in BOOKINGS -> [rating, category, message]
const REVIEWS = {
  0: [5, 'praise', 'Spotless room, a really good breakfast and the front desk arranged my early check-in without any fuss. I will be back.'],
  1: [4, 'praise', 'Lovely staff and a very quiet room. Paying with bKash at booking was quick and easy.'],
  2: [5, 'praise', 'Stayed in the Suite for a work trip. The airport pickup was on time and the room was superb. Highly recommended.'],
  3: [3, 'suggestion', 'Beautiful room, but the Wi-Fi slowed down a lot in the evenings. A faster connection would make it perfect for working.'],
  4: [2, 'complaint', 'The air conditioning in my room was noisy and took a long time to fix. The front desk apologised, but I did not sleep well the first night.'],
  5: [5, 'praise', 'Exactly what I asked for: a quiet room away from the lift. I slept brilliantly, and the morning swim was a lovely bonus.'],
  6: [4, 'suggestion', 'Great stay overall. It would be nice to have a late check-out option on weekends, even for a small fee.'],
  7: [1, 'complaint', 'I booked a suite with breakfast included, but it was not on my bill at first. It was sorted after I complained, though it spoiled the morning.'],
  9: [5, 'praise', 'Wonderful stay, thank you to the whole team. The pool at sunset was the highlight.'],
};

const SUBSCRIBERS = ['priya.dutta@gmail.com', 'tanvir.rahman88@gmail.com', 'nadia.islam@yahoo.com', 'mark.davies@outlook.com', 'sumaiya.akter@gmail.com', 'rashidul.hasan@gmail.com', 'jennifer.lee@gmail.com', 'farhan.sadik@hotmail.com', 'shirin.sultana@gmail.com', 'oliver.grant@outlook.com', 'mou.chowdhury@gmail.com', 'arman.hossain@yahoo.com', 'kelly.morgan@gmail.com', 'tasfia.noor@gmail.com', 'zubair.ahmed@gmail.com', 'anita.roy@yahoo.com', 'samir.patel@outlook.com', 'lamia.karim@gmail.com', 'nasir.uddin@gmail.com', 'helen.brooks@hotmail.com', 'rafi.mahmud@gmail.com', 'joya.sarker@gmail.com', 'adnan.chowdhury@gmail.com', 'emma.wilson@outlook.com'];

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set (backend/.env)');
  // database name = the one written in the connection string (same rule as src/common/config.ts), default "innvibe"
  const named = process.env.MONGODB_URI.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/);
  await mongoose.connect(process.env.MONGODB_URI, { dbName: named ? decodeURIComponent(named[1]) : 'innvibe', serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const rooms = new Map((await db.collection('rooms').find().toArray()).map((r) => [r.roomNumber, r]));
  const bookings = db.collection('bookings'), nights = db.collection('roomnights'), reviews = db.collection('reviews'), subs = db.collection('subscribers');
  const stats = { bookings: 0, skipped: 0, reviews: 0, subscribers: 0 };

  for (const [index, b] of BOOKINGS.entries()) {
    const code = codeFor(index);
    const room = rooms.get(b.room);
    if (!room) { console.log(`skip ${code}: room ${b.room} does not exist`); stats.skipped++; continue; }
    if (await bookings.findOne({ code })) { stats.skipped++; continue; }

    const checkIn = iso(b.inOff), checkOut = iso(b.outOff), nightCount = b.outOff - b.inOff;
    const cancelled = Boolean(b.cancel);
    if (!cancelled) {
      const clash = await bookings.findOne({ roomNumber: b.room, status: { $ne: 'cancelled' }, checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } });
      if (clash) { console.log(`skip ${code} (${b.name}): room ${b.room} is already booked on those dates by ${clash.code}`); stats.skipped++; continue; }
    }

    const amounts = price(nightCount, room.pricePerNight);
    const guests = Math.min(b.guests, room.capacity);
    const doc = {
      code, guestName: b.name, guests, roomNumber: b.room, checkIn, checkOut, ...amounts, source: b.source, status: cancelled ? 'cancelled' : 'confirmed',
      ...(b.email ? { guestEmail: b.email } : {}), guestPhone: b.phone, ...(b.requests ? { specialRequests: b.requests } : {}),
      ...(b.pay ? { paymentMethod: b.pay, paymentReference: `PAY-${code.slice(3)}${(index * 7919 % 100).toString().padStart(2, '0')}`, paymentLast4: b.pay === 'card' ? String(1000 + (index * 977) % 9000) : b.phone.slice(-4) } : {}),
      ...(cancelled ? { cancelledAt: at(-b.cancel.daysAgo, 11), cancelledBy: b.cancel.by, cancelReason: b.cancel.reason } : {}),
    };

    if (!cancelled) {
      const docs = Array.from({ length: nightCount }, (_, i) => ({ roomNumber: b.room, date: iso(b.inOff + i), bookingKey: `sample-${code}` }));
      try { await nights.insertMany(docs, { ordered: true }); } catch (error) { await nights.deleteMany({ bookingKey: `sample-${code}` }); console.log(`skip ${code}: nights already taken`); stats.skipped++; continue; }
    }
    await bookings.insertOne(doc);
    stats.bookings++;

    const review = REVIEWS[index];
    if (review && !(await reviews.findOne({ bookingCode: code }))) {
      await reviews.insertOne({ bookingCode: code, guestName: b.name, roomNumber: b.room, rating: review[0], category: review[1], message: review[2], createdAt: at(b.outOff + 1, 9 + (index % 8)) });
      stats.reviews++;
    }
  }

  // Newsletter sign-ups spread over the last month, oldest first (so the newest ends up on top of the staff list).
  for (const [index, email] of SUBSCRIBERS.entries()) {
    const result = await subs.updateOne({ email }, { $setOnInsert: { email, subscribedAt: at(-(SUBSCRIBERS.length - index) * 1.2, 8 + (index % 12)) } }, { upsert: true });
    if (result.upsertedCount) stats.subscribers++;
  }

  // Consistency report: held nights must equal the nights of all non-cancelled bookings.
  const live = await bookings.find({ status: { $ne: 'cancelled' } }).toArray();
  const expected = live.reduce((sum, b) => sum + Math.round((new Date(b.checkOut) - new Date(b.checkIn)) / DAY), 0);
  console.log(`Added: ${stats.bookings} bookings, ${stats.reviews} reviews, ${stats.subscribers} subscribers (skipped ${stats.skipped}).`);
  console.log(`Now in the database: ${await bookings.countDocuments()} bookings (${await bookings.countDocuments({ status: 'cancelled' })} cancelled), ${await reviews.countDocuments()} reviews, ${await subs.countDocuments()} subscribers.`);
  console.log(`Room nights held: ${await nights.countDocuments()} (expected ${expected}) ${(await nights.countDocuments()) === expected ? 'OK' : 'MISMATCH'}`);
  await mongoose.disconnect();
})().catch((error) => { console.error('Seed failed:', String(error.message).replace(/mongodb(\+srv)?:\/\/[^ ]+/g, '[uri]')); process.exit(1); });
