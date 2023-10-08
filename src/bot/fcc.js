import { PuppeteerCrawler } from 'crawlee'

const allLinks = new Set()

const crawler = new PuppeteerCrawler({
  async requestHandler({ request, page, log }) {
    log.info(`Crawling ${request.url}`)

    // Define the selector based on the URL of the current page
    const selector = '#refazerLista div div div a[href]'

    try {
      // Get all links from the page that match the selector
      const links = await page.$$eval(selector, (links) => links.map((link) => link.href))

      log.info(`Links: ${links}`)

      // Add each link to the allLinks set
      for (const link of links) {
        allLinks.add(link)
      }
    } catch (error) {
      log.error(`Error occurred while crawling ${request.url}: ${error.message}`)
    }
  }
})

await crawler.run([
  'https://www.concursosfcc.com.br/concursoAndamento.html',
  'https://www.concursosfcc.com.br/concursoOutraSituacao.html'
])

console.log('All unique links:', Array.from(allLinks))
