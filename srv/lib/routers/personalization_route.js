const express = require("express"),
    router = express.Router(),
    PersonalizationAPI = require(global.appRoot + "/lib/util/personalization_api"),
    KeyUser = require(global.appRoot + "/lib/util/keyuser");

router.head("/personalization/v1/actions/getcsrftoken", (req, res, next) => {
    res.set("X-CSRF-Token", "4ba7ac47ac735bd5-wwQTNsqYV2tTktOM3NHEp9b4N5M");
    res.status(200).end();
});

router.get("/personalization/v1/data/:projectId", async (req, res, next) => {
    let personalization = new PersonalizationAPI(req.params.projectId, req.authInfo.getLogonName(), "USER"),
        personalizationData = await personalization.getPersonalizationData();

    res.json(personalizationData);
});

router.put("/personalization/v1/changes/:fileName", async (req, res, next) => {
    let personalization = new PersonalizationAPI(req.body.projectId, req.authInfo.getLogonName(), "USER"),
        personalizationData = await personalization.updatePersonalizationData(req.body);

    res.json(personalizationData);
});

router.post("/personalization/v1/changes/", async (req, res, next) => {
    let personalization = new PersonalizationAPI(req.body.projectId, req.authInfo.getLogonName(), "USER"),
        personalizationData = await personalization.createPersonalizationData(req.body[0]);

    res.json(personalizationData);
});

router.delete("/personalization/v1/changes/:fileName", async (req, res, next) => {
    let personalization = new PersonalizationAPI(req.query.namespace.split("/")[1], req.authInfo.getLogonName(), "USER");
    await personalization.deletePersonalizationData(req.params.fileName);
    res.sendStatus(204);
});

router.get("/keyuser/v2/settings", async (req, res, next) => {
    let keyuser = new KeyUser("UNKNOWN", req.authInfo.getLogonName(), "PUBLIC"),
        keyuserSettings = keyuser.getSettings(req);

    res.json(keyuserSettings);
});

router.get("/keyuser/v2/data/:projectId", async (req, res, next) => {
    let keyuser = new KeyUser(req.params.projectId, req.authInfo.getLogonName(), "PUBLIC"),
        keyuserData = await keyuser.getKeyUserData();

    res.json(keyuserData);
});

router.put("/keyuser/v2/changes/:fileName", async (req, res, next) => {
    let keyuser = new KeyUser(req.body.projectId, req.authInfo.getLogonName(), "PUBLIC"),
        keyuserData = await keyuser.updateKeyUserData(req.body);

    res.json(keyuserData);
});

router.post("/keyuser/v2/changes/", async (req, res, next) => {
    let keyuser = new KeyUser(req.body.projectId, req.authInfo.getLogonName(), "PUBLIC"),
        keyuserData = await keyuser.createKeyUserData(req.body[0]);

    res.json(keyuserData);
});

router.delete("/keyuser/v2/changes/:fileName", async (req, res, next) => {
    let keyuser = new KeyUser(req.query.namespace.split("/")[1], req.authInfo.getLogonName(), "PUBLIC");
    await keyuser.deleteKeyUserData(req.params.fileName);
    res.sendStatus(204);
});

module.exports = router;