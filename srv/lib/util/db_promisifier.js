const hdbext = require("@sap/hdbext");
const xsenv = require("@sap/xsenv");
const util = require("util");

class DatabasePromisifier {
    static createConnection() {
        return new Promise((resolve, reject) => {
            let options = xsenv.getServices({
                hana: {
                    plan: "hdi-shared"
                }
            });

            options.hana.pooling = true;
            hdbext.createConnection(options.hana, (error, client) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(client);
                }
            });
        });
    }

    constructor(client) {
        this.client = client;
        this.util = util;
        this.client.promisePrepare = this.util.promisify(this.client.prepare);
    }

    preparePromisified(query) {
        return this.client.promisePrepare(query);
    }

    statementExecPromisified(statement, parameters) {
        statement.promiseExec = this.util.promisify(statement.exec);
        return statement.promiseExec(parameters);
    }

    loadProcedurePromisified(hdbextension, schema, procedure) {
        hdbextension.promiseLoadProcedure = this.util.promisify(hdbextension.loadProcedure);
        return hdbextension.promiseLoadProcedure(this.client, schema, procedure);
    }

    callProcedurePromisified(storedProc, inputParams) {
        return new Promise((resolve, reject) => {
            storedProc(inputParams, (error, outputScalar, ...results) => {
                if (error) {
                    reject(error);
                } else {
                    if (results.length < 2) {
                        resolve({
                            outputScalar: outputScalar,
                            results: results[0]
                        });
                    } else {
                        let output = {};
                        output.outputScalar = outputScalar;
                        for (let i = 0; i < results.length; i++) {
                            output[`results${i}`] = results[i];
                        }
                        resolve(output);
                    }
                }
            });
        });
    }
}

module.exports = DatabasePromisifier;