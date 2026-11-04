/**
 * 下班倒计时 — Client 半边。
 *
 * 在输入框下方的 ambient dock（conversation.composer.dock）注册一枚
 * 倒计时胶囊：
 *   - 工作日按「上班时间 → 下班时间」倒计时，并用细进度条表示今天走了多远；
 *   - 到点后切换成加班计时，小圆点会呼吸一下；
 *   - 周末只显示一句「周末快乐」，不假装下班；
 *   - 点胶囊弹出设置对话框（注册在 shell.overlay，浮在所有列之上，
 *     不会被输入框卡片的层叠上下文盖住），改完即时生效，只存本机浏览器。
 *
 * 所有颜色走宿主主题 token（--dsw-alias-*），亮/暗色自动跟随；
 * 文案走 Client locale 服务，未注册时退回浏览器语言的内置字典。
 * 两个槽位共享一个极小的模块级 store，组件本身不订阅会话、不写 DOM。
 */
window.__ModuleLoader__.load({
  id: 'dsh-offwork-countdown',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'offwork-countdown'
    const STORAGE_KEY = 'dsh.offwork-countdown.settings.v1'
    const DEFAULT_SETTINGS = { start: '09:00', end: '18:00' }

    const DICT = {
      zh: {
        work: '距离下班',
        off: '已下班',
        done: '下班啦',
        rest: '周末快乐',
        tip: '点击设置上班与下班时间',
        title: '下班时间',
        start: '上班',
        end: '下班',
        save: '保存',
        cancel: '取消',
        reset: '恢复默认',
        close: '关闭',
        hint: '设置只保存在本机浏览器',
      },
      en: {
        work: 'Off in',
        off: 'Overtime',
        done: 'Off work',
        rest: 'Weekend',
        tip: 'Click to set your work hours',
        title: 'Work hours',
        start: 'Start',
        end: 'End',
        save: 'Save',
        cancel: 'Cancel',
        reset: 'Reset',
        close: 'Close',
        hint: 'Saved in this browser only',
      },
    }

    const CSS = [
      '.owc{position:relative;display:inline-flex;align-items:center;justify-content:center;font-size:12px;line-height:1;color:var(--dsw-alias-label-secondary)}',
      '.owc-pill{display:inline-flex;align-items:center;gap:8px;padding:4px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;cursor:pointer;transition:background .15s ease,border-color .15s ease}',
      '.owc-pill:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}',
      '.owc-pill:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
      '.owc-dot{width:6px;height:6px;flex:none;border-radius:50%;background:var(--dsw-alias-brand-primary)}',
      '.owc[data-phase="rest"] .owc-dot{background:var(--dsw-alias-state-idle-primary)}',
      '.owc[data-phase="off"] .owc-dot{background:var(--dsw-alias-state-success-primary)}',
      '.owc[data-pulse="on"] .owc-dot{animation:owc-pulse 1.6s ease-in-out infinite}',
      '.owc-label{white-space:nowrap}',
      '.owc-time{color:var(--dsw-alias-label-primary);font-weight:600;letter-spacing:.02em;font-variant-numeric:tabular-nums}',
      '.owc-bar{position:relative;width:44px;height:3px;flex:none;border-radius:999px;background:var(--dsw-alias-border-l1);overflow:hidden}',
      '.owc-bar-fill{position:absolute;top:0;bottom:0;left:0;border-radius:999px;background:var(--dsw-alias-brand-primary);transition:width .5s ease}',
      '.owc[data-phase="off"] .owc-bar-fill{background:var(--dsw-alias-state-success-primary)}',
      '@keyframes owc-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}',
      '@media (prefers-reduced-motion: reduce){.owc[data-pulse="on"] .owc-dot{animation:none}.owc-bar-fill{transition:none}}',
      '.owc-scrim{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.35);pointer-events:auto}',
      '.owc-dialog{width:300px;max-width:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-overlay);box-shadow:0 24px 60px rgba(0,0,0,.32);color:var(--dsw-alias-label-primary);font-size:13px;text-align:left;pointer-events:auto}',
      '.owc-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.owc-dialog-title{font-size:13px;font-weight:600}',
      '.owc-close{width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:14px;line-height:1;cursor:pointer}',
      '.owc-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.owc-fields{display:flex;flex-direction:column;gap:10px}',
      '.owc-field{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.owc-field-label{white-space:nowrap}',
      '.owc-input{width:104px;box-sizing:border-box;padding:3px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-variant-numeric:tabular-nums}',
      '.owc-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}',
      '.owc-hint{font-size:11px;color:var(--dsw-alias-label-secondary);opacity:.75}',
      '.owc-actions{display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.owc-actions-right{display:flex;gap:8px}',
      '.owc-btn{padding:3px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}',
      '.owc-btn:hover{border-color:var(--dsw-alias-border-l2)}',
      '.owc-btn-primary{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}',
    ].join('')

    // 归属 id 必须等于本模块注册 id：宿主按同一个标记认领 / 摘除 style。
    const STYLE_OWNER = 'dsh-offwork-countdown'

    function insertOwnedStyle(css) {
      const el = document.createElement('style')
      el.setAttribute('data-plugin', STYLE_OWNER)
      el.textContent = css
      document.head.appendChild(el)
      return el
    }

    function pad2(value) {
      return value < 10 ? '0' + value : String(value)
    }

    function formatClock(totalSeconds) {
      const seconds = Math.max(0, Math.floor(totalSeconds))
      return (
        pad2(Math.floor(seconds / 3600)) +
        ':' +
        pad2(Math.floor((seconds % 3600) / 60)) +
        ':' +
        pad2(seconds % 60)
      )
    }

    function parseHM(value, fallback) {
      const matched = /^(\d{1,2}):(\d{2})$/.exec(String(value == null ? '' : value))
      if (!matched) return fallback
      const hours = Number(matched[1])
      const minutes = Number(matched[2])
      if (!(hours >= 0 && hours <= 23) || !(minutes >= 0 && minutes <= 59)) return fallback
      return { hours: hours, minutes: minutes }
    }

    function formatHM(parsed) {
      return pad2(parsed.hours) + ':' + pad2(parsed.minutes)
    }

    function normalizeSettings(raw) {
      const source = raw && typeof raw === 'object' ? raw : {}
      return {
        start: formatHM(parseHM(source.start, parseHM(DEFAULT_SETTINGS.start, { hours: 9, minutes: 0 }))),
        end: formatHM(parseHM(source.end, parseHM(DEFAULT_SETTINGS.end, { hours: 18, minutes: 0 }))),
      }
    }

    function loadSettings() {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        if (!stored) return DEFAULT_SETTINGS
        return normalizeSettings(JSON.parse(stored))
      } catch (error) {
        return DEFAULT_SETTINGS
      }
    }

    function persistSettings(settings) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      } catch (error) {
        // 隐私模式或存储被禁用：本次会话照样生效，只是不落盘。
      }
    }

    /**
     * 一秒一次的世界观：工作日数到下班、到点转加班、周末只报周末。
     * 返回值里的 seconds 在 work 阶段是「还剩多少」，off 阶段是「已经加了多久」。
     */
    function computeView(timestamp, settings) {
      const now = new Date(timestamp)
      const day = now.getDay()
      const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
      const start = parseHM(settings.start, { hours: 9, minutes: 0 })
      const end = parseHM(settings.end, { hours: 18, minutes: 0 })
      const startSeconds = start.hours * 3600 + start.minutes * 60
      const endSeconds = end.hours * 3600 + end.minutes * 60

      if (day === 0 || day === 6) {
        return { phase: 'rest', seconds: 0, progress: 0 }
      }
      if (nowSeconds < endSeconds) {
        const span = endSeconds - startSeconds
        const progress = span > 0 ? Math.min(1, Math.max(0, (nowSeconds - startSeconds) / span)) : 0
        return { phase: 'work', seconds: endSeconds - nowSeconds, progress: progress }
      }
      return { phase: 'off', seconds: nowSeconds - endSeconds, progress: 1 }
    }

    function fallbackTranslate(key) {
      const zh =
        typeof navigator !== 'undefined' &&
        typeof navigator.language === 'string' &&
        /^zh/i.test(navigator.language)
      const table = zh ? DICT.zh : DICT.en
      return table[key] || DICT.en[key] || key
    }

    // ---------------------------------------------------------------------
    // 极小 store：胶囊和设置对话框注册在两个槽位里，靠它共享「开没开 + 当前时间」。
    // ---------------------------------------------------------------------

    const store = {
      open: false,
      settings: loadSettings(),
    }
    let snapshot = { open: store.open, settings: store.settings }
    const listeners = new Set()

    function getSnapshot() {
      return snapshot
    }

    function emit() {
      snapshot = { open: store.open, settings: store.settings }
      listeners.forEach(function (listener) {
        try {
          listener()
        } catch (error) {
          console.error('[offwork-countdown] store listener failed', error)
        }
      })
    }

    function subscribe(listener) {
      listeners.add(listener)
      return function () {
        listeners.delete(listener)
      }
    }

    function setEditorOpen(open) {
      if (store.open === open) return
      store.open = open
      emit()
    }

    function commitSettings(next) {
      store.settings = next
      store.open = false
      persistSettings(next)
      emit()
    }

    function useStore() {
      const [value, setValue] = React.useState(getSnapshot)
      React.useEffect(function () {
        return subscribe(function () {
          setValue(getSnapshot())
        })
      }, [])
      return value
    }

    // ---------------------------------------------------------------------
    // 胶囊：输入框下方那枚安静的小玩意儿。
    // ---------------------------------------------------------------------

    function Countdown(props) {
      const t = props.t
      const [now, setNow] = React.useState(function () {
        return Date.now()
      })
      const current = useStore()

      React.useEffect(function () {
        const timer = window.setInterval(function () {
          setNow(Date.now())
        }, 1000)
        const onVisible = function () {
          if (!document.hidden) setNow(Date.now())
        }
        document.addEventListener('visibilitychange', onVisible)
        return function () {
          window.clearInterval(timer)
          document.removeEventListener('visibilitychange', onVisible)
        }
      }, [])

      const view = computeView(now, current.settings)
      const label =
        view.phase === 'work'
          ? t('work')
          : view.phase === 'rest'
            ? t('rest')
            : view.seconds < 60
              ? t('done')
              : t('off')
      const showClock = view.phase !== 'rest'
      const progress = view.phase === 'work' ? view.progress : view.phase === 'off' ? 1 : 0

      return h(
        'div',
        {
          className: 'owc',
          'data-phase': view.phase,
          'data-pulse': view.phase === 'off' && view.seconds < 600 ? 'on' : 'off',
        },
        h(
          'button',
          {
            type: 'button',
            className: 'owc-pill',
            title: t('tip'),
            'aria-haspopup': 'dialog',
            'aria-expanded': current.open ? 'true' : 'false',
            onClick: function () {
              setEditorOpen(!store.open)
            },
          },
          h('span', { className: 'owc-dot', 'aria-hidden': 'true' }),
          h('span', { className: 'owc-label' }, label),
          showClock ? h('span', { className: 'owc-time' }, formatClock(view.seconds)) : null,
          showClock
            ? h(
                'span',
                { className: 'owc-bar', 'aria-hidden': 'true' },
                h('span', {
                  className: 'owc-bar-fill',
                  style: { width: Math.round(progress * 100) + '%' },
                }),
              )
            : null,
        ),
      )
    }

    // ---------------------------------------------------------------------
    // 设置对话框：挂在 shell.overlay，浮在所有列之上，不会被输入框盖住。
    // ---------------------------------------------------------------------

    function SettingsDialog(props) {
      const t = props.t
      const current = useStore()
      const [draft, setDraft] = React.useState(current.settings)

      React.useEffect(
        function () {
          if (current.open) setDraft(current.settings)
        },
        [current.open, current.settings],
      )

      React.useEffect(
        function () {
          if (!current.open) return undefined
          const onKey = function (event) {
            if (event.key === 'Escape') {
              event.stopPropagation()
              setEditorOpen(false)
            }
          }
          document.addEventListener('keydown', onKey, true)
          return function () {
            document.removeEventListener('keydown', onKey, true)
          }
        },
        [current.open],
      )

      if (!current.open) return null

      return h(
        'div',
        {
          className: 'owc-scrim',
          onMouseDown: function (event) {
            if (event.target === event.currentTarget) setEditorOpen(false)
          },
        },
        h(
          'div',
          {
            className: 'owc-dialog',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('title'),
          },
          h(
            'div',
            { className: 'owc-dialog-head' },
            h('span', { className: 'owc-dialog-title' }, t('title')),
            h(
              'button',
              {
                type: 'button',
                className: 'owc-close',
                'aria-label': t('close'),
                title: t('close'),
                onClick: function () {
                  setEditorOpen(false)
                },
              },
              '\u00d7',
            ),
          ),
          h(
            'div',
            { className: 'owc-fields' },
            h(
              'label',
              { className: 'owc-field' },
              h('span', { className: 'owc-field-label' }, t('start')),
              h('input', {
                type: 'time',
                className: 'owc-input',
                step: 60,
                value: draft.start,
                autoFocus: true,
                onChange: function (event) {
                  const value = event.target.value
                  setDraft(function (previous) {
                    return { start: value, end: previous.end }
                  })
                },
              }),
            ),
            h(
              'label',
              { className: 'owc-field' },
              h('span', { className: 'owc-field-label' }, t('end')),
              h('input', {
                type: 'time',
                className: 'owc-input',
                step: 60,
                value: draft.end,
                onChange: function (event) {
                  const value = event.target.value
                  setDraft(function (previous) {
                    return { start: previous.start, end: value }
                  })
                },
              }),
            ),
          ),
          h('div', { className: 'owc-hint' }, t('hint')),
          h(
            'div',
            { className: 'owc-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'owc-btn',
                onClick: function () {
                  commitSettings(normalizeSettings(DEFAULT_SETTINGS))
                },
              },
              t('reset'),
            ),
            h(
              'div',
              { className: 'owc-actions-right' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'owc-btn',
                  onClick: function () {
                    setEditorOpen(false)
                  },
                },
                t('cancel'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'owc-btn owc-btn-primary',
                  onClick: function () {
                    commitSettings(normalizeSettings(draft))
                  },
                },
                t('save'),
              ),
            ),
          ),
        ),
      )
    }

    function apply(ctx) {
      const slots = ctx.get('slots')
      if (slots === undefined) return

      const styleEl = insertOwnedStyle(CSS)
      ctx.effect(function () {
        return function () {
          styleEl.remove()
        }
      }, 'offwork-countdown: styles')

      let t = fallbackTranslate
      const locale = ctx.get('locale')
      if (locale !== undefined && typeof locale.register === 'function' && typeof locale.bind === 'function') {
        ctx.effect(function () {
          let dispose = function () {}
          try {
            const disposeZh = locale.register(NS, 'zh', DICT.zh)
            const disposeEn = locale.register(NS, 'en', DICT.en)
            dispose = function () {
              disposeZh()
              disposeEn()
            }
          } catch (error) {
            console.error('[offwork-countdown] locale registration failed', error)
          }
          return dispose
        }, 'offwork-countdown: locale')

        // 字典没注册成功时 bind 会把 key 原样吐回来，那样界面上就会出现
        // "work 08:23:45"。逐 key 兜底：拿不到真正的译文就用内置字典。
        const translate = locale.bind(NS)
        t = function (key) {
          let value
          try {
            value = translate(key)
          } catch (error) {
            value = undefined
          }
          return typeof value === 'string' && value !== key ? value : fallbackTranslate(key)
        }
      }

      slots.inject('conversation.composer.dock', function () {
        return slots.register(
          { name: 'conversation.composer.dock', id: 'offwork-countdown', order: 2 },
          function () {
            return h(Countdown, { t: t })
          },
        )
      })

      slots.inject('shell.overlay', function () {
        return slots.register(
          { name: 'shell.overlay', id: 'offwork-countdown.settings', order: 50 },
          function () {
            return h(SettingsDialog, { t: t })
          },
        )
      })
    }

    return {
      inject: ['slots'],
      apply: apply,
    }
  },
})
