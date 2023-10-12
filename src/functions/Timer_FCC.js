import { CosmosClient } from '@azure/cosmos'
import { app } from '@azure/functions'
import { CheerioCrawler, createCheerioRouter } from 'crawlee'
import { BASE_URL, bancas } from '../../constants.js'
import { ConnectionFailedError } from '../../errors/connectionFailed.js'
import { RequestTimeoutError } from '../../errors/requestTimeout.js'
import { UpsertError } from '../../errors/upsert.js'

const connectionString = process.env.CosmosDBConnectionString
const cosmosClient = new CosmosClient({ connectionString, connectionPolicy: { requestTimeout: 90 } })

let database
let container

app.timer('FCC', {
  schedule: '0 */5 * * * *',
  handler: async (myTimer, context) => {
    context.log('Timer function processed request.')

    try {
      const dbResponse = await cosmosClient.databases.createIfNotExists({ id: 'concursos', throughput: 1000 })
      database = dbResponse.database
      const containerResponse = await database.containers.createIfNotExists({
        id: 'concursos',
        partitionKey: { paths: ['/concurso'] },
        uniqueKeyPolicy: { paths: ['/url'] }
      })
      container = containerResponse.container
    } catch (error) {
      throw new ConnectionFailedError()
    }

    const startUrls = [`${BASE_URL.fcc}/concursoOutraSituacao.html`, `${BASE_URL.fcc}/concursoAndamento.html`]

    const router = createCheerioRouter()
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
      log.info(`${concurso}`, { url: request.loadedUrl })

      // Check if an item with the same url already exists
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.url = @url',
        parameters: [
          {
            name: '@url',
            value: request.loadedUrl
          }
        ]
      }

      const { resources: existingItems } = await container.items.query(querySpec).fetchAll()

      if (existingItems.length === 0) {
        // If no existing item with the same url, upsert the new item
        try {
          await container.items.upsert({ banca: bancas.FCC, concurso, url: request.loadedUrl, arquivos })
        } catch (error) {
          if (error.name === 'TimeoutError') {
            throw new RequestTimeoutError()
          } else {
            throw new UpsertError()
          }
        }
      } else {
        log.info(`Item with url ${request.loadedUrl} already exists, skipping`)
      }
    })

    const crawlerFcc = new CheerioCrawler({
      requestHandler: router,
      requestHandlerTimeoutSecs: 100,
      retryOnBlocked: true,
      maxRequestsPerCrawl: 300
    })

    await crawlerFcc.run(startUrls)
  }
})
