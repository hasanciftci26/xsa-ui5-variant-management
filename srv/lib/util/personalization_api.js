const HanaClient = require(global.appRoot + "/lib/util/hana_client"),
    SmartTable = require(global.appRoot + "/lib/util/smart_table"),
    SmartFilterbar = require(global.appRoot + "/lib/util/smart_filterbar"),
    CommonMethods = require(global.appRoot + "/lib/util/common_methods");

class PersonalizationAPI {
    #username;
    #projectId;
    #layer;

    constructor(projectId, username, layer) {
        this.#projectId = projectId;
        this.#username = username;
        this.#layer = layer;
    }

    async getPersonalizationData() {
        let componentVariants = await this.#getComponentVariants(),
            changes = await this.#getChanges();

        return {
            changes: changes,
            compVariants: componentVariants,
            variantDependentControlChanges: [],
            variantChanges: [],
            variants: [],
            variantManagementChanges: []
        };
    }

    async #getComponentVariants() {
        let componentVariants = await this.#getCompVariantsFromDB(),
            compVariants = [];

        for (const variant of componentVariants) {
            let content = await this.#getContent(variant);

            let compVariantItem = {
                changeType: variant.CHANGE_TYPE,
                reference: variant.PROJECT_ID,
                namespace: `apps/${variant.PROJECT_ID}/changes/`,
                projectId: variant.PROJECT_ID,
                support: {
                    generator: variant.GENERATOR,
                    user: variant.USER_NAME,
                    sapui5Version: variant.SAPUI5_VERSION
                },
                originalLanguage: variant.ORIGINAL_LANGUAGE,
                layer: variant.LAYER,
                fileType: variant.FILE_TYPE,
                fileName: variant.FILE_NAME,
                content: content,
                texts: {
                    variantName: {
                        value: variant.VARIANT_NAME,
                        type: variant.VARIANT_TYPE
                    }
                },
                favorite: variant.FAVORITE,
                executeOnSelection: variant.EXECUTE_ON_SELECTION,
                contexts: {},
                selector: {
                    persistencyKey: variant.PERSISTENCY_KEY
                },
                standardVariant: variant.STANDARD_VARIANT,
                variantId: variant.FILE_NAME,
                creation: variant.CREATION
            };

            compVariants.push(compVariantItem);
        }

