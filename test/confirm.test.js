let { TestPair } = require('@logux/core')

let CrossTabClient = require('../cross-tab-client')
let confirm = require('../confirm')

async function createClient () {
  let pair = new TestPair()

  let client = new CrossTabClient({
    subprotocol: '1.0.0',
    server: pair.left,
    userId: false
  })

  client.node.catch(() => true)
  client.role = 'leader'

  await pair.left.connect()
  return client
}

let beforeunloader
beforeEach(() => {
  delete window.event
  beforeunloader = false

  jest.spyOn(window, 'addEventListener').mockImplementation((n, c) => {
    if (n === 'beforeunload') beforeunloader = c
  })
  jest.spyOn(window, 'removeEventListener').mockImplementation((n, c) => {
    if (n === 'beforeunload' && beforeunloader === c) {
      beforeunloader = false
    }
  })
})

it('confirms close', async () => {
  let client = await createClient()
  confirm(client)

  client.node.setState('disconnected')
  expect(beforeunloader).toBeFalsy()

  await Promise.all([
    client.log.add(
      { type: 'logux/subscribe' }, { sync: true, reasons: ['t'] }),
    client.log.add(
      { type: 'logux/unsubscribe' }, { sync: true, reasons: ['t'] })
  ])
  expect(beforeunloader).toBeFalsy()

  await client.log.add({ type: 'A' }, { sync: true, reasons: ['t'] })
  expect(beforeunloader()).toEqual('unsynced')

  client.node.setState('sending')
  let e = { }
  beforeunloader(e)
  expect(e.returnValue).toEqual('unsynced')

  window.event = { }
  beforeunloader()
  expect(window.event.returnValue).toEqual('unsynced')
})

it('does not confirm on synchronized state', async () => {
  let client = await createClient()
  confirm(client)
  client.node.setState('disconnected')
  await client.log.add({ type: 'A' }, { sync: true, reasons: ['t'] })

  client.node.setState('synchronized')
  expect(beforeunloader).toBeFalsy()

  client.node.setState('disconnected')
  expect(beforeunloader).toBeFalsy()
})

it('does not confirm on follower tab', async () => {
  let client = await createClient()
  confirm(client)

  client.node.setState('disconnected')
  expect(beforeunloader).toBeFalsy()

  await client.log.add({ type: 'A' }, { sync: true, reasons: ['t'] })
  client.role = 'follower'
  client.emitter.emit('role')
  expect(beforeunloader).toBeFalsy()
})

it('returns unbind function', async () => {
  let client = await createClient()
  let unbind = confirm(client)
  unbind()
  client.node.setState('disconnected')
  expect(beforeunloader).toBeFalsy()
  await client.log.add({ type: 'A' }, { sync: true, reasons: ['t'] })
  expect(beforeunloader).toBeFalsy()
})
