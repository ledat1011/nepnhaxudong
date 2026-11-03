// Sequence: who calls whom when the admin publishes a story.
module.exports = kit => {
  const d = kit.createDiagram();
  d.title({ x: 0, y: -150, text: 'Publish a story: one request',
    subtitle: 'POST /api/admin/stories/{id}/publish. The website page is rebuilt after the commit.' });

  const admin = d.lifeline({ x: -50, y: 0, label: 'admin-app', color: 'external', w: 300, length: 700 });
  const api = d.lifeline({ x: 400, y: 0, label: 'backend', length: 700 });
  const site = d.lifeline({ x: 850, y: 0, label: 'website', color: 'other', length: 700 });

  d.message(admin, api, 170, { label: 'POST publish' });
  d.message(api, api, 260, { label: 'check the status' });
  d.message(api, api, 360, { label: 'save and commit', kind: 'data' });
  d.message(api, site, 460, { label: 'POST /api/revalidate' });
  d.message(site, api, 560, { label: 'GET public stories' });
  d.message(site, site, 640, { label: 'rebuild the page' });
  d.message(api, admin, 730, { label: '200 published', reply: true });

  d.note({ x: 0, y: 800, w: 900, size: 18, text: ['dashed = reply', 'revalidate runs after the commit'].join('\n') });
  d.legend({ x: 0, y: 900 });
  return [{ slug: 'story-publish-sequence', diagram: d }];
};
