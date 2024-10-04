 const ComparisonOperators = Object.freeze({
    EQUALS: "equals",
    NOT_EQUALS: "notEquals",
    CONTAINS: "contains",
    LESS_THAN: "lt",
    LESS_THAN_OR_EQUAL_TO: "lte",
    GREATER_THAN: "gt",
    GREATER_THAN_OR_EQUAL_TO: "gte",
    DATE_IS: "dateIs",
    DATE_IS_NOT: "dateIsNot",
    DATE_BEFORE: "dateBefore",
    DATE_AFTER: "dateAfter",
  });
  
   const applyFilter = (filterMatchMode, fieldValue, filterValue) => {
    if (!filterMatchMode || filterValue === null || filterValue === undefined) return true; // No filter applied
    switch (filterMatchMode) {
      case ComparisonOperators.EQUALS:
        return fieldValue === filterValue;
      case ComparisonOperators.NOT_EQUALS:
        return fieldValue !== filterValue;
      case ComparisonOperators.CONTAINS:
        return fieldValue.toLowerCase().includes(filterValue.toLowerCase());
      case ComparisonOperators.LESS_THAN:
        return fieldValue < filterValue;
      case ComparisonOperators.LESS_THAN_OR_EQUAL_TO:
        return fieldValue <= filterValue;
      case ComparisonOperators.GREATER_THAN:
        return fieldValue > filterValue;
      case ComparisonOperators.GREATER_THAN_OR_EQUAL_TO:
        return fieldValue >= filterValue;
      case ComparisonOperators.DATE_IS:
        return new Date(fieldValue).toISOString().split("T")[0] === filterValue;
      case ComparisonOperators.DATE_IS_NOT:
        return new Date(fieldValue).toISOString().split("T")[0] !== filterValue;
      case ComparisonOperators.DATE_BEFORE:
        return new Date(fieldValue) < new Date(filterValue);
      case ComparisonOperators.DATE_AFTER:
        return new Date(fieldValue) > new Date(filterValue);
      default:
        return true;
    }
  };


  module.exports = { ComparisonOperators, applyFilter };
