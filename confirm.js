function block (e) {
  if (typeof e === 'undefined') e = window.event
  if (e) e.returnValue = 'unsynced'
  return 'unsynced'
}

/**
 * Show confirm popup, when user close tab with non-synchronized actions.
 *
 * @param {CrossTabClient} client Observed Client instance.
 *
 * @return {Function} Unbind confirm listener.
 *
 * @example
 * import confirm from '@logux/client/confirm'
 * confirm(client)
 */
function confirm (client) {
  var disconnected = client.state === 'disconnected'
  var wait = false

  function update () {
    if (client.state === 'disconnected') {
      disconnected = true
    } else if (client.state === 'synchronized') {
      disconnected = false
      wait = false
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
      if (client.role !== 'follower' && wait && disconnected) {
        window.addEventListener('beforeunload', block)
      } else {
        window.removeEventListener('beforeunload', block)
      }
    }
  }

  var unbind = []
  unbind.push(client.on('role', update))
  unbind.push(client.on('state', update))
  update()

  unbind.push(client.on('add', function (action, meta) {
    if (action.type === 'logux/subscribe') {
      return
    } else if (action.type === 'logux/unsubscribe') {
      return
    }
    if (disconnected && meta.sync && meta.added) {
      wait = true
      update()
    }
  }))

  return function () {
    for (var i = 0; i < unbind.length; i++) {
      unbind[i]()
    }
  }
}

module.exports = confirm
