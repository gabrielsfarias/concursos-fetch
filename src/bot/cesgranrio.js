import { Dataset, JSDOMCrawler, log } from 'crawlee'

const arrObjetos = []
const url = 'https://www.cesgranrio.org.br/concursos/principal.aspx'
const crawlerCesgranrio = new JSDOMCrawler({
  minConcurrency: 10,
  maxConcurrency: 50,
  maxRequestRetries: 1,
  requestHandlerTimeoutSecs: 30,
  maxRequestsPerCrawl: 10,

  async requestHandler({ request, window }) {
    log.info(`Processando ${request.url}...`)

    const caixaCinzaCenter = window.document.querySelectorAll('div.caixa_cinza_center')
    if (caixaCinzaCenter[1].children[0].children[0].textContent !== 'Nenhum concurso em andamento !') {
      for (let i = 0; i < caixaCinzaCenter[1].children.length; i++) {
        const objeto = {
          nome: caixaCinzaCenter[1].children[i].children[1].children[0].textContent,
          url: caixaCinzaCenter[1].children[i].children[1].children[0].getAttribute('href')
        }
        arrObjetos.push(objeto)
      }
    }
    const cesgranrio = await Dataset.open('cesgranrio')
    await cesgranrio.pushData(arrObjetos)
    await cesgranrio.exportToCSV('cesgranrio')
    return arrObjetos
  },

  failedRequestHandler({ request }) {
    log.info(`Request ${request.url} failed twice.`)
  }
})

await crawlerCesgranrio.run([url])

export { crawlerCesgranrio }
