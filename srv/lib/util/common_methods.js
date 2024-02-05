const tableColumns = require("../resources/table_columns.json");

class CommonMethods {
    static generateSelectStatement(tableName, projectId, fileName, persistencyKey, username, layer) {
        let selectStatement =
            `
                SELECT * FROM "${tableName}"
                WHERE PROJECT_ID      = '${projectId}' AND
                      FILE_NAME       = '${fileName}'  AND
                      PERSISTENCY_KEY = '${persistencyKey}'
            `;

        if (layer === "USER") {
            selectStatement = selectStatement + " AND USER_NAME = '" + username + "'";
        }

        return selectStatement;
    }

    static generateInsertStatement(tableName) {
        let columns = tableColumns[tableName],
            questionMarks = this.getQuestionMarks(tableColumns[tableName].length);

        let insertStatement =
            `
                INSERT INTO "${tableName}" 
                (
                    ${columns}
                ) 
                VALUES 
                (
                    ${questionMarks}
                )
            `;

        return insertStatement;
    }

    static getQuestionMarks(count) {
        let index = 0,
            questionMarks = [];

        while (index < count) {
            questionMarks.push("?");
            index++;
        }

        return questionMarks.join();
    }

    static generateDeleteStatement(tableName, projectId, fileName, persistencyKey, username, operation, layer) {
        let deleteStatement =
            `
				DELETE FROM "${tableName}"
					WHERE	PROJECT_ID = '${projectId}' AND
							FILE_NAME = '${fileName}'
			`;

        if (operation === "UPDATE") {
            deleteStatement = deleteStatement + " AND PERSISTENCY_KEY = '" + persistencyKey + "'";
        }
        
        if (layer !== "PUBLIC") {
            deleteStatement = deleteStatement + " AND USER_NAME = '" + username + "'";
        }

        return deleteStatement;
    }
}

module.exports = CommonMethods;