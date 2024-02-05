const DatabasePromisifier = require(global.appRoot + "/lib/util/db_promisifier");

class HanaClient {
    static async statementExecPromisified(sqlStatement, queryParameters) {
        let queryParams = queryParameters || [],
            hdbClient = await DatabasePromisifier.createConnection(),
            connection = new DatabasePromisifier(hdbClient),
            statement = await connection.preparePromisified(sqlStatement),
            results = await connection.statementExecPromisified(statement, queryParams);

        hdbClient.close(); // hdbClient connection must be closed if created from DatabaseClass, not required if created from request.db

        if (typeof results === "number") { // return the row count in case of insert / update / delete 
            return results;
        } else {
            return results.slice();
        }
    }
}

module.exports = HanaClient;