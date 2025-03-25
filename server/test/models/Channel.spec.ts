import Channel from '../../src/models/Channel'
import SystemGroupConfigs from '../../src/utils/SystemDefinedGroups'
import * as TestDatabase from '../utils/TestDatabase'

describe('Channel model', () => {
  jest.setTimeout(10000)
  beforeAll(TestDatabase.connect)

  it('will get all system defined groups', async () => {
    const channels = await Channel.find().exec()
    expect(channels.length).toBe(SystemGroupConfigs.length)

    // Insertion order is not guaranteed, so we need to sort the channels by name
    channels.sort((a, b) => a.name.localeCompare(b.name))
    SystemGroupConfigs.sort((a, b) => a.name.localeCompare(b.name))

    for (let i = 0; i < channels.length; i++) {
      expect(channels[i].name).toBe(SystemGroupConfigs[i].name)
      expect(channels[i].description).toBe(SystemGroupConfigs[i].description)
    }
  })

  describe('getPublicChannel', () => {
    it('will return the existing public channel', async () => {
      const channels = await Channel.find().exec()
      const publicChannel = await Channel.getPublicChannel()

      // prove that no new channels are created
      expect(await Channel.find().exec()).toStrictEqual(channels)

      const ids = channels.map((c) => c.id)
      expect(ids).toContain(publicChannel.id)
    })

    it('will create a new public channel if it does not exist', async () => {
      await Channel.deleteMany({ name: 'Public' }).exec()
      const channelsBefore = await Channel.find()
      const publicChannel = await Channel.getPublicChannel()
      const channelsAfter = await Channel.find()
      expect(channelsAfter.length).toBe(channelsBefore.length + 1)
      expect(publicChannel.name).toBe('Public')
    })
  })

  afterAll(TestDatabase.close)
})
