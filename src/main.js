import { CheerioCrawler } from 'crawlee'
import { router } from '../src/bot/fcc/routes.js'
import { BASE_URL } from '../src/constants.js'

const startUrls = [`${BASE_URL.fcc}/concursoOutraSituacao.html`, `${BASE_URL.fcc}/concursoAndamento.html`]

export const crawlerFcc = new CheerioCrawler({
  requestHandler: router
})

await crawlerFcc.run(startUrls)
