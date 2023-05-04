/**
 * The default query used in the matchmaker bot to fetch the orders from subgraph
 */
exports.DefaultQuery = `{
    orders(
        where: {orderActive: true}
    ) {
        id
        handleIO 
        expression
        interpreter
        interpreterStore
        orderJSONString
        owner {
            id
        }
        validInputs(orderBy: index, orderDirection: asc) {
            index
            token {
                id
                decimals
                symbol
            }
            tokenVault {
                balance
            }
            vault {
                id
            }
        }
        validOutputs(orderBy: index, orderDirection: asc) {
            index
            token {
                id
                decimals
                symbol
            }
            tokenVault {
                balance
            }
            vault {
                id
            }
        }
    }
}`;