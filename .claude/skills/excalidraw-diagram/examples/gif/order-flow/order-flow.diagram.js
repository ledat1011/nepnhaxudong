// GIF example: a web shop order flow with a fan-out to two workers (still diagram for order-flow.anim.js).
module.exports = kit => {
  const d = kit.createDiagram();
  d.title({ x: 0, y: -150, text: 'Order flow', subtitle: 'A customer orders · the order service queues it · two workers process it' });
  const ROW = 120;
  const customer = d.person({ x: 0, y: ROW - 58, label: 'customer' });
  const shop = d.browserWindow({ x: 150, y: ROW - 65, w: 220, h: 130, label: 'web shop', caption: 'checkout', color: 'external' });
  const orders = d.serverStack({ x: 480, y: ROW - 60, w: 240, label: 'order-service', note: 'validates the order' });
  const queue = d.queue({ x: 830, y: ROW - 45, w: 220, label: 'orders topic' });
  const pay = d.serverStack({ x: 1160, y: ROW - 230, w: 220, label: 'payment-worker' });
  const ship = d.serverStack({ x: 1160, y: ROW + 110, w: 220, label: 'shipping-worker' });
  const db = d.database({ x: 525, y: 560, h: 150, label: 'orders-db' });
  d.link(customer, 'r', shop, 'l', { bend: 0 });
  d.link(shop, 'r', orders, 'l', { bend: 0, label: '① order', labelAt: [425, ROW - 30] });
  d.link(orders, 'r', queue, 'l', { bend: 0, label: '② publish', labelAt: [775, ROW - 30] });
  d.link(queue, 'r', pay, 'l', { label: '③ charge' });
  d.link(queue, 'r', ship, 'l', { label: '④ ship' });
  d.link(orders, 'b', db, 't', { bend: 0, kind: 'data' });
  d.legend({ x: 1450, y: 300 });
  d.note({ x: 1450, y: 560, w: 300, text: 'dashed = data write', size: 18 });
  return [{ slug: 'order-flow', diagram: d }];
};
