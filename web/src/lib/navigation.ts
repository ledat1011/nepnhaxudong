/** Leaves the site for `href`, as a followed link would. A module of its own, so tests can replace it. */
export function leaveTo(href: string): void {
  window.location.assign(href);
}
