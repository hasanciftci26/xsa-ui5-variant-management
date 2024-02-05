const HanaClient = require(global.appRoot + "/lib/util/hana_client"),
    CommonMethods = require(global.appRoot + "/lib/util/common_methods"),
    crypto = require("crypto");

class SmartTable {
    #projectId;
    #fileName;
    #username;
    #persistencyKey;
    #layer;

    constructor(variant, username) {
        this.#projectId = variant.PROJECT_ID || variant.projectId;
        this.#fileName = variant.FILE_NAME || variant.fileName;
        this.#username = username;
        this.#persistencyKey = variant.PERSISTENCY_KEY || variant.selector.persistencyKey;
        this.#layer = variant.LAYER || variant.layer;
    }

    async getContent() {
        let [tableContent, tableSortItems, tableFilters] = await Promise.all([
            this.#getTableContentFromDB(),
            this.#getTableSortItemsFromDB(),
            this.#getTableFiltersFromDB()
        ]),
            content = {};

        this.#generateTableContent(content, tableContent);
        this.#generateTableSortItems(content, tableSortItems);
        this.#generateTableFilters(content, tableFilters);
        return content;
    }

    async #getTableContentFromDB() {
        let dbStatement = CommonMethods.generateSelectStatement("TABLE_CONTENT", this.#projectId, this.#fileName, this.#persistencyKey, this.#username, this.#layer);
        return HanaClient.statementExecPromisified(dbStatement);
    }

    async #getTableSortItemsFromDB() {
        let dbStatement = CommonMethods.generateSelectStatement("TABLE_SORT_ITEMS", this.#projectId, this.#fileName, this.#persistencyKey, this.#username, this.#layer);
        return HanaClient.statementExecPromisified(dbStatement);
    }

    async #getTableFiltersFromDB() {
        let dbStatement = CommonMethods.generateSelectStatement("TABLE_FILTERS", this.#projectId, this.#fileName, this.#persistencyKey, this.#username, this.#layer);
        return HanaClient.statementExecPromisified(dbStatement);
    }

    #generateTableContent(content, tableContent) {
        if (!tableContent.length) {
            return;
        }

        Object.assign(content, { columns: {} });

        content.columns.columnsItems = tableContent.map((contentItem) => {
            let columnItem = {
                columnKey: contentItem.COLUMN_KEY
            };

            Object.assign(columnItem, contentItem.COLUMN_INDEX !== null ? { index: contentItem.COLUMN_INDEX } : {});
            Object.assign(columnItem, contentItem.COLUMN_WIDTH !== null ? { width: contentItem.COLUMN_WIDTH } : {});
            Object.assign(columnItem, contentItem.COLUMN_VISIBLE !== null ? { visible: contentItem.COLUMN_VISIBLE } : {});
            return columnItem;
        });
    }

    #generateTableSortItems(content, tableSortItems) {
        if (!tableSortItems.length) {
            return;
        }

        Object.assign(content, { sort: {} });

        content.sort.sortItems = tableSortItems.map((sortItem) => {
            return {
                columnKey: sortItem.COLUMN_KEY,
                operation: sortItem.OPERATION
            };
        });
    }

    #generateTableFilters(content, tableFilters) {
        if (!tableFilters.length) {
            return;
        }

        Object.assign(content, { filter: {} });

        content.filter.filterItems = tableFilters.map((filter) => {
            let filterItem = {
                columnKey: filter.COLUMN_KEY,
                operation: filter.OPERATION,
                value1: filter.FIRST_VALUE,
                exclude: filter.EXCLUDE
            };

            Object.assign(filterItem, filter.SECOND_VALUE !== null ? { value2: filter.SECOND_VALUE } : {});
            return filterItem;
        });
    }

    async createTableVariant(variant) {
        await Promise.all([
            this.#createTableContent(variant),
            this.#createTableSortItems(variant),
            this.#createTableFilters(variant)
        ]);
    }

    async #createTableContent(variant) {
        if (!variant.content.columns) {
            return;
        }

        for (const content of variant.content.columns.columnsItems) {
            let tableContentInsertStatement = CommonMethods.generateInsertStatement("TABLE_CONTENT");

            await HanaClient.statementExecPromisified(tableContentInsertStatement, [
                variant.projectId,
                variant.fileName,
                variant.support.user || this.#username,
                variant.selector.persistencyKey,
                content.columnKey,
                content?.index,
                content?.width,
                content?.visible
            ]);
        }
    }

    async #createTableSortItems(variant) {
        if (!variant.content.sort) {
            return;
        }

        for (const content of variant.content.sort.sortItems) {
            let tableSortInsertStatement = CommonMethods.generateInsertStatement("TABLE_SORT_ITEMS");

            await HanaClient.statementExecPromisified(tableSortInsertStatement, [
                variant.projectId,
                variant.fileName,
                variant.support.user || this.#username,
                variant.selector.persistencyKey,
                content.columnKey,
                content.operation
            ]);
        }
    }

    async #createTableFilters(variant) {
        if (!variant.content.filter) {
            return;
        }

        for (const content of variant.content.filter.filterItems) {
            let tableFilterInsertStatement = CommonMethods.generateInsertStatement("TABLE_FILTERS");

            await HanaClient.statementExecPromisified(tableFilterInsertStatement, [
                variant.projectId,
                variant.fileName,
                variant.support.user || this.#username,
                variant.selector.persistencyKey,
                content.columnKey,
                crypto.randomUUID(),
                content.operation,
                content.value1,
                content?.value2,
                content.exclude
            ]);
        }
    }

    async deleteTableVariant(operation) {
        await Promise.all([
            this.#deleteTableContent(operation),
            this.#deleteTableSortItems(operation),
            this.#deleteTableFilters(operation)
        ]);
    }

    async #deleteTableContent(operation) {
        let deleteContentStatement = CommonMethods.generateDeleteStatement("TABLE_CONTENT", this.#projectId, this.#fileName, this.#persistencyKey, this.#username, operation, this.#layer);
        await HanaClient.statementExecPromisified(deleteContentStatement);
    }

    async #deleteTableSortItems(operation) {
        let deleteSortItemsStatement = CommonMethods.generateDeleteStatement("TABLE_SORT_ITEMS", this.#projectId, this.#fileName, this.#persistencyKey, this.#username, operation, this.#layer);
        await HanaClient.statementExecPromisified(deleteSortItemsStatement);
    }

    async #deleteTableFilters(operation) {
        let deleteFiltersStatement = CommonMethods.generateDeleteStatement("TABLE_FILTERS", this.#projectId, this.#fileName, this.#persistencyKey, this.#username, operation, this.#layer);
        await HanaClient.statementExecPromisified(deleteFiltersStatement);
    }
};

module.exports = SmartTable;