// Order flow: customer → web shop → order-service (writes orders-db) → orders topic → fans out to two workers.
// Two orders, 1.2 s apart, so the workers' counters show "n / 2".
module.exports = a => {
  const { arrow, extend, extendStart, trip, count } = a;
  [0, 1].forEach(i => {
    const start = 0.4 + i * 1.2;
    const inShop = trip('letter', extend(extendStart(arrow('customer', 'web shop'), 20), 60), start,
      { to: 'web shop', speed: 300 });
    const inService = trip('letter', extend(arrow('web shop', 'order-service'), 50), inShop + 0.15, { to: 'order-service' });
    trip('dot', extend(arrow('order-service', 'orders-db'), 30), inService + 0.1, { to: 'orders-db' });
    const inTopic = trip('letter', extend(arrow('order-service', 'orders topic'), 50), inService + 0.15, { to: 'orders topic' });
    count('payment-worker', trip('letter', extend(arrow('orders topic', 'payment-worker'), 40), inTopic + 0.15,
      { to: 'payment-worker' }), { total: 2 });
    count('shipping-worker', trip('letter', extend(arrow('orders topic', 'shipping-worker'), 40), inTopic + 0.45,
      { to: 'shipping-worker' }), { total: 2 });
  });
};
