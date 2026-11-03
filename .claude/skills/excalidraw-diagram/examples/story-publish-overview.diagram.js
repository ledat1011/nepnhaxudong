// Overview: the admin publishes a story, the backend saves it, the website rebuilds its page.
// Layout: row (admin -> backend -> website) with a fan-out below (database and media storage).
module.exports = kit => {
  const d = kit.createDiagram();
  d.title({ x: 0, y: -150, text: 'Publish a story',
    subtitle: 'The admin saves a story, the backend stores it, then the website rebuilds the story page.' });

  const admin = d.browserWindow({ x: 0, y: 0, w: 220, h: 130, label: 'admin app', caption: 'phone', color: 'external' });
  const api = d.serverStack({ x: 420, y: 10, w: 240, label: 'backend', note: 'Spring Boot API' });
  const site = d.serverStack({ x: 860, y: 10, w: 240, label: 'website', note: 'Next.js pages' });
  const visitor = d.person({ x: 1320, y: 10, label: 'visitor' });
  const db = d.database({ x: 465, y: 420, h: 150, label: 'postgres', note: 'stories' });
  const media = d.database({ x: 760, y: 420, h: 150, label: 'media', badge: 'file', note: 'photos' });

  d.link(admin, 'r', api, 'l', { bend: 0, label: '① save', labelAt: [320, -30] });
  d.link(api, 'b', db, 't', { bend: 0, kind: 'data', label: '② write', labelAt: [650, 340] });
  d.link(api, 'b', media, 't', { kind: 'data' });
  d.link(api, 'r', site, 'l', { bend: 0, kind: 'new', label: '③ revalidate', labelAt: [760, -30] });
  d.link(site, 'r', visitor, 'l', { bend: 0, label: '④ new page', labelAt: [1210, -30] });

  d.note({ x: 0, y: 700, w: 900, size: 18, text: ['dashed = data write', 'orange = the new call'].join('\n') });
  d.legend({ x: 0, y: 780 });
  return [{ slug: 'story-publish-overview', diagram: d }];
};
