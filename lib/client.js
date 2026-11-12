/**
 * dsh-subor-startup — client half
 * The splash iframe is injected server-side via tapIndex. This module exists
 * so the `dsh.client` declaration resolves on desktop builds; it registers
 * nothing visible.
 */
window.__ModuleLoader__ && window.__ModuleLoader__.load({
  id: 'dsh-subor-startup',
  factory: () => ({ exports: {} })
})
