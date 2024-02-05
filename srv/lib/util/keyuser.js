const HanaClient = require(global.appRoot + "/lib/util/hana_client"),
    xsenv = require("@sap/xsenv"),
    keyuserSettings = require(global.appRoot + "/lib/resources/keyuser_settings.json"),
    PersonalizationAPI = require(global.appRoot + "/lib/util/personalization_api");

class KeyUser extends PersonalizationAPI {
    #keyProjectId;
    #keyUsername;
    #keyLayer;

    constructor(projectId, username, layer) {
        super(projectId, username, layer); //Initialize super class
        this.#keyProjectId = projectId;
        this.#keyUsername = username;
        this.#keyLayer = layer;
    }

    getSettings(req) {
        let settings = {},
            xsuaaInstance = xsenv.getServices({
                uaa: {
                    tag: "xsuaa"
                }
            }).uaa;

        if (req.authInfo.checkScope(xsuaaInstance.xsappname + ".Admin")) {
            settings = keyuserSettings.Admin;
        } else if (req.authInfo.checkScope(xsuaaInstance.xsappname + ".PublicViewManager")) {
            settings = keyuserSettings.PublicViewManager;
        } else {
            settings = keyuserSettings.RegularUser;
        }

        settings.logonUser = this.#keyUsername;
        return settings;
    }

    async getKeyUserData() {
        let componentVariants = await super.getKeyUserComponentVariants(),
            changes = await super.getKeyUserChanges();

        return {
            contents: [
                {
                    appDescriptorChanges: [],
                    changes: [],
                    variantDependentControlChanges: [],
                    compVariants: [],
                    variantChanges: [],
                    variants: [],
                    variantManagementChanges: []
                },
                {
                    compVariants: componentVariants,
                    variants: [],
                    variantDependentControlChanges: [],
                    variantChanges: []
                }
            ]
        };
    }

    async createKeyUserData(keyuserData) {
        return super.createPersonalizationData(keyuserData);
    }

    async updateKeyUserData(keyuserData) {
        return super.updatePersonalizationData(keyuserData);
    }

    async deleteKeyUserData(fileName) {
        await super.deletePersonalizationData(fileName);
    }
};

module.exports = KeyUser;