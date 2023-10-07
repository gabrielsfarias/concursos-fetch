import { CheerioCrawler, RequestQueue } from 'crawlee'
import { gotScraping } from 'got-scraping'

const url = 'https://www.concursosfcc.com.br/'
const crawler = new CheerioCrawler({
  async requestHandler({ request, $, enqueueLinks, log }) {
    log.info(`Crawling ${request.url}`)

    // Get all links from the page
    const links = []
    $('a[href]').each((index, el) => {
      const link = $(el).attr('href')
      if (link.startsWith(url)) {
        links.push(link)
      }
    })

    const requestOptions = []
    for (const link of links) {
      try {
        const response = await gotScraping.head(link)
        const contentType = response.headers['content-type']
        if (
          contentType.startsWith('text/html') ||
          contentType.startsWith('text/xml') ||
          contentType.startsWith('application/xhtml+xml') ||
          contentType.startsWith('application/xml') ||
          contentType.startsWith('application/json')
        ) {
          requestOptions.push({ url: link })
        }
      } catch (error) {
        log.error(`Error checking content type of ${link}: ${error}`)
      }
    }

    const queue = await RequestQueue.open()
    await queue.addRequests(requestOptions)

    await enqueueLinks({
      baseUrl: url,
      requestQueue: queue,
      selector: 'a[href]',
      globs: [`${url}concursoAndamento.html/*`, `${url}concursoOutraSituacao.html/*`]
    })
    return requestOptions
  }
})

await crawler.run([url])
