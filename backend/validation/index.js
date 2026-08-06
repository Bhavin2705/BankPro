// Validation module index - aggregates all validation rules and constants
const common = require('./validation/common');
const user = require('./validation/user');
const transaction = require('./validation/transaction');
const bill = require('./validation/bill');
const constants = require('./validation/constants');

module.exports = {
    ...common,
    ...user,
    ...transaction,
    ...bill,
    ...constants
};