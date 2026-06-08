import { createApp } from './app.js'
import { createD1Store } from './store-d1.js'

const app = createApp((c) => createD1Store(c!.env!.DB))

export default app
