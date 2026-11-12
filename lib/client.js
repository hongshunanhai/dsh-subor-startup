/**
 * dsh-subor-startup — client half
 *
 * Loaded as a dsh.client ModuleLoader bundle (same shape as
 * dsh-startup-screen's client.js). The splash itself is injected into
 * index.html by the Host half via tapIndex; this module is the desktop
 * fallback: if the iframe isn't present (Host served via file:// / IPC),
 * it fetches the splash page from the same origin and mounts it.
 */
window.__ModuleLoader__.load({
  id: 'dsh-subor-startup',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var inject = []

    function alreadyInjected() {
      return !!document.getElementById('dsh-subor-frame')
    }

    function mount() {
      if (alreadyInjected()) return
      var f = document.createElement('iframe')
      f.id = 'dsh-subor-frame'
      f.src = '/dsh-subor/splash.html?embed=1'
      f.title = '小霸王启动画面'
      f.allow = 'autoplay'
      f.setAttribute('style', 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483000;background:#000;transition:opacity .5s ease')
      document.body.appendChild(f)
      document.documentElement.classList.add('dsh-subor-lock')
      window.addEventListener('message', function (e) {
        if (e && e.data === 'dsh-subor:done') {
          f.style.opacity = '0'
          setTimeout(function () {
            if (f.parentNode) f.parentNode.removeChild(f)
            document.documentElement.classList.remove('dsh-subor-lock')
          }, 520)
        }
      })
      setTimeout(function () {
        if (f.parentNode) {
          f.style.opacity = '0'
          setTimeout(function () {
            if (f.parentNode) f.parentNode.removeChild(f)
            document.documentElement.classList.remove('dsh-subor-lock')
          }, 520)
        }
      }, 30000)
    }

    function apply(ctx) {
      try {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', mount, { once: true })
        } else {
          mount()
        }
      } catch (err) { /* never break the host */ }
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
