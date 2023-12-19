import { Container, Database, SqlQuerySpec } from "@azure/cosmos"

const CosmosClient = require('@azure/cosmos').CosmosClient
const debug = require('debug')('shopping:listsDao')

const partitionKey = undefined
class ListsDao {
    client: any
    databaseId: string
    collectionId: string
    database: Database
    container: Container

    constructor(cosmosClient: typeof CosmosClient, databaseId: string, containerId: string) {
        this.client = cosmosClient
        this.databaseId = databaseId
        this.collectionId = containerId

        this.database = null
        this.container = null
    }

    async init() {
        debug('Setting up the database...')
        const dbResponse = await this.client.databases.createIfNotExists({
            id: this.databaseId
        })
        this.database = dbResponse.database
        debug('Database setup complete!')
        debug('Setting up the container...')
        const coResponse = await this.database.containers.createIfNotExists({
            id: this.collectionId
        })
        this.container = coResponse.container
        debug('Container setup complete!')
    }

    async find(querySpec: string | SqlQuerySpec) {
        debug('Querying for items from the database')
        if (!this.container) {
            throw new Error('Collection is not initialised.')
        }
        const { resources } = await this.container.items.query(querySpec).fetchAll()
        return resources
    }

    async addItem(item) {
        debug('Adding an item to the database')
        item.date = Date.now()
        item.completed = false
        const { resource: doc } = await this.container.items.create(item)
        return doc
    }

    async updateItem(itemId: string) {
        debug('Updating an item in the database')
        const doc = await this.getItem(itemId)
        doc.completed = true

        const { resource: replaced } = await this.container
            .item(itemId, partitionKey)
            .replace(doc)
        return replaced
    }

    async getItem(itemId: string) {
        debug('Getting an item from the database')
        const { resource } = await this.container.item(itemId, partitionKey).read()
        return resource
    }
}

module.exports = ListsDao
