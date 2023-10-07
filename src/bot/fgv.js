import { Dataset, PuppeteerCrawler, RequestQueue, log } from 'crawlee'
import fs from 'fs'

const url = 'https://conhecimento.fgv.br/concursos'
const fgv = await Dataset.open('fgv')
const requestQueue = await RequestQueue.open()

// Carregar links já adicionados do arquivo
let addedLinks
try {
  addedLinks = new Set(fs.readFileSync('addedLinks.txt', 'utf-8').split('\n'))
} catch (e) {
  addedLinks = new Set()
}

const crawlerFgv = new PuppeteerCrawler({
  requestQueue,
  async requestHandler({ page }) {
    const links = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div.views-row a'))
      return divs.map((a) => ({ text: a.textContent.trim(), href: a.href })).filter((a) => a.text && a.href)
    })

    const filteredLinks = links.filter((link) => link.href.startsWith(url))

    for (const link of filteredLinks) {
      // Verifique se o link já foi adicionado
      if (!addedLinks.has(link.href)) {
        log.debug(`Adding link: ${link.href}`)
        await fgv.pushData({
          url: link.href,
          text: link.text
        })
        // Adicione o link ao registro
        addedLinks.add(link.href)
        fs.appendFileSync('addedLinks.txt', `${link.href}\n`)
      }
    }

    // Verifique se o link da próxima página existe
    const nextPageLinkExists = await page.evaluate(() => !!document.querySelector('li.pager__item.pager__item--next a'))

    // Se existir, espere por ele e adicione à fila de solicitações
    if (nextPageLinkExists) {
      await page.waitForSelector('li.pager__item.pager__item--next a')
      const nextPageLink = await page.evaluate(() => {
        const paginationLink = document.querySelector('li.pager__item.pager__item--next a')
        return paginationLink ? paginationLink.href : null
      })

      if (nextPageLink) {
        log.debug(`Adding next page link: ${nextPageLink}`)
        await requestQueue.addRequest({ url: nextPageLink })
      }
    }
    // Verifique se o Dataset 'fgv' não está vazio antes de exportá-lo para CSV
    const data = (await fgv.getData()).total
    log.debug(`Dataset 'fgv' contains ${data} items.`)
    if ((await fgv.getData()).total !== 0) {
      log.debug("Exporting Dataset 'fgv' to CSV...")
      try {
        await fgv.exportToCSV('fgv')
        log.debug('Export successful!')
      } catch (error) {
        log.error('Error exporting to CSV:', error)
      }
    }
  },

  async failedRequestHandler({ request }) {
    log.debug(`Request failed: ${request.url}`)
    await fgv.pushData({
      url: request.url,
      succeeded: false,
      errors: request.errorMessages
    })
  }
})

await crawlerFgv.run([url])

export { crawlerFgv }
