import { CheerioCrawler } from 'crawlee'
import { BASE_URL } from '../../constants.js'
import { router } from './routes.js'

const startUrls = [`${BASE_URL.fcc}/concursoOutraSituacao.html`, `${BASE_URL.fcc}/concursoAndamento.html`]

export const crawlerFcc = new CheerioCrawler({
  requestHandler: router
})

await crawlerFcc.run(startUrls)
