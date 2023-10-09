import { Dataset, createCheerioRouter } from 'crawlee'
import { BASE_URL, bancas } from '../../constants.js'

export const router = createCheerioRouter()

router.addDefaultHandler(async ({ enqueueLinks, log, $ }) => {
  log.info('enqueueing new URLs')
  await enqueueLinks({
    globs: [`${BASE_URL.fcc}/concursos/**`],
    label: bancas.FCC
  })
})
router.addHandler(bancas.FCC, async ({ request, $, log }) => {
  const concurso = $('title').text().substring(6)
  const arquivos = $('.linkArquivo > .campoLinkArquivo a[href]')
    .map((i, el) => {
      const link = $(el).attr('href')
      if (link.endsWith('.pdf')) {
        const urlSemIndexHtml = request.loadedUrl.replace('index.html', '')
        return { link: urlSemIndexHtml + link }
      }
      log.debug(link)
      return null
    })
    .get()
    .filter((item) => item !== null)
  Dataset.pushData({
    banca: bancas.FCC,
    concurso,
    url: request.loadedUrl,
    arquivos
  })
  log.info(`${concurso}`, { url: request.loadedUrl })
})