        return compVariants;
    }

    async #getChanges() {
        let allChanges = await this.#getChangesFromDB(),
            changes = allChanges.map((variant) => {
                let changeContent = {
                    changeType: variant.CHANGE_TYPE,
                    reference: variant.PROJECT_ID,
                    namespace: `apps/${variant.PROJECT_ID}/changes/`,
                    creation: variant.CREATION,
                    projectId: variant.PROJECT_ID,
                    support: {
                        user: variant.USER_NAME,
                        sapui5Version: variant.SAPUI5_VERSION
                    },
                    originalLanguage: variant.ORIGINAL_LANGUAGE,
                    layer: variant.LAYER,
                    fileType: variant.FILE_TYPE,
                    fileName: variant.FILE_NAME,
                    texts: {},
                    selector: {
                        persistencyKey: variant.PERSISTENCY_KEY
                    },
                    dependentSelector: {}
                };

                switch (variant.CHANGE_TYPE) {
                    case "defaultVariant":
                        changeContent.support.generator = variant.GENERATOR;
                        changeContent.content = {
                            defaultVariantName: variant.DEFAULT_VARIANT_NAME
                        };
                        break;
                    case "updateVariant":
                        changeContent.content = {
                            executeOnSelection: variant.EXECUTE_ON_SELECTION
                        };
                        changeContent.selector.variantId = variant.VARIANT_ID;

                        if (variant.VARIANT_ID !== "*standard*") {
                            changeContent.content.favorite = variant.FAVORITE;
                        }
                        break;
                }

                return changeContent;
            });

        return changes;
    }

    async #getChangesFromDB() {
        let changesStatement =
            `
                SELECT * FROM "COMPONENT_VARIANTS"
                WHERE PROJECT_ID = '${this.#projectId}' AND
                      USER_NAME = '${this.#username}'   AND
                      LAYER = '${this.#layer}'          AND
                      CHANGE_TYPE IN ('defaultVariant','updateVariant')
            `;

        return HanaClient.statementExecPromisified(changesStatement);
    }

    async #getCompVariantsFromDB() {
        let dbStatement =
            `
                SELECT * FROM COMPONENT_VARIANTS
                WHERE PROJECT_ID = '${this.#projectId}' AND
                      LAYER      = '${this.#layer}'     AND
                      CHANGE_TYPE NOT IN ('defaultVariant','updateVariant')
            `;

        if (this.#layer === "USER") {
            dbStatement = dbStatement + " AND USER_NAME = '" + this.#username + "'";
        }

        return HanaClient.statementExecPromisified(dbStatement);
    }

    async #getContent(variant) {
        let content = {};

        switch (variant.CHANGE_TYPE) {
            case "table":
                let smartTable = new SmartTable(variant, this.#username);
                content = await smartTable.getContent();
                break;
            case "filterBar":
                let smartFilterbar = new SmartFilterbar(variant, this.#username);
                content = await smartFilterbar.getContent();
                break;
        }

        return content;
    }

    async createPersonalizationData(personalizationData) {
        let componentVariant = await this.#createComponentVariant(personalizationData);
        return componentVariant;
    }

    async #createComponentVariant(variant) {
        let compInsertStatement = await this.#generateCompInsertStatement(variant);
        await HanaClient.statementExecPromisified(compInsertStatement.statement, compInsertStatement.params);

        switch (variant.changeType) {
            case "table":
                let smartTable = new SmartTable(variant, this.#username);
                await smartTable.createTableVariant(variant);
                break;
            case "filterBar":
                let smartFilterbar = new SmartFilterbar(variant, this.#username);
                await smartFilterbar.createFilterbarVariant(variant);
                break;
        }

        return variant;
    }

    async #generateCompInsertStatement(variant) {
        let utcTimeStamp = await HanaClient.statementExecPromisified(`SELECT CURRENT_UTCTIMESTAMP FROM DUMMY`),
            currentTimeStamp = utcTimeStamp[0]["CURRENT_UTCTIMESTAMP"],
            changeTypeFields = this.#getChangeTypeSpecificFields(variant);

        let variantInsertParams = [
            variant.projectId,
            variant.fileName,
            variant.support.user || this.#username,
            variant.selector.persistencyKey,
            variant.support?.generator,
            variant.originalLanguage,
            variant.layer,
            variant.fileType,
            changeTypeFields.variantName,
            changeTypeFields.variantType,
            changeTypeFields.favorite,
            changeTypeFields.executeOnSelection,
            changeTypeFields.standardVariant,
            variant.changeType,
            variant.support.sapui5Version,
            currentTimeStamp,
            changeTypeFields.defaultVariantName,
            changeTypeFields.packageName,
            changeTypeFields.variantId
        ];

        let variantInsertStatement = CommonMethods.generateInsertStatement("COMPONENT_VARIANTS");

        variant.creation = currentTimeStamp;
        variant.support.user = variant.support.user || this.#username;
        return {
            statement: variantInsertStatement,
            params: variantInsertParams
        };
    }

    #getChangeTypeSpecificFields(variant) {
        let fields = {
            variantName: null,
            variantType: null,
            favorite: false,
            executeOnSelection: false,
            standardVariant: false,
            defaultVariantName: null,
            packageName: null,
            variantId: null
        };

        switch (variant.changeType) {
            case "defaultVariant":
                fields.defaultVariantName = variant.content.defaultVariantName;
                break;
            case "updateVariant":
                fields.favorite = variant.content.favorite || false;
                fields.executeOnSelection = variant.content.executeOnSelection || false;
                fields.packageName = variant.packageName;
                fields.variantId = variant.selector.variantId;
                break;
            default:
                fields.variantName = variant.texts.variantName.value;
                fields.variantType = variant.texts.variantName.type;
                fields.favorite = variant.favorite;
                fields.executeOnSelection = variant.executeOnSelection;
                fields.standardVariant = variant.standardVariant;
                break;
        }

        return fields;
    }

    async updatePersonalizationData(personalizationData) {
        let componentVariant = await this.#updateComponentVariant(personalizationData);
        return componentVariant;
    }

    async #updateComponentVariant(variant) {
        let variantResponse = variant;

        switch (variant.changeType) {
            case "table":
                let smartTable = new SmartTable(variant, this.#username);
                await this.#deleteComponentVariant(variant);
                await smartTable.deleteTableVariant("UPDATE");
                variantResponse = await this.#createComponentVariant(variant);
                break;
            case "filterBar":
                let smartFilterbar = new SmartFilterbar(variant, this.#username);
                await this.#deleteComponentVariant(variant);
                await smartFilterbar.deleteFilterbarVariant("UPDATE");
                variantResponse = await this.#createComponentVariant(variant);
                break;
            case "defaultVariant":
                await this.#updateDefaultVariant(variant);
                break;
        }

        return variantResponse;
    }

    async #deleteComponentVariant(variant) {
        let deleteVariantStatement = CommonMethods.generateDeleteStatement("COMPONENT_VARIANTS", this.#projectId, variant.fileName,
            variant.selector.persistencyKey, this.#username, "UPDATE", this.#layer);

        await HanaClient.statementExecPromisified(deleteVariantStatement);
    }

    async #updateDefaultVariant(variant) {
        let updateDefaultVariantStatement =
            `
				UPDATE "COMPONENT_VARIANTS"
				SET DEFAULT_VARIANT_NAME = '${variant.content.defaultVariantName}'
				WHERE PROJECT_ID = '${this.#projectId}'                      AND
					  FILE_NAME = '${variant.fileName}'                      AND
					  USER_NAME = '${this.#username}'                        AND
					  PERSISTENCY_KEY = '${variant.selector.persistencyKey}' AND
					  CHANGE_TYPE = 'defaultVariant'
			`;

        await HanaClient.statementExecPromisified(updateDefaultVariantStatement);
    }

    async deletePersonalizationData(fileName) {
        let deleteVariantStatement = CommonMethods.generateDeleteStatement("COMPONENT_VARIANTS", this.#projectId, fileName,
            "UNKNOWN", this.#username, "DELETE", this.#layer),
            variant = {
                PROJECT_ID: this.#projectId,
                FILE_NAME: fileName,
                PERSISTENCY_KEY: "UNKNOWN",
                LAYER: this.#layer
            },
            smartTable = new SmartTable(variant, this.#username),
            smartFilterbar = new SmartFilterbar(variant, this.#username);

        await HanaClient.statementExecPromisified(deleteVariantStatement);
        await smartTable.deleteTableVariant("DELETE");
        await smartFilterbar.deleteFilterbarVariant("DELETE");
    }

    async getKeyUserComponentVariants() {
        return this.#getComponentVariants();
    }

    async getKeyUserChanges() {
        return this.#getChanges();
    }
}

module.exports = PersonalizationAPI;